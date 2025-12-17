import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Inline CORS headers to avoid import issues
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Inline Supabase client creation
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

interface SettlementNotificationPayload {
  recipientUserId: string;
  settlerName: string;
  houseName: string;
  settledAmount: number;
  settledCount: number;
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

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
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
            `Push failed for token ${messages[index].to}:`,
            item.message
          );
        }
      }
    );
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();

    const payload: SettlementNotificationPayload = await req.json();
    const { recipientUserId, settlerName, houseName, settledAmount, settledCount } =
      payload;

    if (!recipientUserId || !settlerName || !houseName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `Sending settlement notification to user ${recipientUserId} from ${settlerName}`
    );

    // Get push token for the recipient
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", recipientUserId);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for recipient");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No push tokens found for recipient",
          notificationsSent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Format the notification message
    const title = "Expenses Settled";
    const amountText = settledAmount > 0 ? ` (${formatCurrency(settledAmount)})` : "";
    const countText = settledCount > 1 ? `${settledCount} expenses` : "an expense";
    const body = `${settlerName} marked ${countText}${amountText} as settled in ${houseName}`;

    // Build push messages
    const messages: ExpoPushMessage[] = tokens.map((tokenRecord) => ({
      to: tokenRecord.token,
      sound: "default",
      title,
      body,
      data: {
        type: "expense_settled",
        settlerName,
        houseName,
        settledAmount,
        settledCount,
      },
      priority: "high",
    }));

    await sendExpoPushNotifications(messages);

    console.log(`Successfully sent ${messages.length} settlement notifications`);

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
    console.error("Error in send-settlement-notification:", error);

    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
