import { supabase } from "@/lib/supabase/client";
import type {
  Profile,
  SessionRequest,
  SessionRequestStatus,
  SessionRequestWithProfiles,
  HouseMember,
} from "@/types/database";
import { DEFAULT_SESSION_BOOKING_CONFIG } from "@/constants/sessionBooking";

/**
 * Get all admins for a house (for booking selection)
 */
export async function getHouseAdmins(houseId: string): Promise<{
  admins: (HouseMember & { profiles: Profile })[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("house_members")
      .select(`
        *,
        profiles (*)
      `)
      .eq("house_id", houseId)
      .eq("role", "admin")
      .eq("invite_status", "accepted")
      .eq("is_archived", false);

    if (error) {
      return { admins: [], error };
    }

    // Filter out entries without profiles
    const admins = (data || []).filter(
      (member): member is HouseMember & { profiles: Profile } =>
        member.profiles !== null
    );

    return { admins, error: null };
  } catch (error) {
    console.error("Error fetching house admins:", error);
    return { admins: [], error: error as Error };
  }
}

/**
 * Create a new session request
 */
export async function createSessionRequest(params: {
  houseId: string;
  requesterId: string;
  adminId: string;
  requestedDate: string;
  requestedTime: string;
  durationMinutes?: number;
  message?: string;
}): Promise<{
  request: SessionRequest | null;
  error: Error | null;
}> {
  try {
    const {
      houseId,
      requesterId,
      adminId,
      requestedDate,
      requestedTime,
      durationMinutes = DEFAULT_SESSION_BOOKING_CONFIG.defaultDuration,
      message,
    } = params;

    const { data, error } = await supabase
      .from("session_requests")
      .insert({
        house_id: houseId,
        requester_id: requesterId,
        admin_id: adminId,
        requested_date: requestedDate,
        requested_time: requestedTime,
        duration_minutes: durationMinutes,
        message: message?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { request: null, error };
    }

    return { request: data as SessionRequest, error: null };
  } catch (error) {
    console.error("Error creating session request:", error);
    return { request: null, error: error as Error };
  }
}

/**
 * Get all session requests for a user (as requester)
 */
export async function getMySessionRequests(
  houseId: string,
  userId: string
): Promise<{
  requests: SessionRequestWithProfiles[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("session_requests")
      .select(`
        *,
        requester:profiles!session_requests_requester_id_fkey (*),
        admin:profiles!session_requests_admin_id_fkey (*)
      `)
      .eq("house_id", houseId)
      .eq("requester_id", userId)
      .order("requested_date", { ascending: true })
      .order("requested_time", { ascending: true });

    if (error) {
      return { requests: [], error };
    }

    return {
      requests: (data || []) as SessionRequestWithProfiles[],
      error: null,
    };
  } catch (error) {
    console.error("Error fetching my session requests:", error);
    return { requests: [], error: error as Error };
  }
}

/**
 * Get pending requests for an admin
 */
export async function getPendingRequestsForAdmin(
  houseId: string,
  adminId: string
): Promise<{
  requests: SessionRequestWithProfiles[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("session_requests")
      .select(`
        *,
        requester:profiles!session_requests_requester_id_fkey (*),
        admin:profiles!session_requests_admin_id_fkey (*)
      `)
      .eq("house_id", houseId)
      .eq("admin_id", adminId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      return { requests: [], error };
    }

    return {
      requests: (data || []) as SessionRequestWithProfiles[],
      error: null,
    };
  } catch (error) {
    console.error("Error fetching pending requests for admin:", error);
    return { requests: [], error: error as Error };
  }
}

/**
 * Respond to a session request (accept or decline)
 */
export async function respondToRequest(
  requestId: string,
  status: "accepted" | "declined"
): Promise<{
  request: SessionRequest | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("session_requests")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) {
      return { request: null, error };
    }

    return { request: data as SessionRequest, error: null };
  } catch (error) {
    console.error("Error responding to session request:", error);
    return { request: null, error: error as Error };
  }
}

/**
 * Get accepted sessions for a house on a specific date
 */
