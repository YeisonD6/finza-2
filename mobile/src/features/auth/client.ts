/** Tokens live here (memory) and in the injected secure vault, never in Redux actions. */
export type Profile = { id: string; email: string; base_currency: string };
export type TokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};
export type Vault = {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  remove(): Promise<void>;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export class AuthClient {
  private access: string | null = null;
  private refreshToken: string | null = null;
  private epoch = 0;
  private refreshing: { epoch: number; promise: Promise<void> } | null = null;
  private writes: Promise<void> = Promise.resolve();
  onChange: (profile: Profile | null, loading: boolean) => void = () => {};
  onReset: () => void = () => {};

  constructor(
    private url: string,
    private vault: Vault,
    private fetcher: typeof fetch = fetch,
  ) {}

  private store(task: () => Promise<void>): Promise<void> {
    const result = this.writes.then(task);
    this.writes = result.catch(() => {});
    return result;
  }

  private async raw(path: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await this.fetcher(this.url + path, {
        ...init,
        headers: { "Content-Type": "application/json", ...init.headers },
      });
    } catch {
      throw new ApiError(
        0,
        "No se pudo conectar. Revisa tu conexión e intenta de nuevo.",
      );
    }
  }

  private async checked<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        body.message ?? body.detail ?? "No se pudo completar la solicitud",
        body.field_errors,
      );
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  }

  private stale(epoch: number) {
    if (epoch !== this.epoch) throw new ApiError(401, "La sesión cambió.");
  }

  private async revoke(raw: string) {
    return this.checked(
      await this.raw("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: raw }),
      }),
    );
  }

  private async accept(pair: TokenPair, epoch: number) {
    try {
      this.stale(epoch);
      await this.store(async () => {
        this.stale(epoch);
        await this.vault.set(pair.refresh_token);
      });
      this.stale(epoch);
      this.access = pair.access_token;
      this.refreshToken = pair.refresh_token;
    } catch (error) {
      await this.revoke(pair.refresh_token).catch(() => {});
      throw error;
    }
  }

  async register(email: string, password: string) {
    return this.checked<Profile>(
      await this.raw("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    );
  }

  async login(email: string, password: string) {
    const clearing = this.clear();
    const epoch = this.epoch;
    await clearing;
    this.stale(epoch);
    const pair = await this.checked<TokenPair>(
      await this.raw("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    );
    await this.accept(pair, epoch);
    const profile = await this.request<Profile>("/api/v1/me");
    this.stale(epoch);
    this.onChange(profile, false);
    return profile;
  }

  async restore() {
    const epoch = this.epoch;
    this.onChange(null, true);
    try {
      await this.writes;
      const raw = await this.vault.get();
      this.stale(epoch);
      if (!raw) {
        this.onChange(null, false);
        return;
      }
      this.refreshToken = raw;
      await this.refresh();
      const profile = await this.request<Profile>("/api/v1/me");
      this.stale(epoch);
      this.onChange(profile, false);
    } catch (error) {
      if (epoch === this.epoch) this.onChange(null, false);
      if (error instanceof ApiError && error.status === 401) return;
      throw error;
    }
  }

  private refresh(): Promise<void> {
    const epoch = this.epoch;
    if (this.refreshing?.epoch === epoch) return this.refreshing.promise;
    const promise = (async () => {
      if (!this.refreshToken)
        throw new ApiError(401, "Inicia sesión para continuar.");
      const response = await this.raw("/api/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (response.ok) {
        await this.accept(await this.checked<TokenPair>(response), epoch);
        return;
      }
      this.stale(epoch);
      if (response.status === 401) {
        await this.clear();
        throw new ApiError(401, "Tu sesión expiró. Inicia sesión de nuevo.");
      }
      await this.checked(response);
    })().finally(() => {
      if (this.refreshing?.epoch === epoch) this.refreshing = null;
    });
    this.refreshing = { epoch, promise };
    return promise;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const epoch = this.epoch;
    const original = this.access;
    const send = () =>
      this.raw(path, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${this.access ?? ""}`,
        },
      });
    let response = await send();
    this.stale(epoch);
    if (response.status === 401) {
      if (original === this.access) await this.refresh();
      this.stale(epoch);
      response = await send();
      this.stale(epoch);
      if (response.status === 401) await this.clear();
    }
    const result = await this.checked<T>(response);
    this.stale(epoch);
    return result;
  }

  async clear() {
    this.epoch++;
    this.access = null;
    this.refreshToken = null;
    this.onReset();
    this.onChange(null, false);
    await this.store(() => this.vault.remove());
  }

  async logout() {
    const raw = this.refreshToken;
    // Revoke an in-flight rotated response too: accept() rejects stale epochs and revokes it.
    let storageError: unknown;
    try {
      await this.clear();
    } catch (error) {
      storageError = error;
    }
    let remoteError: unknown;
    try {
      if (raw) await this.revoke(raw);
    } catch (error) {
      remoteError = error;
    }
    if (storageError) throw storageError;
    if (remoteError) throw remoteError;
  }
}
