import { supabase } from "@/lib/supabase/client";
import type { AdminPingType } from "@/constants/adminPingTemplates";

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

interface SendSettlementNotificationParams {
  recipientUserId: string;
  settlerName: string;
  houseName: string;
  settledAmount: number;
  settledCount: number;
}

interface SendHouseChatNotificationParams {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  hasAttachments: boolean;
  houseId: string;
  houseName: string;
}

interface SendDMNotificationParams {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  hasAttachments: boolean;
  conversationId: string;
  recipientId: string;
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

/**
 * Send push notification when expenses are settled
 */
export async function sendSettlementNotification(
  params: SendSettlementNotificationParams
): Promise<{
  success: boolean;
  error?: Error;
}> {
  try {
    const { error } = await supabase.functions.invoke(
      "send-settlement-notification",
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
 * Send push notification for a house chat message
 */
export async function sendHouseChatNotification(
  params: SendHouseChatNotificationParams
): Promise<{
  success: boolean;
  error?: Error;
}> {
  try {
    const { error } = await supabase.functions.invoke(
      "send-chat-notification",
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
 * Send push notification for a direct message
 */
export async function sendDMNotification(
  params: SendDMNotificationParams
): Promise<{
  success: boolean;
  error?: Error;
}> {
  try {
    const { error } = await supabase.functions.invoke(
      "send-chat-notification",
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

interface SendSessionRequestNotificationParams {
  houseId: string;
  adminId: string;
  requesterName: string;
  requestedDate: string;
  requestedTime: string;
  houseName: string;
}

interface SendSessionResponseNotificationParams {
  requesterId: string;
  adminName: string;
  status: "accepted" | "declined";
  requestedDate: string;
  requestedTime: string;
  houseName: string;
}

interface SendAdminPingParams {
  houseId: string;
  adminId: string;
  pingType: AdminPingType;
  title: string;
  body: string;
  deepLinkTab: string;
}

/**
 * Send admin ping notification to all house members
 */
export async function sendAdminPingNotification(
  params: SendAdminPingParams
): Promise<{
  success: boolean;
  notificationsSent?: number;
  error?: Error;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("send-notification", {
      body: params,
    });

    if (error) {
      return { success: false, error };
    }

    return {
      success: true,
      notificationsSent: data?.notificationsSent,
    };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Send notification to admin when a member requests a session
 */
export async function sendSessionRequestNotification(
  params: SendSessionRequestNotificationParams
): Promise<{
  success: boolean;
  error?: Error;
}> {
  try {
    const { error } = await supabase.functions.invoke("send-notification", {
      body: {
        houseId: params.houseId,
        targetUserId: params.adminId,
        title: `Session Request - ${params.houseName}`,
        body: `${params.requesterName} requested a session on ${params.requestedDate} at ${params.requestedTime}`,
        deepLinkTab: "itinerary",
      },
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Send notification to requester when admin responds to session request
 */
export async function sendSessionResponseNotification(
  params: SendSessionResponseNotificationParams
): Promise<{
  success: boolean;
  error?: Error;
}> {
  try {
    const statusText = params.status === "accepted" ? "accepted" : "declined";
    const { error } = await supabase.functions.invoke("send-notification", {
      body: {
        targetUserId: params.requesterId,
        title: `Session ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} - ${params.houseName}`,
        body:
          params.status === "accepted"
            ? `${params.adminName} accepted your session for ${params.requestedDate} at ${params.requestedTime}`
            : `${params.adminName} declined your session request for ${params.requestedDate}`,
        deepLinkTab: "itinerary",
      },
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
