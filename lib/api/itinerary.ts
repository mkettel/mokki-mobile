import { supabase } from "@/lib/supabase/client";
import type {
  ItineraryEvent,
  ItineraryEventSignup,
  ItineraryEventWithDetails,
  ItineraryEventCategory,
  ItineraryLink,
  ItineraryChecklistItem,
  Profile,
} from "@/types/database";

/**
 * Get all itinerary events for a house with creator and signups
 */
export async function getHouseItinerary(houseId: string): Promise<{
  events: ItineraryEventWithDetails[];
  error: Error | null;
}> {
  try {
    const { data: events, error } = await supabase
      .from("itinerary_events")
      .select(`
        *,
        profiles (*),
        itinerary_event_signups (
          *,
          profiles (*)
        )
      `)
      .eq("house_id", houseId)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false });

    if (error) {
      return { events: [], error };
    }

    return {
      events: (events || []) as ItineraryEventWithDetails[],
      error: null,
    };
  } catch (error) {
    console.error("Error fetching house itinerary:", error);
    return { events: [], error: error as Error };
  }
}

/**
 * Get itinerary events for a specific date
 */
export async function getItineraryForDate(
  houseId: string,
  date: string
): Promise<{
  events: ItineraryEventWithDetails[];
  error: Error | null;
}> {
  try {
    const { data: events, error } = await supabase
      .from("itinerary_events")
      .select(`
        *,
        profiles (*),
        itinerary_event_signups (
          *,
          profiles (*)
        )
      `)
      .eq("house_id", houseId)
      .eq("event_date", date)
      .order("start_time", { ascending: true, nullsFirst: false });

    if (error) {
      return { events: [], error };
    }

    return {
      events: (events || []) as ItineraryEventWithDetails[],
      error: null,
    };
  } catch (error) {
    console.error("Error fetching itinerary for date:", error);
    return { events: [], error: error as Error };
  }
}

/**
 * Get a single itinerary event by ID
 */
export async function getItineraryEvent(eventId: string): Promise<{
  event: ItineraryEventWithDetails | null;
  error: Error | null;
}> {
  try {
    const { data: event, error } = await supabase
      .from("itinerary_events")
      .select(`
        *,
        profiles (*),
        itinerary_event_signups (
          *,
          profiles (*)
        )
      `)
      .eq("id", eventId)
      .single();

    if (error) {
      return { event: null, error };
    }

    return { event: event as ItineraryEventWithDetails, error: null };
  } catch (error) {
    console.error("Error fetching itinerary event:", error);
    return { event: null, error: error as Error };
  }
}

/**
 * Create a new itinerary event
 */
export async function createItineraryEvent(
  houseId: string,
  userId: string,
  data: {
    title: string;
    description?: string;
    eventDate: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    category?: ItineraryEventCategory;
    isOptional?: boolean;
    capacity?: number;
    links?: ItineraryLink[];
    checklist?: ItineraryChecklistItem[];
  }
): Promise<{
  event: ItineraryEvent | null;
  error: Error | null;
}> {
  try {
    const {
      title,
      description,
      eventDate,
      startTime,
      endTime,
      location,
      category,
      isOptional = false,
      capacity,
      links = [],
      checklist = [],
    } = data;

    const { data: event, error } = await supabase
      .from("itinerary_events")
      .insert({
        house_id: houseId,
        created_by: userId,
        title: title.trim(),
        description: description?.trim() || null,
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        location: location?.trim() || null,
        category: category || null,
        is_optional: isOptional,
        capacity: capacity || null,
        links,
        checklist,
      })
      .select()
      .single();

    if (error) {
      return { event: null, error };
    }

    return { event, error: null };
  } catch (error) {
    console.error("Error creating itinerary event:", error);
    return { event: null, error: error as Error };
  }
}

/**
 * Update an existing itinerary event
 */
export async function updateItineraryEvent(
  eventId: string,
  data: {
    title?: string;
    description?: string | null;
    eventDate?: string;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    category?: ItineraryEventCategory | null;
    isOptional?: boolean;
    capacity?: number | null;
    links?: ItineraryLink[];
    checklist?: ItineraryChecklistItem[];
  }
): Promise<{
  event: ItineraryEvent | null;
  error: Error | null;
}> {
  try {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.eventDate !== undefined) updateData.event_date = data.eventDate;
    if (data.startTime !== undefined) updateData.start_time = data.startTime;
    if (data.endTime !== undefined) updateData.end_time = data.endTime;
    if (data.location !== undefined) updateData.location = data.location?.trim() || null;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.isOptional !== undefined) updateData.is_optional = data.isOptional;
    if (data.capacity !== undefined) updateData.capacity = data.capacity;
    if (data.links !== undefined) updateData.links = data.links;
    if (data.checklist !== undefined) updateData.checklist = data.checklist;

    const { data: event, error } = await supabase
      .from("itinerary_events")
      .update(updateData)
      .eq("id", eventId)
      .select()
      .single();

    if (error) {
      return { event: null, error };
    }

    return { event, error: null };
  } catch (error) {
    console.error("Error updating itinerary event:", error);
    return { event: null, error: error as Error };
  }
}

/**
 * Delete an itinerary event
 */
export async function deleteItineraryEvent(eventId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("itinerary_events")
      .delete()
      .eq("id", eventId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting itinerary event:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Sign up for an itinerary event
 */
export async function signUpForEvent(
  eventId: string,
  userId: string
): Promise<{
  signup: ItineraryEventSignup | null;
  error: Error | null;
}> {
  try {
    // Check if already signed up
    const { data: existing } = await supabase
      .from("itinerary_event_signups")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      return { signup: null, error: new Error("Already signed up for this event") };
    }

    // Check capacity if set
    const { data: event } = await supabase
      .from("itinerary_events")
      .select("capacity")
      .eq("id", eventId)
      .single();

    if (event?.capacity) {
      const { count } = await supabase
        .from("itinerary_event_signups")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);

      if (count !== null && count >= event.capacity) {
        return { signup: null, error: new Error("Event is at capacity") };
      }
    }

    const { data: signup, error } = await supabase
      .from("itinerary_event_signups")
      .insert({
        event_id: eventId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      return { signup: null, error };
    }

    return { signup, error: null };
  } catch (error) {
    console.error("Error signing up for event:", error);
    return { signup: null, error: error as Error };
  }
}

/**
 * Withdraw from an itinerary event
 */
export async function withdrawFromEvent(
  eventId: string,
  userId: string
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("itinerary_event_signups")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error withdrawing from event:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get all signups for an event
 */
export async function getEventSignups(eventId: string): Promise<{
  signups: (ItineraryEventSignup & { profiles: Profile })[];
  error: Error | null;
}> {
  try {
    const { data: signups, error } = await supabase
      .from("itinerary_event_signups")
      .select(`
        *,
        profiles (*)
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      return { signups: [], error };
    }

    return {
      signups: (signups || []) as (ItineraryEventSignup & { profiles: Profile })[],
      error: null,
    };
  } catch (error) {
    console.error("Error fetching event signups:", error);
    return { signups: [], error: error as Error };
  }
}

/**
 * Check if a user is signed up for an event
 */
export async function isUserSignedUp(
  eventId: string,
  userId: string
): Promise<{
  isSignedUp: boolean;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("itinerary_event_signups")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      return { isSignedUp: false, error };
    }

    return { isSignedUp: !!data, error: null };
  } catch (error) {
    console.error("Error checking signup status:", error);
    return { isSignedUp: false, error: error as Error };
  }
}
