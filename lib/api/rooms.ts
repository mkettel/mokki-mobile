import { supabase } from "@/lib/supabase/client";
import type {
  Room,
  Bed,
  RoomType,
  BedType,
  RoomWithBeds,
} from "@/types/database";

// ============================================
// Room CRUD Operations (Admin Only)
// ============================================

/**
 * Create a new room for a house
 */
export async function createRoom(
  houseId: string,
  data: {
    name: string;
    roomType?: RoomType;
    displayOrder?: number;
  }
): Promise<{
  room: Room | null;
  error: Error | null;
}> {
  try {
    // Get the max display order for existing rooms
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const { data: existingRooms } = await supabase
        .from("rooms")
        .select("display_order")
        .eq("house_id", houseId)
        .order("display_order", { ascending: false })
        .limit(1);

      displayOrder = existingRooms && existingRooms.length > 0
        ? existingRooms[0].display_order + 1
        : 0;
    }

    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        house_id: houseId,
        name: data.name,
        room_type: data.roomType || "bedroom",
        display_order: displayOrder,
      })
      .select()
      .single();

    if (error) {
      return { room: null, error };
    }

    return { room, error: null };
  } catch (error) {
    console.error("Error creating room:", error);
    return { room: null, error: error as Error };
  }
}

/**
 * Update a room
 */
export async function updateRoom(
  roomId: string,
  data: {
    name?: string;
    roomType?: RoomType;
    displayOrder?: number;
  }
): Promise<{
  room: Room | null;
  error: Error | null;
}> {
  try {
    const updateData: Partial<Room> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.roomType !== undefined) updateData.room_type = data.roomType;
    if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;

    const { data: room, error } = await supabase
      .from("rooms")
      .update(updateData)
      .eq("id", roomId)
      .select()
      .single();

    if (error) {
      return { room: null, error };
    }

    return { room, error: null };
  } catch (error) {
    console.error("Error updating room:", error);
    return { room: null, error: error as Error };
  }
}

/**
 * Delete a room (cascades to beds)
 */
