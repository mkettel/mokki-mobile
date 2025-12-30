import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

/**
 * Open Signup Window
 *
 * This function should be called by a cron job that runs frequently (e.g., every minute)
 * to check for scheduled windows that need to be opened.
 *
 * When a window opens:
 * 1. Update the window status to 'open'
 * 2. Send push notifications to all house members
 */

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

function formatWeekendDate(startDate: string, endDate: string): string {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const startFormatted = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const endFormatted = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${startFormatted} - ${endFormatted}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    const now = new Date().toISOString();

    console.log("Checking for signup windows to open...");

    // Find all scheduled windows that should be opened
    const { data: windowsToOpen, error: windowsError } = await supabase
      .from("signup_windows")
      .select(
        `
        id,
        house_id,
        target_weekend_start,
        target_weekend_end,
        opens_at,
        houses!inner (
          id,
          name
        )
      `
      )
      .eq("status", "scheduled")
      .lte("opens_at", now);

    if (windowsError) {
      console.error("Error fetching windows:", windowsError);
      throw windowsError;
    }

    if (!windowsToOpen || windowsToOpen.length === 0) {
      console.log("No windows to open at this time");
      return new Response(
        JSON.stringify({ success: true, message: "No windows to open", windowsOpened: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${windowsToOpen.length} windows to open`);

    let windowsOpened = 0;
    let notificationsSent = 0;
    const errors: string[] = [];

    for (const window of windowsToOpen) {
      const house = window.houses as { id: string; name: string };

      console.log(`Opening window ${window.id} for house ${house.name}`);

      // Update window status to open
      const { error: updateError } = await supabase
        .from("signup_windows")
        .update({ status: "open" })
        .eq("id", window.id);

      if (updateError) {
        console.error(`Error opening window ${window.id}:`, updateError);
        errors.push(`Window ${window.id}: ${updateError.message}`);
        continue;
      }

      windowsOpened++;

      // Get all members of the house
      const { data: members, error: membersError } = await supabase
        .from("house_members")
        .select("user_id")
        .eq("house_id", house.id);

      if (membersError) {
        console.error(`Error fetching members for house ${house.id}:`, membersError);
        errors.push(`Members for ${house.name}: ${membersError.message}`);
        continue;
      }

      if (!members || members.length === 0) {
        console.log(`No members found for house ${house.name}`);
        continue;
      }

      const userIds = members.map((m) => m.user_id);

      // Get push tokens for all members
      const { data: tokens, error: tokensError } = await supabase
        .from("push_tokens")
        .select("user_id, token")
        .in("user_id", userIds);

      if (tokensError) {
        console.error(`Error fetching tokens for house ${house.id}:`, tokensError);
        errors.push(`Tokens for ${house.name}: ${tokensError.message}`);
        continue;
      }

      if (!tokens || tokens.length === 0) {
        console.log(`No push tokens found for house ${house.name}`);
        continue;
      }

      // Format notification
      const weekendStr = formatWeekendDate(
        window.target_weekend_start,
        window.target_weekend_end
      );

      const title = "Bed Sign-Up Open!";
      const body = `Sign-up for beds (${weekendStr} weekend) is now open at ${house.name}. Claim your spot!`;

      // Build push messages
      const messages: ExpoPushMessage[] = tokens.map((tokenRecord) => ({
        to: tokenRecord.token,
        sound: "default",
        title,
        body,
        data: {
          type: "bed_signup_open",
          windowId: window.id,
          houseId: house.id,
          houseName: house.name,
          weekendStart: window.target_weekend_start,
          weekendEnd: window.target_weekend_end,
        },
        priority: "high",
      }));

      // Send notifications
      try {
        await sendExpoPushNotifications(messages);
        notificationsSent += messages.length;
        console.log(`Sent ${messages.length} notifications for house ${house.name}`);
      } catch (pushError) {
        console.error(`Error sending notifications for house ${house.name}:`, pushError);
        errors.push(`Notifications for ${house.name}: ${pushError.message}`);
      }
    }

    const response = {
      success: errors.length === 0,
      windowsOpened,
      notificationsSent,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Window opening complete:", response);

    return new Response(JSON.stringify(response), {
      status: errors.length > 0 ? 207 : 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in open-signup-window:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
