import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useAuth } from "./auth";
import {
  registerPushToken,
  unregisterPushToken,
  setupNotificationListeners,
  getLastNotificationResponse,
  canReceivePushNotifications,
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  type NotificationPermissionStatus,
} from "@/lib/notifications";

type NotificationsContextType = {
  permissionStatus: NotificationPermissionStatus;
  isRegistered: boolean;
  requestPermissions: () => Promise<NotificationPermissionStatus>;
};

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>("undetermined");
  const [isRegistered, setIsRegistered] = useState(false);
  const notificationListenerCleanup = useRef<(() => void) | null>(null);

  // Handle notification tap - navigate to appropriate screen
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;

      // Navigate based on notification type
      if (data?.type === "event_participant_added" && data?.eventId) {
        // Navigate to calendar/events tab
        router.push("/(tabs)/calendar");
      }
      // Add more notification type handlers here as needed
    },
    [router]
  );

  // Register token when user logs in
  useEffect(() => {
    const initNotifications = async () => {
      if (!user || !canReceivePushNotifications()) {
        return;
      }

      // Check current permission status
      const status = await getNotificationPermissionStatus();
      setPermissionStatus(status);

      // Only register if we have permission
      if (status === "granted") {
        const result = await registerPushToken(user.id);
        setIsRegistered(result.success);
      }
    };

    initNotifications();
  }, [user]);

  // Set up notification listeners
  useEffect(() => {
    if (!canReceivePushNotifications()) {
      return;
    }

    // Set up listeners
    notificationListenerCleanup.current = setupNotificationListeners(
      undefined, // onNotificationReceived - handle in foreground if needed
      handleNotificationResponse
    );

    // Check if app was opened from a notification
    getLastNotificationResponse().then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    });

    return () => {
      notificationListenerCleanup.current?.();
    };
  }, [handleNotificationResponse]);

  // Handle logout - unregister token
  useEffect(() => {
    if (!user && isRegistered) {
      // User logged out
      setIsRegistered(false);
    }
  }, [user, isRegistered]);

  const requestPermissions =
    useCallback(async (): Promise<NotificationPermissionStatus> => {
      const status = await requestNotificationPermissions();
      setPermissionStatus(status);

      // If permission granted and user is logged in, register token
      if (status === "granted" && user) {
        const result = await registerPushToken(user.id);
        setIsRegistered(result.success);
      }

      return status;
    }, [user]);

  return (
    <NotificationsContext.Provider
      value={{
        permissionStatus,
        isRegistered,
        requestPermissions,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    );
  }
  return context;
}
