import { supabase } from "@/lib/supabase/client";
import type {
  Database,
  Event,
  EventParticipant,
  Profile,
  EventWithParticipants,
} from "@/types/database";
import { sendEventNotification } from "./notifications";

// Extended type for events with details
export type EventWithDetails = Event & {
  profiles: Profile;
  event_participants: (EventParticipant & {
    profiles: Profile;
  })[];
};

/**
 * Get all events for a house with creator and participants
 */
export async function getHouseEvents(houseId: string): Promise<{
  events: EventWithDetails[];
  error: Error | null;
}> {
  try {
    const { data: events, error } = await supabase
      .from("events")
      .select(`
        *,
        profiles (*),
        event_participants (
          *,
          profiles (*)
        )
      `)
      .eq("house_id", houseId)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true, nullsFirst: false });

    if (error) {
      return { events: [], error };
    }

    return {
      events: (events || []) as EventWithDetails[],
      error: null,
    };
  } catch (error) {
    console.error("Error fetching house events:", error);
    return { events: [], error: error as Error };
  }
}

/**
 * Get a single event by ID
 */
export async function getEvent(eventId: string): Promise<{
  event: EventWithDetails | null;
  error: Error | null;
}> {
  try {
    const { data: event, error } = await supabase
      .from("events")
      .select(`
        *,
        profiles (*),
        event_participants (
          *,
          profiles (*)
        )
      `)
      .eq("id", eventId)
      .single();

    if (error) {
      return { event: null, error };
    }

    return { event: event as EventWithDetails, error: null };
  } catch (error) {
    console.error("Error fetching event:", error);
    return { event: null, error: error as Error };
  }
}

/**
 * Get upcoming events for a house
 */
export async function getUpcomingEvents(
  houseId: string,
  limit: number = 5
): Promise<{
  events: EventWithDetails[];
  error: Error | null;
}> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: events, error } = await supabase
      .from("events")
      .select(`
        *,
        profiles (*),
        event_participants (
          *,
          profiles (*)
        )
      `)
      .eq("house_id", houseId)
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) {
      return { events: [], error };
    }

    return { events: (events || []) as EventWithDetails[], error: null };
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    return { events: [], error: error as Error };
  }
}

/**
 * Create a new event
 */
export async function createEvent(
  houseId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    eventDate: string;
    eventTime?: string;
    endDate?: string;
    endTime?: string;
    links?: string[];
    participantIds?: string[];
  }
): Promise<{
  event: Event | null;
  error: Error | null;
}> {
  try {
    const {
      name,
      description,
      eventDate,
      eventTime,
      endDate,
      endTime,
      links,
      participantIds,
    } = data;

    // Create the event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        house_id: houseId,
        created_by: userId,
        name: name.trim(),
        description: description?.trim() || null,
        event_date: eventDate,
        event_time: eventTime || null,
        end_date: endDate || null,
        end_time: endTime || null,
        links: links && links.length > 0 ? links : null,
      })
      .select()
      .single();

    if (eventError || !event) {
      return { event: null, error: eventError };
    }

    // Add participants if provided
    if (participantIds && participantIds.length > 0) {
      const participantRows = participantIds.map((participantId) => ({
        event_id: event.id,
        user_id: participantId,
      }));

      const { error: participantError } = await supabase
        .from("event_participants")
        .insert(participantRows);

      if (participantError) {
        console.error("Error adding participants:", participantError);
        // Event was created, just log the participant error
      } else {
        // Send notifications to participants (excluding the creator)
        const recipientIds = participantIds.filter((id) => id !== userId);

        if (recipientIds.length > 0) {
          // Get creator profile for notification
          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", userId)
            .single();

          // Get house name for notification
          const { data: house } = await supabase
            .from("houses")
            .select("name")
            .eq("id", houseId)
            .single();

          if (creatorProfile && house) {
            // Send notifications asynchronously (don't await to not block UI)
            sendEventNotification({
              eventId: event.id,
              eventName: name.trim(),
              eventDate: eventDate,
              eventTime: eventTime || undefined,
              participantIds: recipientIds,
              creatorName:
                creatorProfile.display_name ||
                creatorProfile.email.split("@")[0],
              houseName: house.name,
            }).catch((err) => {
              console.error("Failed to send event notifications:", err);
            });
          }
        }
      }
    }

    return { event, error: null };
  } catch (error) {
    console.error("Error creating event:", error);
    return { event: null, error: error as Error };
  }
}

/**
 * Update an existing event
 */
export async function updateEvent(
  eventId: string,
  data: {
    name: string;
    description?: string;
    eventDate: string;
    eventTime?: string;
    endDate?: string;
    endTime?: string;
    links?: string[];
    participantIds?: string[];
  }
): Promise<{
  event: Event | null;
  error: Error | null;
}> {
  try {
    const {
      name,
      description,
      eventDate,
      eventTime,
      endDate,
      endTime,
      links,
      participantIds,
    } = data;

    // Update the event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        event_date: eventDate,
        event_time: eventTime || null,
        end_date: endDate || null,
        end_time: endTime || null,
        links: links && links.length > 0 ? links : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId)
      .select()
      .single();

    if (eventError || !event) {
      return { event: null, error: eventError };
    }

    // Update participants: delete all existing and re-add
    if (participantIds !== undefined) {
      // Delete existing participants
      await supabase
        .from("event_participants")
        .delete()
        .eq("event_id", eventId);

      // Add new participants if any
      if (participantIds.length > 0) {
        const participantRows = participantIds.map((participantId) => ({
          event_id: eventId,
          user_id: participantId,
        }));

        const { error: participantError } = await supabase
          .from("event_participants")
          .insert(participantRows);

        if (participantError) {
          console.error("Error updating participants:", participantError);
        }
      }
    }

    return { event, error: null };
  } catch (error) {
    console.error("Error updating event:", error);
    return { event: null, error: error as Error };
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Delete the event (participants cascade delete via FK)
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting event:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get house members for participant selection
 */
export async function getHouseMembersForEvents(houseId: string): Promise<{
  members: Profile[];
  error: Error | null;
}> {
  try {
    const { data: members, error } = await supabase
      .from("house_members")
      .select(`
        user_id,
        profiles (*)
      `)
      .eq("house_id", houseId)
      .eq("invite_status", "accepted");

    if (error) {
      return { members: [], error };
    }

    // Extract profiles from the nested structure
    const profiles = (members || [])
      .filter((m) => m.profiles !== null)
      .map((m) => m.profiles as Profile);

    return { members: profiles, error: null };
  } catch (error) {
    console.error("Error fetching house members:", error);
    return { members: [], error: error as Error };
  }
}
