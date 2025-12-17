import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase/client";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationPermissionStatus = "granted" | "denied" | "undetermined";

/**
 * Check if push notifications are available on this device
 * Returns false on simulators/emulators
 */
export function canReceivePushNotifications(): boolean {
  return Device.isDevice;
}

/**
 * Get the current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === "granted") {
    return "granted";
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

/**
 * Get the Expo push token for this device
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!canReceivePushNotifications()) {
    console.log("Push notifications not available on simulator/emulator");
    return null;
  }

  try {
    // Get the project ID from app config
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.error("EAS project ID not found in app config");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
}

/**
 * Register the push token with Supabase
 */
export async function registerPushToken(
  userId: string
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Request permissions first
    const permissionStatus = await requestNotificationPermissions();

    if (permissionStatus !== "granted") {
      return {
        success: false,
        error: new Error("Notification permission not granted"),
      };
    }

    // Get the push token
    const token = await getExpoPushToken();

    if (!token) {
      return {
        success: false,
        error: new Error("Could not get push token"),
      };
    }

    // Get device ID for tracking (optional)
    const deviceId = Constants.deviceId;
    const platform = Platform.OS as "ios" | "android" | "web";

    // Log the token for testing
    console.log("Push token:", token);

    // Upsert the token to Supabase
    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token,
        platform,
        device_id: deviceId,
      },
      {
        onConflict: "user_id,token",
      }
    );

    if (error) {
      console.error("Error saving push token:", error);
      return { success: false, error };
    }

    console.log("Push token registered successfully");
    return { success: true };
  } catch (error) {
    console.error("Error registering push token:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Unregister the push token (e.g., on logout)
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    const token = await getExpoPushToken();

    if (token) {
      await supabase
        .from("push_tokens")
        .delete()
        .eq("user_id", userId)
        .eq("token", token);
    }
  } catch (error) {
    console.error("Error unregistering push token:", error);
  }
}

/**
 * Set up notification listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (
    response: Notifications.NotificationResponse
  ) => void
) {
  // Listener for when notification is received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification);
      onNotificationReceived?.(notification);
    }
  );

  // Listener for when user interacts with notification
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification response:", response);
      onNotificationResponse?.(response);
    });

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Get the last notification response (for deep linking from notification tap)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

/**
 * Set the badge count (iOS)
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
