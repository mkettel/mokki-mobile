import { supabase } from "@/lib/supabase/client";
import type {
  Profile,
  Room,
  Bed,
  SignupWindow,
  BedSignup,
  RoomWithBeds,
  BedSignupWithProfile,
  SignupWindowWithClaims,
  BedSignupHistoryEntry,
} from "@/types/database";

// ============================================
// Types for this module
// ============================================

// Claim can be from current window or from an ongoing stay
export type BedClaimInfo = BedSignupWithProfile & {
  claimType: "window" | "ongoing_stay"; // 'window' = claimed in this window, 'ongoing_stay' = from overlapping stay
};

export type BedWithClaimStatus = Bed & {
  room: Room;
  claims: BedClaimInfo[]; // Multiple people can share a bed
};

export type RoomWithBedsAndClaims = Room & {
  beds: BedWithClaimStatus[];
};

export type SignupWindowWithRoomsAndClaims = SignupWindow & {
  rooms: RoomWithBedsAndClaims[];
  totalBeds: number;
  claimedBeds: number;
};

// ============================================
// Get Active Signup Window
// ============================================

/**
 * Get the currently active/open signup window for a house
 * Returns null if no window is currently open
 */
export async function getActiveSignupWindow(houseId: string): Promise<{
  window: SignupWindowWithRoomsAndClaims | null;
  error: Error | null;
}> {
  try {
    // Get the open window for this house
    const { data: window, error: windowError } = await supabase
      .from("signup_windows")
      .select("*")
      .eq("house_id", houseId)
      .eq("status", "open")
      .order("target_weekend_start", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (windowError) {
      return { window: null, error: windowError };
    }

    if (!window) {
      return { window: null, error: null };
    }

    // Get rooms and beds with claims for this window
    const roomsWithClaims = await getRoomsWithClaimsForWindow(
      houseId,
      window.id,
      window.target_weekend_start,
      window.target_weekend_end
    );

    if (roomsWithClaims.error) {
      return { window: null, error: roomsWithClaims.error };
    }

    const totalBeds = roomsWithClaims.rooms.reduce((sum, room) => sum + room.beds.length, 0);
    const claimedBeds = roomsWithClaims.rooms.reduce(
      (sum, room) => sum + room.beds.filter(bed => bed.claims.length > 0).length,
      0
    );

    return {
      window: {
        ...window,
        rooms: roomsWithClaims.rooms,
        totalBeds,
        claimedBeds,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching active signup window:", error);
    return { window: null, error: error as Error };
  }
}

/**
 * Get the next scheduled signup window (for display when none is open)
 */
export async function getNextScheduledWindow(houseId: string): Promise<{
  window: SignupWindow | null;
  error: Error | null;
}> {
  try {
    const { data: window, error } = await supabase
      .from("signup_windows")
      .select("*")
      .eq("house_id", houseId)
      .eq("status", "scheduled")
      .order("opens_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { window: null, error };
    }

    return { window, error: null };
  } catch (error) {
    console.error("Error fetching next scheduled window:", error);
    return { window: null, error: error as Error };
  }
}

// ============================================
// Get Rooms and Beds
// ============================================

/**
 * Get all rooms and beds for a house (without claim status)
 */
export async function getRoomsAndBeds(houseId: string): Promise<{
  rooms: RoomWithBeds[];
  error: Error | null;
}> {
  try {
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select(`
        *,
        beds (*)
      `)
      .eq("house_id", houseId)
      .order("display_order", { ascending: true });

    if (roomsError) {
      return { rooms: [], error: roomsError };
    }

    // Sort beds within each room
    const sortedRooms = (rooms || []).map(room => ({
      ...room,
      beds: (room.beds || []).sort((a: Bed, b: Bed) => a.display_order - b.display_order),
    }));

    return { rooms: sortedRooms, error: null };
  } catch (error) {
    console.error("Error fetching rooms and beds:", error);
    return { rooms: [], error: error as Error };
  }
}

/**
 * Get rooms with beds and their claim status for a specific window
 * Includes both claims from the current window AND ongoing stays that overlap
 */
async function getRoomsWithClaimsForWindow(
  houseId: string,
  windowId: string,
  targetWeekendStart: string,
  targetWeekendEnd: string
): Promise<{
  rooms: RoomWithBedsAndClaims[];
  error: Error | null;
}> {
  try {
    // Get rooms and beds
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select(`
        *,
        beds (*)
      `)
      .eq("house_id", houseId)
      .order("display_order", { ascending: true });

    if (roomsError) {
      return { rooms: [], error: roomsError };
    }

    // Get claims for this specific window
    const { data: windowClaims, error: claimsError } = await supabase
      .from("bed_signups")
      .select(`
        *,
        profiles (*)
      `)
      .eq("signup_window_id", windowId);

    if (claimsError) {
      return { rooms: [], error: claimsError };
    }

    // Get ongoing stays that overlap with target weekend and have bed claims
    // These are stays where someone claimed a bed in a PREVIOUS window but their stay extends into this weekend
    // Use explicit relationship hint since stays and bed_signups have two FK relationships
    const { data: ongoingStays, error: staysError } = await supabase
      .from("stays")
      .select(`
        id,
        user_id,
        check_in,
        check_out,
        bed_signup_id,
        profiles (*),
        bed_signups!stays_bed_signup_id_fkey (
          id,
          bed_id,
          signup_window_id
        )
      `)
      .eq("house_id", houseId)
      .not("bed_signup_id", "is", null)
      .lte("check_in", targetWeekendEnd)
      .gte("check_out", targetWeekendStart);

    if (staysError) {
      return { rooms: [], error: staysError };
    }

    // Create a map of bed_id -> array of claims
    const claimsMap = new Map<string, BedClaimInfo[]>();

    // Add claims from current window
    for (const claim of windowClaims || []) {
      const existing = claimsMap.get(claim.bed_id) || [];
      existing.push({
        ...claim,
        profiles: claim.profiles as Profile,
        claimType: "window",
      });
      claimsMap.set(claim.bed_id, existing);
    }

    // Add claims from ongoing stays (but not if they're already in this window's claims)
    for (const stay of ongoingStays || []) {
      const bedSignup = stay.bed_signups as any;
      if (!bedSignup) continue;

      // Skip if this bed signup is already for the current window (already added above)
      if (bedSignup.signup_window_id === windowId) continue;

      const bedId = bedSignup.bed_id;
      const existing = claimsMap.get(bedId) || [];

      // Check if this user is already in the claims for this bed (avoid duplicates)
      const alreadyListed = existing.some(c => c.user_id === stay.user_id);
      if (alreadyListed) continue;

      existing.push({
        id: bedSignup.id,
        signup_window_id: bedSignup.signup_window_id,
        bed_id: bedId,
        user_id: stay.user_id,
        stay_id: stay.id,
        claimed_at: stay.check_in,
        created_at: stay.check_in,
        profiles: stay.profiles as Profile,
        claimType: "ongoing_stay",
      });
      claimsMap.set(bedId, existing);
    }

    // Transform rooms with claim status
    const roomsWithClaims: RoomWithBedsAndClaims[] = (rooms || []).map(room => ({
      ...room,
      beds: (room.beds || [])
        .sort((a: Bed, b: Bed) => a.display_order - b.display_order)
        .map((bed: Bed) => ({
          ...bed,
          room: {
            id: room.id,
            house_id: room.house_id,
            name: room.name,
            room_type: room.room_type,
            display_order: room.display_order,
            created_at: room.created_at,
            updated_at: room.updated_at,
          },
          claims: claimsMap.get(bed.id) || [],
        })),
    }));

    return { rooms: roomsWithClaims, error: null };
  } catch (error) {
    console.error("Error fetching rooms with claims:", error);
    return { rooms: [], error: error as Error };
  }
}

// ============================================
// Claim and Release Beds
// ============================================

/**
 * Claim a bed for a signup window
 */
export async function claimBed(
  windowId: string,
  bedId: string,
  userId: string,
  stayId?: string
): Promise<{
  signup: BedSignup | null;
  error: Error | null;
}> {
  try {
    // Verify window is open
    const { data: window, error: windowError } = await supabase
      .from("signup_windows")
      .select("status")
      .eq("id", windowId)
      .single();

    if (windowError) {
      return { signup: null, error: windowError };
    }

    if (window.status !== "open") {
      return { signup: null, error: new Error("Sign-up window is not open") };
    }

    // Check if user already has a claim for this window (one bed per user per window)
    const { data: existingClaim } = await supabase
      .from("bed_signups")
      .select("id")
      .eq("signup_window_id", windowId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingClaim) {
      return { signup: null, error: new Error("You already have a bed claimed for this weekend") };
    }

    // Note: We no longer block claiming a bed that others have claimed
    // Multiple people can share a bed (couples, etc.)

    // Create the claim
    const { data: signup, error } = await supabase
      .from("bed_signups")
      .insert({
        signup_window_id: windowId,
        bed_id: bedId,
        user_id: userId,
        stay_id: stayId || null,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violations with friendlier messages
      if (error.code === "23505") {
        // Only user_id constraint remains (one bed per user per window)
        if (error.message.includes("user_id")) {
          return { signup: null, error: new Error("You already have a bed claimed for this weekend") };
        }
      }
      return { signup: null, error };
    }

    return { signup, error: null };
  } catch (error) {
    console.error("Error claiming bed:", error);
    return { signup: null, error: error as Error };
  }
}

/**
 * Release a bed claim
 */
export async function releaseBed(signupId: string, userId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Verify the claim belongs to this user
    const { data: claim, error: claimError } = await supabase
      .from("bed_signups")
      .select("user_id")
      .eq("id", signupId)
      .single();

    if (claimError) {
      return { success: false, error: claimError };
    }

    if (claim.user_id !== userId) {
      return { success: false, error: new Error("You can only release your own bed claim") };
    }

    // Delete the claim
    const { error } = await supabase
      .from("bed_signups")
      .delete()
      .eq("id", signupId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error releasing bed:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Link a bed claim to a stay
 */
export async function linkBedClaimToStay(
  signupId: string,
  stayId: string,
  userId: string
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Verify the claim belongs to this user
    const { data: claim, error: claimError } = await supabase
      .from("bed_signups")
      .select("user_id")
      .eq("id", signupId)
      .single();

    if (claimError) {
      return { success: false, error: claimError };
    }

    if (claim.user_id !== userId) {
      return { success: false, error: new Error("You can only update your own bed claim") };
    }

    // Update the claim
    const { error } = await supabase
      .from("bed_signups")
      .update({ stay_id: stayId })
      .eq("id", signupId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error linking bed claim to stay:", error);
    return { success: false, error: error as Error };
  }
}

// ============================================
// Check Window Status for Dates
// ============================================

/**
 * Check if there's an open signup window for the given dates
 * Used when creating a stay to determine if bed selection should be shown
 */
export async function isWindowOpenForDates(
  houseId: string,
  checkIn: string,
  checkOut: string
): Promise<{
  isOpen: boolean;
  window: SignupWindow | null;
  error: Error | null;
}> {
  try {
    // Find an open window where the target weekend overlaps with the stay dates
    const { data: window, error } = await supabase
      .from("signup_windows")
      .select("*")
      .eq("house_id", houseId)
      .eq("status", "open")
      .lte("target_weekend_start", checkOut)
      .gte("target_weekend_end", checkIn)
      .maybeSingle();

    if (error) {
      return { isOpen: false, window: null, error };
    }

    return { isOpen: !!window, window, error: null };
  } catch (error) {
    console.error("Error checking window for dates:", error);
    return { isOpen: false, window: null, error: error as Error };
  }
}

/**
 * Get user's bed claim for a specific window
 */
export async function getUserBedClaim(
  windowId: string,
  userId: string
): Promise<{
  claim: (BedSignup & { beds: Bed & { rooms: Room } }) | null;
  error: Error | null;
}> {
  try {
    const { data: claim, error } = await supabase
      .from("bed_signups")
      .select(`
        *,
        beds (
          *,
          rooms (*)
        )
      `)
      .eq("signup_window_id", windowId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { claim: null, error };
    }

    if (!claim) {
      return { claim: null, error: null };
    }

    return {
      claim: {
        ...claim,
        beds: {
          ...(claim.beds as Bed),
          rooms: (claim.beds as any).rooms as Room,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching user bed claim:", error);
    return { claim: null, error: error as Error };
  }
}

// ============================================
// Admin: Bed Signup History
// ============================================

/**
 * Get bed signup history for a house (admin feature)
 */
export async function getBedSignupHistory(
  houseId: string,
  limit: number = 20
): Promise<{
  history: BedSignupHistoryEntry[];
  error: Error | null;
}> {
  try {
    // Get past signup windows
    const { data: windows, error: windowsError } = await supabase
      .from("signup_windows")
      .select("*")
      .eq("house_id", houseId)
      .in("status", ["open", "closed"])
      .order("target_weekend_start", { ascending: false })
      .limit(limit);

    if (windowsError) {
      return { history: [], error: windowsError };
    }

    if (!windows || windows.length === 0) {
      return { history: [], error: null };
    }

    // Get claims for all these windows
    const windowIds = windows.map(w => w.id);
    const { data: claims, error: claimsError } = await supabase
      .from("bed_signups")
      .select(`
        *,
        profiles (*),
        beds (
          *,
          rooms (*)
        )
      `)
      .in("signup_window_id", windowIds);

    if (claimsError) {
      return { history: [], error: claimsError };
    }

    // Group claims by window
    const claimsByWindow = new Map<string, typeof claims>();
    for (const claim of claims || []) {
      const windowClaims = claimsByWindow.get(claim.signup_window_id) || [];
      windowClaims.push(claim);
      claimsByWindow.set(claim.signup_window_id, windowClaims);
    }

    // Build history entries
    const history: BedSignupHistoryEntry[] = windows.map(window => ({
      signupWindow: window,
      claims: (claimsByWindow.get(window.id) || []).map(claim => ({
        ...claim,
        profiles: claim.profiles as Profile,
        beds: {
          ...(claim.beds as Bed),
          rooms: (claim.beds as any).rooms as Room,
        },
      })),
    }));

    return { history, error: null };
  } catch (error) {
    console.error("Error fetching bed signup history:", error);
    return { history: [], error: error as Error };
  }
}

/**
 * Get signup stats for a user (how many times they got each room type)
 */
export async function getUserBedStats(
  houseId: string,
  userId: string
): Promise<{
  stats: {
    totalClaims: number;
    byRoom: Record<string, number>;
    byBedType: Record<string, number>;
    premiumCount: number;
  };
  error: Error | null;
}> {
  try {
    const { data: claims, error } = await supabase
      .from("bed_signups")
      .select(`
        *,
        beds (
          *,
          rooms (*)
        ),
        signup_windows!inner (
          house_id
        )
      `)
      .eq("user_id", userId)
      .eq("signup_windows.house_id", houseId);

    if (error) {
      return {
        stats: { totalClaims: 0, byRoom: {}, byBedType: {}, premiumCount: 0 },
        error,
      };
    }

    const stats = {
      totalClaims: claims?.length || 0,
      byRoom: {} as Record<string, number>,
      byBedType: {} as Record<string, number>,
      premiumCount: 0,
    };

    for (const claim of claims || []) {
      const bed = claim.beds as Bed & { rooms: Room };
      const roomName = bed.rooms.name;
      const bedType = bed.bed_type;

      stats.byRoom[roomName] = (stats.byRoom[roomName] || 0) + 1;
      stats.byBedType[bedType] = (stats.byBedType[bedType] || 0) + 1;
      if (bed.is_premium) {
        stats.premiumCount++;
      }
    }

    return { stats, error: null };
  } catch (error) {
    console.error("Error fetching user bed stats:", error);
    return {
      stats: { totalClaims: 0, byRoom: {}, byBedType: {}, premiumCount: 0 },
      error: error as Error,
    };
  }
}

// ============================================
// Admin: Window Status Overview
// ============================================

export type WindowStatus = {
  activeWindow: SignupWindowWithRoomsAndClaims | null;
  nextScheduledWindow: SignupWindow | null;
  hasRooms: boolean;
};

/**
 * Get comprehensive window status for admin UI
 * Returns active window (if any), next scheduled window, and room availability
 */
export async function getWindowStatus(houseId: string): Promise<{
  status: WindowStatus;
  error: Error | null;
}> {
  try {
    // Check if house has rooms configured
    const { rooms } = await getRoomsAndBeds(houseId);
    const hasRooms = rooms.length > 0 && rooms.some(r => r.beds.length > 0);

    // Get active window
    const { window: activeWindow, error: activeError } = await getActiveSignupWindow(houseId);
    if (activeError) {
      return { status: { activeWindow: null, nextScheduledWindow: null, hasRooms }, error: activeError };
    }

    // If there's an active window, no need for next scheduled
    if (activeWindow) {
      return {
        status: { activeWindow, nextScheduledWindow: null, hasRooms },
        error: null,
      };
    }

    // Get next scheduled window
    const { window: nextScheduledWindow, error: scheduledError } = await getNextScheduledWindow(houseId);
    if (scheduledError) {
      return { status: { activeWindow: null, nextScheduledWindow: null, hasRooms }, error: scheduledError };
    }

    return {
      status: { activeWindow: null, nextScheduledWindow, hasRooms },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching window status:", error);
    return {
      status: { activeWindow: null, nextScheduledWindow: null, hasRooms: false },
      error: error as Error,
    };
  }
}

// ============================================
// Admin: Manually manage windows (for testing/override)
// ============================================

/**
 * Create a signup window manually (admin only)
 */
export async function createSignupWindow(
  houseId: string,
  data: {
    targetWeekendStart: string;
    targetWeekendEnd: string;
    opensAt: string;
    status?: "scheduled" | "open";
  }
): Promise<{
  window: SignupWindow | null;
  error: Error | null;
}> {
  try {
    const { data: window, error } = await supabase
      .from("signup_windows")
      .insert({
        house_id: houseId,
        target_weekend_start: data.targetWeekendStart,
        target_weekend_end: data.targetWeekendEnd,
        opens_at: data.opensAt,
        status: data.status || "scheduled",
      })
      .select()
      .single();

    if (error) {
      return { window: null, error };
    }

    return { window, error: null };
  } catch (error) {
    console.error("Error creating signup window:", error);
    return { window: null, error: error as Error };
  }
}

/**
 * Open a signup window manually (admin override)
 */
export async function openSignupWindow(windowId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("signup_windows")
      .update({ status: "open", opens_at: new Date().toISOString() })
      .eq("id", windowId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error opening signup window:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Close a signup window manually (admin override)
 */
export async function closeSignupWindow(windowId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("signup_windows")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", windowId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error closing signup window:", error);
    return { success: false, error: error as Error };
  }
}
