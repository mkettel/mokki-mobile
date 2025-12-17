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
    const { error } = await supabase.functions.invoke(
      "send-event-notification",
      {
        body: params,
      }
    );

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
