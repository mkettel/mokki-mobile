import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const BIOMETRIC_EMAIL_KEY = "biometric_email";
const BIOMETRIC_TOKEN_KEY = "biometric_refresh_token";

export type BiometricType = "fingerprint" | "facial" | "iris" | "none";

/**
 * Check if the device supports biometric authentication
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch {
    // Native module not available (e.g., in Expo Go)
    return false;
  }
}

/**
 * Get the type of biometric authentication available
 */
export async function getBiometricType(): Promise<BiometricType> {
  if (Platform.OS === "web") return "none";

  try {
    const types =
      await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (
      types.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      )
    ) {
      return "facial";
    }
    if (
      types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    ) {
      return "fingerprint";
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return "iris";
    }

    return "none";
  } catch {
    // Native module not available (e.g., in Expo Go)
    return "none";
  }
}

/**
 * Get a user-friendly name for the biometric type
 */
export function getBiometricName(type: BiometricType): string {
  switch (type) {
    case "facial":
      return Platform.OS === "ios" ? "Face ID" : "Face Recognition";
    case "fingerprint":
      return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
    case "iris":
      return "Iris Recognition";
    default:
      return "Biometric";
  }
}

/**
 * Prompt the user for biometric authentication
 */
export async function authenticateWithBiometric(
  promptMessage?: string
): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === "web") {
    return { success: false, error: "Biometrics not supported on web" };
  }

  try {
    const biometricType = await getBiometricType();
    const biometricName = getBiometricName(biometricType);

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || `Login with ${biometricName}`,
      cancelLabel: "Cancel",
      disableDeviceFallback: false, // Allow passcode fallback
      fallbackLabel: "Use Passcode",
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || "Authentication failed",
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || "Authentication error",
    };
  }
}

/**
 * Check if biometric login is enabled for this device
 */
export async function isBiometricLoginEnabled(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === "true";
  } catch {
    return false;
  }
}

/**
 * Enable biometric login by storing the refresh token securely
 */
export async function enableBiometricLogin(
  email: string,
  refreshToken: string
): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
    await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, refreshToken);
    return true;
  } catch (error) {
    console.error("Failed to enable biometric login:", error);
    return false;
  }
}

/**
 * Disable biometric login and clear stored credentials
 */
export async function disableBiometricLogin(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    return true;
  } catch (error) {
    console.error("Failed to disable biometric login:", error);
    return false;
  }
}

/**
 * Get the stored biometric credentials (email and refresh token)
 */
export async function getBiometricCredentials(): Promise<{
  email: string | null;
  refreshToken: string | null;
}> {
  if (Platform.OS === "web") {
    return { email: null, refreshToken: null };
  }

  try {
    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    const refreshToken = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
    return { email, refreshToken };
  } catch {
    return { email: null, refreshToken: null };
  }
}

/**
 * Update the stored refresh token (call after token refresh)
 */
export async function updateBiometricToken(
  refreshToken: string
): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const enabled = await isBiometricLoginEnabled();
    if (!enabled) return false;

    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, refreshToken);
    return true;
  } catch (error) {
    console.error("Failed to update biometric token:", error);
    return false;
  }
}