export async function deleteRoom(roomId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("rooms")
      .delete()
      .eq("id", roomId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting room:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get a single room with its beds
 */
export async function getRoom(roomId: string): Promise<{
  room: RoomWithBeds | null;
  error: Error | null;
}> {
  try {
    const { data: room, error } = await supabase
      .from("rooms")
      .select(`
        *,
        beds (*)
      `)
      .eq("id", roomId)
      .single();

    if (error) {
      return { room: null, error };
    }

    // Sort beds by display order
    const sortedRoom = {
      ...room,
      beds: (room.beds || []).sort((a: Bed, b: Bed) => a.display_order - b.display_order),
    };

    return { room: sortedRoom, error: null };
  } catch (error) {
    console.error("Error fetching room:", error);
    return { room: null, error: error as Error };
  }
}

/**
 * Reorder rooms within a house
 */
export async function reorderRooms(
  houseId: string,
  roomOrder: string[] // Array of room IDs in desired order
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Update each room's display_order
    const updates = roomOrder.map((roomId, index) =>
      supabase
        .from("rooms")
        .update({ display_order: index, updated_at: new Date().toISOString() })
        .eq("id", roomId)
        .eq("house_id", houseId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      return { success: false, error: errors[0].error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error reordering rooms:", error);
    return { success: false, error: error as Error };
  }
}

// ============================================
// Bed CRUD Operations (Admin Only)
// ============================================

/**
 * Create a new bed in a room
 */
export async function createBed(
  roomId: string,
  houseId: string,
  data: {
    name: string;
    bedType?: BedType;
    isPremium?: boolean;
    displayOrder?: number;
  }
): Promise<{
  bed: Bed | null;
  error: Error | null;
}> {
  try {
    // Get the max display order for existing beds in this room
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const { data: existingBeds } = await supabase
        .from("beds")
        .select("display_order")
        .eq("room_id", roomId)
        .order("display_order", { ascending: false })
        .limit(1);

      displayOrder = existingBeds && existingBeds.length > 0
        ? existingBeds[0].display_order + 1
        : 0;
    }

    const { data: bed, error } = await supabase
      .from("beds")
      .insert({
        room_id: roomId,
        house_id: houseId,
        name: data.name,
        bed_type: data.bedType || "twin",
        is_premium: data.isPremium || false,
        display_order: displayOrder,
      })
      .select()
      .single();

    if (error) {
      return { bed: null, error };
    }

    return { bed, error: null };
  } catch (error) {
    console.error("Error creating bed:", error);
    return { bed: null, error: error as Error };
  }
}

/**
 * Update a bed
 */
export async function updateBed(
  bedId: string,
  data: {
    name?: string;
    bedType?: BedType;
    isPremium?: boolean;
    displayOrder?: number;
  }
): Promise<{
  bed: Bed | null;
  error: Error | null;
}> {
  try {
    const updateData: Partial<Bed> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.bedType !== undefined) updateData.bed_type = data.bedType;
    if (data.isPremium !== undefined) updateData.is_premium = data.isPremium;
    if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;

    const { data: bed, error } = await supabase
      .from("beds")
      .update(updateData)
      .eq("id", bedId)
      .select()
      .single();

    if (error) {
      return { bed: null, error };
    }

    return { bed, error: null };
  } catch (error) {
    console.error("Error updating bed:", error);
    return { bed: null, error: error as Error };
  }
}

/**
 * Delete a bed
 */
export async function deleteBed(bedId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("beds")
      .delete()
      .eq("id", bedId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting bed:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get a single bed
 */
export async function getBed(bedId: string): Promise<{
  bed: Bed | null;
  error: Error | null;
}> {
  try {
    const { data: bed, error } = await supabase
      .from("beds")
      .select("*")
      .eq("id", bedId)
      .single();

    if (error) {
      return { bed: null, error };
    }

    return { bed, error: null };
  } catch (error) {
    console.error("Error fetching bed:", error);
    return { bed: null, error: error as Error };
  }
}

/**
 * Reorder beds within a room
 */
export async function reorderBeds(
  roomId: string,
  bedOrder: string[] // Array of bed IDs in desired order
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Update each bed's display_order
    const updates = bedOrder.map((bedId, index) =>
      supabase
        .from("beds")
        .update({ display_order: index, updated_at: new Date().toISOString() })
        .eq("id", bedId)
        .eq("room_id", roomId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      return { success: false, error: errors[0].error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error reordering beds:", error);
    return { success: false, error: error as Error };
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get total bed count for a house
 */
export async function getHouseBedCount(houseId: string): Promise<{
  count: number;
  error: Error | null;
}> {
  try {
    const { count, error } = await supabase
      .from("beds")
      .select("*", { count: "exact", head: true })
      .eq("house_id", houseId);

    if (error) {
      return { count: 0, error };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    console.error("Error counting beds:", error);
    return { count: 0, error: error as Error };
  }
}

/**
 * Check if a house has any rooms configured
 */
export async function hasRoomsConfigured(houseId: string): Promise<{
  hasRooms: boolean;
  roomCount: number;
  bedCount: number;
  error: Error | null;
}> {
  try {
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id")
      .eq("house_id", houseId);

    if (roomsError) {
      return { hasRooms: false, roomCount: 0, bedCount: 0, error: roomsError };
    }

    const { count: bedCount, error: bedsError } = await supabase
      .from("beds")
      .select("*", { count: "exact", head: true })
      .eq("house_id", houseId);

    if (bedsError) {
      return { hasRooms: false, roomCount: 0, bedCount: 0, error: bedsError };
    }

    return {
      hasRooms: (rooms?.length || 0) > 0,
      roomCount: rooms?.length || 0,
      bedCount: bedCount || 0,
      error: null,
    };
  } catch (error) {
    console.error("Error checking rooms configuration:", error);
    return { hasRooms: false, roomCount: 0, bedCount: 0, error: error as Error };
  }
}

// ============================================
// Bed Type Options (for UI)
// ============================================

export const BED_TYPES: { value: BedType; label: string }[] = [
  { value: "king", label: "King" },
  { value: "queen", label: "Queen" },
  { value: "full", label: "Full" },
  { value: "twin", label: "Twin" },
];

export const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "bedroom", label: "Bedroom" },
  { value: "bunk_room", label: "Bunk Room" },
];
