import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import type { ExternalProvider, ServerProviders } from "./client";

/**
 * Google and Apple sign-in through their official SDKs. The ID token goes to the
 * FINZA API, which verifies it and issues normal sessions (no parallel auth).
 *
 * Google: native Credential Manager / GoogleSignIn via
 * @react-native-google-signin/google-signin (needs a development build, not Expo
 * Go). EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is the OAuth "Web" client whose ID is the
 * token audience the API accepts (FINZA_GOOGLE_CLIENT_IDS); iOS also needs
 * EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Android identifies the app by package name
 * and signing certificate SHA-1 registered in Google Cloud.
 *
 * Apple: expo-apple-authentication on iOS 13+ only. A random nonce is hashed for
 * Apple and the raw value goes to the API, which checks it.
 */

export type SocialAvailability = Record<ExternalProvider, boolean>;
export class SocialCancelled extends Error {}

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

type GoogleModule = typeof import("@react-native-google-signin/google-signin");
let googleModule: GoogleModule | null | undefined;
function google(): GoogleModule | null {
  if (googleModule !== undefined) return googleModule;
  try {
    // Lazy: the native module is absent in Expo Go and on web; requiring it there throws.
    googleModule = require("@react-native-google-signin/google-signin");
  } catch {
    googleModule = null;
  }
  return googleModule ?? null;
}

type AppleModule = typeof import("expo-apple-authentication");
function apple(): AppleModule | null {
  if (Platform.OS !== "ios") return null;
  try {
    return require("expo-apple-authentication");
  } catch {
    return null;
  }
}

export async function socialAvailability(
  server: ServerProviders | null,
): Promise<SocialAvailability> {
  const googleReady =
    Platform.OS !== "web" &&
    Boolean(googleWebClientId) &&
    (Platform.OS !== "ios" || Boolean(googleIosClientId)) &&
    google() !== null;
  const appleModule = apple();
  const appleReady = appleModule
    ? await appleModule.isAvailableAsync().catch(() => false)
    : false;
  return {
    google: Boolean(server?.google) && googleReady,
    apple: Boolean(server?.apple) && appleReady,
  };
}

export async function googleIdToken(): Promise<{ idToken: string }> {
  const sdk = google();
  if (!sdk)
    throw new Error("Google no está disponible en esta versión de la app.");
  const { GoogleSignin, isErrorWithCode, statusCodes } = sdk;
  GoogleSignin.configure({
    webClientId: googleWebClientId,
    iosClientId: googleIosClientId || undefined,
    scopes: ["email", "profile"],
  });
  try {
    if (Platform.OS === "android")
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    const result = await GoogleSignin.signIn();
    if (result.type !== "success") throw new SocialCancelled();
    const idToken = result.data.idToken;
    if (!idToken)
      throw new Error("Google no devolvió una identidad. Inténtalo de nuevo.");
    return { idToken };
  } catch (error) {
    if (error instanceof SocialCancelled) throw error;
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED)
        throw new SocialCancelled();
      if (error.code === statusCodes.IN_PROGRESS) throw new SocialCancelled();
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
        throw new Error(
          "Este teléfono no tiene Google Play Services disponibles.",
        );
    }
    throw new Error("No pudimos conectar con Google. Inténtalo de nuevo.");
  }
}

/** Ends the Google SDK session so the next sign-in can pick another account. */
export async function googleSignOut() {
  const sdk = google();
  if (!sdk || !googleWebClientId) return;
  await sdk.GoogleSignin.signOut().catch(() => {});
}

export async function appleIdToken(): Promise<{
  idToken: string;
  nonce: string;
}> {
  const sdk = apple();
  if (!sdk) throw new Error("Apple no está disponible en este dispositivo.");
  const nonce = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  const hashed = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
  );
  try {
    const credential = await sdk.signInAsync({
      requestedScopes: [
        sdk.AppleAuthenticationScope.FULL_NAME,
        sdk.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashed,
    });
    if (!credential.identityToken)
      throw new Error("Apple no devolvió una identidad. Inténtalo de nuevo.");
    return { idToken: credential.identityToken, nonce };
  } catch (error) {
    if ((error as { code?: string })?.code === "ERR_REQUEST_CANCELED")
      throw new SocialCancelled();
    if (error instanceof Error && error.message.startsWith("Apple no devolvió"))
      throw error;
    throw new Error("No pudimos conectar con Apple. Inténtalo de nuevo.");
  }
}
