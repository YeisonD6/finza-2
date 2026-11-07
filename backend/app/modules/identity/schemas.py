from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, SecretStr, field_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr
    password: SecretStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()

    @field_validator("password", mode="before")
    @classmethod
    def password_length(cls, value):
        if not isinstance(value, str) or not 12 <= len(value) <= 128:
            raise ValueError("La contraseña debe tener entre 12 y 128 caracteres")
        return value


class AccountResponse(BaseModel):
    id: UUID
    email: str
    base_currency: str


class LoginRequest(RegisterRequest):
    @field_validator("password", mode="before")
    @classmethod
    def password_length(cls, value):
        if not isinstance(value, str) or not 1 <= len(value) <= 128:
            raise ValueError("Ingresa una contraseña válida")
        return value


class RefreshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    refresh_token: SecretStr

    @field_validator("refresh_token", mode="before")
    @classmethod
    def bounded_token(cls, value):
        if not isinstance(value, str) or not 20 <= len(value) <= 256:
            raise ValueError("Token inválido")
        return value


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int


def _new_password(value):
    if not isinstance(value, str) or not 12 <= len(value) <= 128:
        raise ValueError("La contraseña debe tener entre 12 y 128 caracteres")
    return value


class MeResponse(AccountResponse):
    has_password: bool
    providers: list[str]
    email_verified: bool


class ProvidersResponse(BaseModel):
    google: bool
    apple: bool
    password_reset: bool
    email_verification: bool


class ExternalSignInRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id_token: SecretStr
    nonce: str | None = None

    @field_validator("id_token", mode="before")
    @classmethod
    def bounded_token(cls, value):
        if not isinstance(value, str) or not 20 <= len(value) <= 8192:
            raise ValueError("Token inválido")
        return value

    @field_validator("nonce")
    @classmethod
    def bounded_nonce(cls, value):
        if value is not None and not 8 <= len(value) <= 256:
            raise ValueError("Token inválido")
        return value


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: SecretStr
    new_password: SecretStr

    @field_validator("token", mode="before")
    @classmethod
    def bounded_token(cls, value):
        if not isinstance(value, str) or not 20 <= len(value) <= 256:
            raise ValueError("El enlace no es válido o ya venció. Solicita uno nuevo.")
        return value

    @field_validator("new_password", mode="before")
    @classmethod
    def new_password_length(cls, value):
        return _new_password(value)


class VerifyEmailRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: SecretStr

    @field_validator("token", mode="before")
    @classmethod
    def bounded_token(cls, value):
        if not isinstance(value, str) or not 20 <= len(value) <= 256:
            raise ValueError("El enlace no es válido o ya venció. Pide uno nuevo desde FINZA.")
        return value


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: SecretStr | None = None
    new_password: SecretStr

    @field_validator("current_password", mode="before")
    @classmethod
    def bounded_current(cls, value):
        if value is not None and (not isinstance(value, str) or not 1 <= len(value) <= 128):
            raise ValueError("Ingresa una contraseña válida")
        return value

    @field_validator("new_password", mode="before")
    @classmethod
    def new_password_length(cls, value):
        return _new_password(value)