export async function getAcceptedSessions(
  houseId: string,
  date: string
): Promise<{
  sessions: SessionRequestWithProfiles[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("session_requests")
      .select(`
        *,
        requester:profiles!session_requests_requester_id_fkey (*),
        admin:profiles!session_requests_admin_id_fkey (*)
      `)
      .eq("house_id", houseId)
      .eq("requested_date", date)
      .eq("status", "accepted")
      .order("requested_time", { ascending: true });

    if (error) {
      return { sessions: [], error };
    }

    return {
      sessions: (data || []) as SessionRequestWithProfiles[],
      error: null,
    };
  } catch (error) {
    console.error("Error fetching accepted sessions:", error);
    return { sessions: [], error: error as Error };
  }
}

/**
 * Get all accepted sessions for a house within a date range
 */
export async function getAcceptedSessionsInRange(
  houseId: string,
  startDate: string,
  endDate: string
): Promise<{
  sessions: SessionRequestWithProfiles[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("session_requests")
      .select(`
        *,
        requester:profiles!session_requests_requester_id_fkey (*),
        admin:profiles!session_requests_admin_id_fkey (*)
      `)
      .eq("house_id", houseId)
      .eq("status", "accepted")
      .gte("requested_date", startDate)
      .lte("requested_date", endDate)
      .order("requested_date", { ascending: true })
      .order("requested_time", { ascending: true });

    if (error) {
      return { sessions: [], error };
    }

    return {
      sessions: (data || []) as SessionRequestWithProfiles[],
      error: null,
    };
  } catch (error) {
    console.error("Error fetching accepted sessions in range:", error);
    return { sessions: [], error: error as Error };
  }
}

/**
 * Cancel a pending session request (by the requester)
 */
export async function cancelRequest(requestId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("session_requests")
      .update({
        status: "cancelled" as SessionRequestStatus,
      })
      .eq("id", requestId)
      .eq("status", "pending"); // Can only cancel pending requests

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error cancelling session request:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get a single session request by ID
 */
export async function getSessionRequest(requestId: string): Promise<{
  request: SessionRequestWithProfiles | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("session_requests")
      .select(`
        *,
        requester:profiles!session_requests_requester_id_fkey (*),
        admin:profiles!session_requests_admin_id_fkey (*)
      `)
      .eq("id", requestId)
      .single();

    if (error) {
      return { request: null, error };
    }

    return {
      request: data as SessionRequestWithProfiles,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching session request:", error);
    return { request: null, error: error as Error };
  }
}

/**
 * Check if an admin has an existing accepted session at a specific date/time
 */
export async function checkAdminAvailability(
  adminId: string,
  date: string,
  time: string,
  houseId: string
): Promise<{
  isAvailable: boolean;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("session_requests")
      .select("id")
      .eq("house_id", houseId)
      .eq("admin_id", adminId)
      .eq("requested_date", date)
      .eq("requested_time", time)
      .eq("status", "accepted")
      .single();

    if (error && error.code === "PGRST116") {
      // No rows returned - admin is available
      return { isAvailable: true, error: null };
    }

    if (error) {
      return { isAvailable: false, error };
    }

    // If we got data, there's already an accepted session
    return { isAvailable: !data, error: null };
  } catch (error) {
    console.error("Error checking admin availability:", error);
    return { isAvailable: false, error: error as Error };
  }
}

/**
 * Get user's pending session requests within a date range (for tentative display on itinerary)
 */
export async function getMyPendingRequestsInRange(
  houseId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  requests: SessionRequestWithProfiles[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("session_requests")
      .select(`
        *,
        requester:profiles!session_requests_requester_id_fkey (*),
        admin:profiles!session_requests_admin_id_fkey (*)
      `)
      .eq("house_id", houseId)
      .eq("requester_id", userId)
      .eq("status", "pending")
      .gte("requested_date", startDate)
      .lte("requested_date", endDate)
      .order("requested_date", { ascending: true })
      .order("requested_time", { ascending: true });

    if (error) {
      return { requests: [], error };
    }

    return {
      requests: (data || []) as SessionRequestWithProfiles[],
      error: null,
    };
  } catch (error) {
    console.error("Error fetching my pending requests in range:", error);
    return { requests: [], error: error as Error };
  }
}

/**
 * Get count of pending requests for an admin (for badge display)
 */
export async function getPendingRequestCount(
  houseId: string,
  adminId: string
): Promise<{
  count: number;
  error: Error | null;
}> {
  try {
    const { count, error } = await supabase
      .from("session_requests")
      .select("*", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("admin_id", adminId)
      .eq("status", "pending");

    if (error) {
      return { count: 0, error };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    console.error("Error fetching pending request count:", error);
    return { count: 0, error: error as Error };
  }
}
