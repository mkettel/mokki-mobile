import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase/client";
import type { Database, HouseSettings } from "@/types/database";

// Types
type House = Database["public"]["Tables"]["houses"]["Row"];
type HouseMember = Database["public"]["Tables"]["house_members"]["Row"];

export interface HouseWithRole extends House {
  role: "admin" | "member";
  isArchived: boolean;
}

export interface HouseWithMembers extends House {
  members: (HouseMember & {
    profiles: Database["public"]["Tables"]["profiles"]["Row"] | null;
  })[];
}

// Storage key for active house
const ACTIVE_HOUSE_KEY = "mokki_active_house";

/**
 * Get the stored active house ID from AsyncStorage
 */
export async function getActiveHouseId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_HOUSE_KEY);
  } catch (error) {
    console.error("Error getting active house ID:", error);
    return null;
  }
}

/**
 * Set the active house ID in AsyncStorage
 */
export async function setActiveHouseId(houseId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_HOUSE_KEY, houseId);
  } catch (error) {
    console.error("Error setting active house ID:", error);
    throw error;
  }
}

/**
 * Clear the active house ID from AsyncStorage
 */
export async function clearActiveHouseId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_HOUSE_KEY);
  } catch (error) {
    console.error("Error clearing active house ID:", error);
  }
}

/**
 * Get all houses for the current user where they are an accepted member
 * @param userId - Optional user ID to use instead of fetching from auth (fixes race conditions)
 */
export async function getUserHouses(userId?: string): Promise<{
  houses: HouseWithRole[];
  error: Error | null;
}> {
  try {
    let userIdToUse = userId;

    // If no userId provided, try to get from auth
    if (!userIdToUse) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userIdToUse = user?.id;
    }

    if (!userIdToUse) {
      return { houses: [], error: new Error("Not authenticated") };
    }

    // Query matching the web app's house.ts getUserHouses()
    const { data, error } = await supabase
      .from("house_members")
      .select(
        `
        house_id,
        role,
        invite_status,
        is_archived,
        houses (
          id,
          name,
          address,
          settings,
          resort_id,
          favorite_resort_ids
        )
      `
      )
      .eq("user_id", userIdToUse)
      .eq("invite_status", "accepted");

    if (error) {
      console.error("Error fetching user houses:", error);
      return { houses: [], error };
    }

    // Transform the data to match HouseWithRole type
    // Note: 'houses' is a single object (foreign key), not an array
    const houses: HouseWithRole[] = (data || [])
      .filter((item) => item.houses !== null && (item.houses as any).id)
      .map((item) => ({
        ...(item.houses as House),
        role: item.role as "admin" | "member",
        isArchived: item.is_archived ?? false,
      }));

    return { houses, error: null };
  } catch (error) {
    console.error("Error in getUserHouses:", error);
    return { houses: [], error: error as Error };
  }
}

/**
 * Get the active house and all user's houses
 * If no active house is set, defaults to the first house
 * @param userId - Optional user ID to use instead of fetching from auth (fixes race conditions)
 */
export async function getActiveHouse(userId?: string): Promise<{
  activeHouse: HouseWithRole | null;
  houses: HouseWithRole[];
  error: Error | null;
}> {
  const { houses, error } = await getUserHouses(userId);

  if (error || houses.length === 0) {
    return { activeHouse: null, houses: [], error };
  }

  // Get stored active house ID
  const activeHouseId = await getActiveHouseId();

  // Find the active house or default to first
  let activeHouse = houses.find((h) => h.id === activeHouseId);

  if (!activeHouse) {
    // Default to first house and save it
    activeHouse = houses[0];
    await setActiveHouseId(activeHouse.id);
  }

  return { activeHouse, houses, error: null };
}

/**
 * Get a house with its members
 */
export async function getHouseWithMembers(
  houseId: string
): Promise<{
  house: HouseWithMembers | null;
  error: Error | null;
}> {
  try {
    const { data: house, error: houseError } = await supabase
      .from("houses")
      .select("*")
      .eq("id", houseId)
      .single();

    if (houseError || !house) {
      return { house: null, error: houseError };
    }

    const { data: members, error: membersError } = await supabase
      .from("house_members")
      .select(
        `
        *,
        profiles (*)
      `
      )
      .eq("house_id", houseId)
      .eq("invite_status", "accepted");

    if (membersError) {
      return { house: null, error: membersError };
    }

    return {
      house: {
        ...house,
        members: members || [],
      },
      error: null,
    };
  } catch (error) {
    console.error("Error in getHouseWithMembers:", error);
    return { house: null, error: error as Error };
  }
}

/**
 * Create a new house and set the creator as admin
 */
