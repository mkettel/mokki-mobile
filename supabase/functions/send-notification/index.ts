import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Supabase client with service role
function createSupabaseClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

interface NotificationPayload {
  // Target a single user
  targetUserId?: string;
  // Or target all members of a house (excluding sender)
  houseId?: string;
  excludeUserId?: string;
  adminId?: string; // Alias for excludeUserId (backwards compat with admin ping)
  // Notification content
  title: string;
  body: string;
  // Optional data for deep linking
  deepLinkTab?: string;
  pingType?: string; // For admin ping backwards compatibility
  data?: Record<string, unknown>;
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();
    const payload: NotificationPayload = await req.json();
    const {
      targetUserId,
      houseId,
      excludeUserId,
      adminId, // backwards compat: used as excludeUserId if excludeUserId not provided
      title,
      body,
      deepLinkTab,
      pingType,
      data
    } = payload;

    // Support adminId as alias for excludeUserId (backwards compatibility)
    const userToExclude = excludeUserId || adminId;

    // Validate required fields
    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!targetUserId && !houseId) {
      return new Response(
        JSON.stringify({ error: "Must provide targetUserId or houseId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let userIds: string[] = [];

    // Case 1: Send to a single user
    if (targetUserId) {
      userIds = [targetUserId];
      console.log(`Sending notification to user ${targetUserId}`);
    }
    // Case 2: Send to all house members (optionally excluding someone)
    else if (houseId) {
      const query = supabase
        .from("house_members")
        .select("user_id")
        .eq("house_id", houseId)
        .eq("invite_status", "accepted");

      if (userToExclude) {
        query.neq("user_id", userToExclude);
      }

      const { data: members, error: membersError } = await query;

      if (membersError) {
        console.error("Error fetching house members:", membersError);
        throw membersError;
      }

      if (!members || members.length === 0) {
        console.log("No members found to notify");
        return new Response(
          JSON.stringify({
            success: true,
            message: "No members found to notify",
            notificationsSent: 0,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      userIds = members.map((m) => m.user_id);
      console.log(`Sending notification to ${userIds.length} house members`);
    }

    // Get push tokens for target users
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id, token")
      .in("user_id", userIds);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for target users");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No push tokens found",
          notificationsSent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build push messages
    const messages: ExpoPushMessage[] = tokens.map((tokenRecord) => ({
      to: tokenRecord.token,
      sound: "default",
      title,
      body,
      data: {
        ...data,
        deepLinkTab,
        houseId,
        ...(pingType && { type: pingType }), // backwards compat: admin ping uses pingType
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
    console.error("Error in send-notification:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
