import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

interface EventNotificationPayload {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  participantIds: string[];
  creatorName: string;
  houseName: string;
}

interface ExpoPushMessage {
  to: string;
  sound: "default" | null;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: "default" | "normal" | "high";
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
      result.data.forEach((item: { status: string; message?: string }, index: number) => {
        if (item.status === "error") {
          console.error(
            `Push failed for token ${batch[index].to}:`,
            item.message
          );
        }
      });
    }
  }
}

function formatEventDate(dateStr: string, timeStr?: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };

  let formatted = date.toLocaleDateString("en-US", options);

  if (timeStr) {
    // Parse time string (HH:MM format)
    const [hours, minutes] = timeStr.split(":").map(Number);
    const timeDate = new Date();
    timeDate.setHours(hours, minutes);
    const timeFormatted = timeDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    formatted += ` at ${timeFormatted}`;
  }

  return formatted;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();

    const payload: EventNotificationPayload = await req.json();
    const {
      eventId,
      eventName,
      eventDate,
      eventTime,
      participantIds,
      creatorName,
      houseName,
    } = payload;

    // Validate required fields
    if (!eventId || !eventName || !eventDate || !participantIds?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `Sending notifications for event ${eventId} to ${participantIds.length} participants`
    );

    // Get push tokens for all participants
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id, token")
      .in("user_id", participantIds);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for participants");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No push tokens found for participants",
          notificationsSent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format the notification message
    const formattedDate = formatEventDate(eventDate, eventTime);
    const title = `New event: ${eventName}`;
    const body = `${creatorName} added you to "${eventName}" on ${formattedDate} in ${houseName}`;

    // Build push messages
    const messages: ExpoPushMessage[] = tokens.map((tokenRecord) => ({
      to: tokenRecord.token,
      sound: "default",
      title,
      body,
      data: {
        type: "event_participant_added",
        eventId,
        eventName,
        eventDate,
      },
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
    console.error("Error in send-event-notification:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
