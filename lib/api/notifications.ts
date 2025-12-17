import { supabase } from "@/lib/supabase/client";

interface SendEventNotificationParams {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  participantIds: string[];
  creatorName: string;
  houseName: string;
}

/**
 * Send push notifications to event participants
 */
export async function sendEventNotification(
  params: SendEventNotificationParams
): Promise<{
  success: boolean;
  error?: Error;
}> {
  try {
    console.log("Sending event notification:", params);

    const { data, error } = await supabase.functions.invoke(
      "send-event-notification",
      {
        body: params,
      }
    );

    if (error) {
      console.error("Error invoking send-event-notification:", error);
      return { success: false, error };
    }

    console.log("Notification response:", data);
    return { success: true };
  } catch (error) {
    console.error("Error sending event notification:", error);
    return { success: false, error: error as Error };
  }
}
