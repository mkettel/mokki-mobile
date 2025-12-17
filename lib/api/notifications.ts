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

interface SendExpenseNotificationParams {
  expenseId: string;
  expenseTitle: string;
  totalAmount: number;
  splits: { userId: string; amount: number }[];
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

/**
 * Send push notifications to expense split recipients
 */
export async function sendExpenseNotification(
  params: SendExpenseNotificationParams
): Promise<{
  success: boolean;
  error?: Error;
}> {
  try {
    const { error } = await supabase.functions.invoke(
      "send-expense-notification",
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