export async function createHouse(name: string): Promise<{
  house: House | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { house: null, error: new Error("Not authenticated") };
    }

    // Create the house
    const { data: house, error: houseError } = await supabase
      .from("houses")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (houseError || !house) {
      console.error("Error creating house:", houseError);
      return { house: null, error: houseError };
    }

    // Add the creator as an admin member
    const { error: memberError } = await supabase.from("house_members").insert({
      house_id: house.id,
      user_id: user.id,
      role: "admin",
      invite_status: "accepted",
    });

    if (memberError) {
      console.error("Error adding creator as member:", memberError);
      // Try to delete the house if member creation failed
      await supabase.from("houses").delete().eq("id", house.id);
      return { house: null, error: memberError };
    }

    // Set this as the active house
    await setActiveHouseId(house.id);

    return { house, error: null };
  } catch (error) {
    console.error("Error in createHouse:", error);
    return { house: null, error: error as Error };
  }
}

/**
 * Update house favorite resort IDs
 */
export async function updateHouseFavoriteResorts(
  houseId: string,
  resortIds: string[]
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("houses")
      .update({ favorite_resort_ids: resortIds })
      .eq("id", houseId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating favorite resorts:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Accept all pending invites for the current user
 * @param userId - Optional user ID to use
 * @param userEmail - Optional user email to use
 */
export async function acceptAllPendingInvites(userId?: string, userEmail?: string): Promise<void> {
  try {
    let userIdToUse = userId;
    let emailToUse = userEmail;

    // If not provided, try to get from auth
    if (!userIdToUse || !emailToUse) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userIdToUse = userIdToUse || user?.id;
      emailToUse = emailToUse || user?.email || undefined;
    }

    if (!userIdToUse || !emailToUse) return;

    // Find pending invites for this user's email
    const { data: pendingInvites } = await supabase
      .from("house_members")
      .select("id")
      .eq("invited_email", emailToUse)
      .eq("invite_status", "pending");

    if (!pendingInvites || pendingInvites.length === 0) return;

    // Update all pending invites to accepted
    await supabase
      .from("house_members")
      .update({
        user_id: userIdToUse,
        invite_status: "accepted",
        joined_at: new Date().toISOString(),
      })
      .eq("invited_email", emailToUse)
      .eq("invite_status", "pending");
  } catch (error) {
    console.error("Error accepting pending invites:", error);
  }
}

/**
 * Update house settings (feature toggles, labels, etc.)
 * Only admins should call this function
 */
export async function updateHouseSettings(
  houseId: string,
  newSettings: Partial<HouseSettings>
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Fetch current settings
    const { data: house, error: fetchError } = await supabase
      .from("houses")
      .select("settings")
      .eq("id", houseId)
      .single();

    if (fetchError) {
      console.error("Error fetching house settings:", fetchError);
      return { success: false, error: fetchError };
    }

    // Deep merge settings
    const currentSettings = (house?.settings as HouseSettings) || {};
    const mergedSettings: HouseSettings = {
      ...currentSettings,
      ...newSettings,
      // Deep merge features if both exist
      features:
        newSettings.features !== undefined
          ? {
              ...currentSettings.features,
              ...newSettings.features,
            }
          : currentSettings.features,
      // Deep merge theme if both exist
      theme:
        newSettings.theme !== undefined
          ? {
              ...currentSettings.theme,
              ...newSettings.theme,
            }
          : currentSettings.theme,
      // Deep merge tripTimer if both exist
      tripTimer:
        newSettings.tripTimer !== undefined
          ? {
              ...currentSettings.tripTimer,
              ...newSettings.tripTimer,
            }
          : currentSettings.tripTimer,
      // Deep merge sessionBookingConfig if both exist
      sessionBookingConfig:
        newSettings.sessionBookingConfig !== undefined
          ? {
              ...currentSettings.sessionBookingConfig,
              ...newSettings.sessionBookingConfig,
            }
          : currentSettings.sessionBookingConfig,
    };

    // Update
    const { error: updateError } = await supabase
      .from("houses")
      .update({
        settings: mergedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", houseId);

    if (updateError) {
      console.error("Error updating house settings:", updateError);
      return { success: false, error: updateError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error in updateHouseSettings:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Toggle the archived status of a house for the current user
 * @param houseId - The house ID to archive/unarchive
 * @param isArchived - The new archived status
 * @param userId - Optional user ID to use
 */
export async function toggleHouseArchived(
  houseId: string,
  isArchived: boolean,
  userId?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    let userIdToUse = userId;

    if (!userIdToUse) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userIdToUse = user?.id;
    }

    if (!userIdToUse) {
      return { success: false, error: new Error("Not authenticated") };
    }

    const { error } = await supabase
      .from("house_members")
      .update({ is_archived: isArchived })
      .eq("house_id", houseId)
      .eq("user_id", userIdToUse);

    if (error) {
      console.error("Error toggling house archived status:", error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error in toggleHouseArchived:", error);
    return { success: false, error: error as Error };
  }
}
