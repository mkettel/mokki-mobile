import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

/**
 * Schedule Weekly Windows
 *
 * This function should be called by a cron job (e.g., every Sunday at midnight)
 * to create signup windows for the weekend AFTER next.
 *
 * The window will open at a random time on Monday or Tuesday.
 */

function getRandomOpenTime(mondayDate: Date): Date {
  // Random day: Monday (0) or Tuesday (1)
  const randomDay = Math.random() < 0.5 ? 0 : 1;

  // Random hour between 8 AM and 8 PM (12 hour window)
  const randomHour = 8 + Math.floor(Math.random() * 12);

  // Random minute (0-59)
  const randomMinute = Math.floor(Math.random() * 60);

  const openTime = new Date(mondayDate);
  openTime.setDate(openTime.getDate() + randomDay);
  openTime.setHours(randomHour, randomMinute, 0, 0);

  return openTime;
}

function getNextWeekendDates(): { friday: Date; sunday: Date; monday: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate days until next Friday (for the weekend AFTER next)
  // We want the Friday that is 8-14 days away
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0) daysUntilFriday = 7; // If today is Friday, get next Friday
  daysUntilFriday += 7; // Add a week to get the weekend AFTER next

  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);

  // Monday of the current week (when signup opens)
  const monday = new Date(now);
  const daysUntilMonday = (1 - dayOfWeek + 7) % 7;
  if (daysUntilMonday === 0 && dayOfWeek !== 1) {
    monday.setDate(now.getDate() + 7);
  } else {
    monday.setDate(now.getDate() + daysUntilMonday);
  }
  monday.setHours(0, 0, 0, 0);

  return { friday, sunday, monday };
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();

    console.log("Starting weekly signup window scheduling...");

    // Get all houses with bed signup enabled
    const { data: houses, error: housesError } = await supabase
      .from("houses")
      .select("id, name, settings");

    if (housesError) {
      console.error("Error fetching houses:", housesError);
      throw housesError;
    }

    if (!houses || houses.length === 0) {
      console.log("No houses found");
      return new Response(
        JSON.stringify({ success: true, message: "No houses found", windowsCreated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to houses with bed signup enabled
    const enabledHouses = houses.filter((house) => {
      const settings = house.settings as { bedSignupEnabled?: boolean } | null;
      return settings?.bedSignupEnabled === true;
    });

    if (enabledHouses.length === 0) {
      console.log("No houses have bed signup enabled");
      return new Response(
        JSON.stringify({ success: true, message: "No houses have bed signup enabled", windowsCreated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${enabledHouses.length} houses with bed signup enabled`);

    const { friday, sunday, monday } = getNextWeekendDates();
    const targetWeekendStart = formatDate(friday);
    const targetWeekendEnd = formatDate(sunday);

    console.log(`Creating windows for weekend: ${targetWeekendStart} to ${targetWeekendEnd}`);

    let windowsCreated = 0;
    const errors: string[] = [];

    for (const house of enabledHouses) {
      // Check if a window already exists for this weekend
      const { data: existingWindow } = await supabase
        .from("signup_windows")
        .select("id")
        .eq("house_id", house.id)
        .eq("target_weekend_start", targetWeekendStart)
        .single();

      if (existingWindow) {
        console.log(`Window already exists for house ${house.name} (${house.id})`);
        continue;
      }

      // Check if the house has any beds configured
      const { count: bedCount } = await supabase
        .from("beds")
        .select("*", { count: "exact", head: true })
        .eq("house_id", house.id);

      if (!bedCount || bedCount === 0) {
        console.log(`House ${house.name} has no beds configured, skipping`);
        continue;
      }

      // Generate random open time
      const opensAt = getRandomOpenTime(monday);

      // Create the signup window
      const { error: insertError } = await supabase
        .from("signup_windows")
        .insert({
          house_id: house.id,
          target_weekend_start: targetWeekendStart,
          target_weekend_end: targetWeekendEnd,
          opens_at: opensAt.toISOString(),
          status: "scheduled",
        });

      if (insertError) {
        console.error(`Error creating window for house ${house.id}:`, insertError);
        errors.push(`${house.name}: ${insertError.message}`);
      } else {
        console.log(`Created window for house ${house.name}, opens at ${opensAt.toISOString()}`);
        windowsCreated++;
      }
    }

    const response = {
      success: errors.length === 0,
      windowsCreated,
      targetWeekend: { start: targetWeekendStart, end: targetWeekendEnd },
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Scheduling complete:", response);

    return new Response(JSON.stringify(response), {
      status: errors.length > 0 ? 207 : 200, // 207 Multi-Status for partial success
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in schedule-weekly-windows:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
