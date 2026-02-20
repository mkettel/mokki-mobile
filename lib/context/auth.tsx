import { deleteAccount as deleteAccountApi } from "@/lib/api/profile";
import {
  authenticateWithBiometric,
  disableBiometricLogin,
  enableBiometricLogin,
  getBiometricCredentials,
  getBiometricName,
  getBiometricType,
  isBiometricLoginEnabled,
  isBiometricSupported,
  updateBiometricToken,
  type BiometricType,
} from "@/lib/biometric";
import { supabase } from "@/lib/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  // Biometric auth
  biometricType: BiometricType;
  biometricName: string;
  biometricSupported: boolean;
  biometricEnabled: boolean;
  signInWithBiometric: () => Promise<{ error: Error | null }>;
  enableBiometric: () => Promise<{ error: Error | null }>;
  disableBiometric: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricType, setBiometricType] = useState<BiometricType>("none");
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const biometricName = getBiometricName(biometricType);

  // Initialize biometric state
  useEffect(() => {
    const initBiometric = async () => {
      const supported = await isBiometricSupported();
      setBiometricSupported(supported);

      if (supported) {
        const type = await getBiometricType();
        setBiometricType(type);

        const enabled = await isBiometricLoginEnabled();
        setBiometricEnabled(enabled);
      }
    };

    initBiometric();
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Update stored refresh token if biometric is enabled
      if (session?.refresh_token) {
        await updateBiometricToken(session.refresh_token);
      }

      // Re-check biometric enabled state on sign in (in case it was enabled before logout)
      if (event === "SIGNED_IN") {
        const enabled = await isBiometricLoginEnabled();
        setBiometricEnabled(enabled);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If biometric was enabled and user logged in successfully,
    // update the stored token so biometric login works again
    if (!error && data.session?.refresh_token) {
      const wasEnabled = await isBiometricLoginEnabled();
      if (wasEnabled) {
        await enableBiometricLogin(email, data.session.refresh_token);
      }
    }

    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const deleteAccount = async (): Promise<{ error: Error | null }> => {
    try {
      const { success, error } = await deleteAccountApi();
      if (!success || error) {
        return { error: error || new Error("Failed to delete account") };
      }

      // Clear biometric data
      await disableBiometricLogin();
      setBiometricEnabled(false);

      // Sign out locally
      await supabase.auth.signOut();

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "mokki://auth/callback",
    });
    return { error: error as Error | null };
  };

  // Sign in using biometric authentication
  const signInWithBiometric = async (): Promise<{ error: Error | null }> => {
    try {
      // First, authenticate with biometrics
      const authResult = await authenticateWithBiometric();
      if (!authResult.success) {
        return { error: new Error(authResult.error || "Authentication failed") };
      }

      // Get stored credentials
      const { refreshToken } = await getBiometricCredentials();
      if (!refreshToken) {
        // Clear biometric state if no token found
        await disableBiometricLogin();
        setBiometricEnabled(false);
        return { error: new Error("No saved credentials. Please sign in with your password.") };
      }

      // Use refresh token to get new session
      const { error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        // Token might be expired, clear biometric login
        await disableBiometricLogin();
        setBiometricEnabled(false);
        return { error: new Error("Session expired. Please sign in with your password.") };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Enable biometric login for current user
  const enableBiometric = async (): Promise<{ error: Error | null }> => {
    if (!session?.refresh_token || !user?.email) {
      return { error: new Error("No active session") };
    }

    const success = await enableBiometricLogin(user.email, session.refresh_token);
    if (success) {
      setBiometricEnabled(true);
      return { error: null };
    }

    return { error: new Error("Failed to enable biometric login") };
  };

  // Disable biometric login
  const disableBiometric = async () => {
    await disableBiometricLogin();
    setBiometricEnabled(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        deleteAccount,
        resetPassword,
        biometricType,
        biometricName,
        biometricSupported,
        biometricEnabled,
        signInWithBiometric,
        enableBiometric,
        disableBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
