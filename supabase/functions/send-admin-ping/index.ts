import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Inline CORS headers (from _shared/cors.ts)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Inline Supabase client (from _shared/supabase.ts)
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

interface AdminPingPayload {
  houseId: string;
  adminId: string;
  title: string;
  body: string;
  pingType: string;
  deepLinkTab: string;
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();

    const payload: AdminPingPayload = await req.json();
    const { houseId, adminId, title, body, pingType, deepLinkTab } = payload;

    // Validate required fields
    if (!houseId || !adminId || !title || !body || !pingType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `Admin ping from ${adminId} to house ${houseId}: ${pingType}`
    );

    // Verify sender is admin of the house
    const { data: membership, error: membershipError } = await supabase
      .from("house_members")
      .select("role")
      .eq("house_id", houseId)
      .eq("user_id", adminId)
      .single();

    if (membershipError || !membership) {
      console.error("Error fetching membership:", membershipError);
      return new Response(
        JSON.stringify({ error: "User is not a member of this house" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (membership.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can send notifications" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get all house members (excluding the admin who sent the ping)
    const { data: members, error: membersError } = await supabase
      .from("house_members")
      .select("user_id")
      .eq("house_id", houseId)
      .neq("user_id", adminId);

    if (membersError) {
      console.error("Error fetching house members:", membersError);
      throw membersError;
    }

    if (!members || members.length === 0) {
      console.log("No other members in the house to notify");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No other members in the house to notify",
          notificationsSent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const memberIds = members.map((m) => m.user_id);

    // Get push tokens for all members
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("user_id, token")
      .in("user_id", memberIds);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for house members");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No push tokens found for house members",
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
        type: pingType,
        deepLinkTab,
        houseId,
      },
      priority: "high",
    }));

    // Send notifications
    await sendExpoPushNotifications(messages);

    console.log(`Successfully sent ${messages.length} admin ping notifications`);

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
    console.error("Error in send-admin-ping:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
