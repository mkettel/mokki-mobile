import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

interface ChatNotificationPayload {
  messageId: string;
  senderId: string;
  senderName: string;
  content: string;
  hasAttachments: boolean;
  // For house chat
  houseId?: string;
  houseName?: string;
  // For DM
  conversationId?: string;
  recipientId?: string;
}

interface ExpoPushMessage {
  to: string;
  sound: "default" | null;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: "default" | "normal" | "high";
  badge?: number;
}

async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<void> {
  if (messages.length === 0) return;

  // Expo push API accepts batches of up to 100 messages
  const batchSize = 100;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Expo push error:", errorText);
      throw new Error(`Failed to send push notifications: ${errorText}`);
    }

    const result = await response.json();
    console.log("Expo push result:", JSON.stringify(result));

    // Log any individual failures
    if (result.data) {
      result.data.forEach(
        (item: { status: string; message?: string }, index: number) => {
          if (item.status === "error") {
            console.error(
              `Push failed for token ${batch[index].to}:`,
              item.message
            );
          }
        }
      );
    }
  }
}

function truncateMessage(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength - 3) + "...";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();

    const payload: ChatNotificationPayload = await req.json();
    const {
      messageId,
      senderId,
      senderName,
      content,
      hasAttachments,
      houseId,
      houseName,
      conversationId,
      recipientId,
    } = payload;

    // Validate required fields
    if (!messageId || !senderId || !senderName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Must be either house chat or DM
    if (!houseId && !conversationId) {
      return new Response(
        JSON.stringify({ error: "Must provide houseId or conversationId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let recipientIds: string[] = [];
    let notificationType: string;
    let title: string;
    let navigationData: Record<string, unknown>;

    if (houseId) {
      // House chat - get all house members except sender
      const { data: members, error: membersError } = await supabase
        .from("house_members")
        .select("user_id")
        .eq("house_id", houseId)
        .neq("user_id", senderId);

      if (membersError) {
        console.error("Error fetching house members:", membersError);
        throw membersError;
      }

      recipientIds = members?.map((m) => m.user_id) || [];
      notificationType = "house_chat_message";
      title = houseName ? `${houseName}` : "House Chat";
      navigationData = {
        type: notificationType,
        houseId,
        messageId,
      };
    } else {
      // DM - send to the specific recipient
      if (!recipientId) {
        return new Response(
          JSON.stringify({ error: "recipientId required for DM" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      recipientIds = [recipientId];
      notificationType = "dm_message";
      title = senderName;
      navigationData = {
        type: notificationType,
        conversationId,
        messageId,
      };
    }

    if (recipientIds.length === 0) {
      console.log("No recipients to notify");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No recipients to notify",
          notificationsSent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `Sending ${notificationType} notifications to ${recipientIds.length} recipients`
    );

    // Get push tokens for all recipients
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id, token")
      .in("user_id", recipientIds);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for recipients");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No push tokens found for recipients",
          notificationsSent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format the notification body
    let body: string;
    if (hasAttachments && !content) {
      body = houseId
        ? `${senderName} sent a photo`
        : "Sent a photo";
    } else if (hasAttachments && content) {
      body = houseId
        ? `${senderName}: ${truncateMessage(content)}`
        : truncateMessage(content);
    } else {
      body = houseId
        ? `${senderName}: ${truncateMessage(content)}`
        : truncateMessage(content);
    }

    // Build push messages
    const messages: ExpoPushMessage[] = tokens.map((tokenRecord) => ({
      to: tokenRecord.token,
      sound: "default",
      title,
      body,
      data: navigationData,
      priority: "high",
    }));

    // Send notifications
    await sendExpoPushNotifications(messages);

    console.log(`Successfully sent ${messages.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: messages.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-chat-notification:", error);

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
