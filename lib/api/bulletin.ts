import { supabase } from "@/lib/supabase/client";
import type {
  BulletinItem,
  BulletinItemWithProfile,
  BulletinCategory,
  BulletinStyle,
  ChecklistItem,
  HouseNote,
  HouseNoteWithEditor,
} from "@/types/database";

// Color options for bulletin notes
export const BULLETIN_COLORS = [
  { value: "yellow", label: "Yellow", bg: "#fef9c3", text: "#713f12" },
  { value: "blue", label: "Blue", bg: "#dbeafe", text: "#1e40af" },
  { value: "beige", label: "Beige", bg: "#fef3c7", text: "#78350f" },
  { value: "granite", label: "Granite", bg: "#e5e7eb", text: "#374151" },
  { value: "red", label: "Red", bg: "#fecaca", text: "#991b1b" },
] as const;

// Style options for bulletin notes
export const BULLETIN_STYLES: { value: BulletinStyle; label: string; emoji: string }[] = [
  { value: "sticky", label: "Sticky Note", emoji: "📝" },
  { value: "paper", label: "Paper", emoji: "📄" },
  { value: "sticker", label: "Sticker", emoji: "🏷️" },
  { value: "keychain", label: "Keychain", emoji: "🔑" },
  { value: "todo", label: "To-Do List", emoji: "☑️" },
];

// Category options for bulletin notes
export const BULLETIN_CATEGORIES: { value: BulletinCategory; label: string; icon: string }[] = [
  { value: "wifi", label: "WiFi", icon: "wifi" },
  { value: "house_rules", label: "House Rules", icon: "home" },
  { value: "emergency", label: "Emergency", icon: "exclamation-triangle" },
  { value: "local_tips", label: "Local Tips", icon: "map-marker" },
];

export function getColorInfo(color: string) {
  return BULLETIN_COLORS.find((c) => c.value === color) || BULLETIN_COLORS[0];
}

export function getCategoryInfo(category: BulletinCategory | null) {
  if (!category) return null;
  return BULLETIN_CATEGORIES.find((c) => c.value === category) || null;
}

export function getStyleInfo(style: BulletinStyle) {
  return BULLETIN_STYLES.find((s) => s.value === style) || BULLETIN_STYLES[0];
}

// Checklist helper functions for to-do list style notes
export function parseChecklistContent(content: string): ChecklistItem[] {
  try {
    const parsed = JSON.parse(content);
    return parsed.items || [];
  } catch {
    return [];
  }
}

export function serializeChecklistContent(items: ChecklistItem[]): string {
  return JSON.stringify({ items });
}

export function generateChecklistItemId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Get all bulletin items for a house
 */
export async function getBulletinItems(houseId: string): Promise<{
  items: BulletinItemWithProfile[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("bulletin_items")
      .select(`
        *,
        profiles (*)
      `)
      .eq("house_id", houseId)
      .order("created_at", { ascending: false });

    if (error) {
      return { items: [], error };
    }

    return { items: (data || []) as BulletinItemWithProfile[], error: null };
  } catch (error) {
    console.error("Error fetching bulletin items:", error);
    return { items: [], error: error as Error };
  }
}

/**
 * Create a new bulletin item
 */
export async function createBulletinItem(
  houseId: string,
  userId: string,
  data: {
    title: string;
    content: string;
    category?: BulletinCategory | null;
    color?: string;
    style?: BulletinStyle;
  }
): Promise<{
  item: BulletinItem | null;
  error: Error | null;
}> {
  try {
    const { title, content, category, color = "yellow", style = "sticky" } = data;

    const { data: item, error } = await supabase
      .from("bulletin_items")
      .insert({
        house_id: houseId,
        created_by: userId,
        title: title.trim(),
        content: content.trim(),
        category: category || null,
        color,
        style,
      })
      .select()
      .single();

    if (error) {
      return { item: null, error };
    }

    return { item, error: null };
  } catch (error) {
    console.error("Error creating bulletin item:", error);
    return { item: null, error: error as Error };
  }
}

/**
 * Update an existing bulletin item
 */
export async function updateBulletinItem(
  itemId: string,
  data: {
    title: string;
    content: string;
    category?: BulletinCategory | null;
    color?: string;
    style?: BulletinStyle;
  }
): Promise<{
  item: BulletinItem | null;
  error: Error | null;
}> {
  try {
    const { title, content, category, color, style } = data;

    const { data: item, error } = await supabase
      .from("bulletin_items")
      .update({
        title: title.trim(),
        content: content.trim(),
        category: category || null,
        color,
        style,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      return { item: null, error };
    }

    return { item, error: null };
  } catch (error) {
    console.error("Error updating bulletin item:", error);
    return { item: null, error: error as Error };
  }
}

/**
 * Delete a bulletin item
 */
export async function deleteBulletinItem(itemId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("bulletin_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting bulletin item:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get the house note for a house
 */
export async function getHouseNote(houseId: string): Promise<{
  note: HouseNoteWithEditor | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("house_notes")
      .select(`
        *,
        profiles (*)
      `)
      .eq("house_id", houseId)
      .maybeSingle();

    if (error) {
      return { note: null, error };
    }

    return { note: data as HouseNoteWithEditor | null, error: null };
  } catch (error) {
    console.error("Error fetching house note:", error);
    return { note: null, error: error as Error };
  }
}

/**
 * Create or update the house note (upsert)
 */
export async function updateHouseNote(
  houseId: string,
  userId: string,
  content: string
): Promise<{
  note: HouseNote | null;
  error: Error | null;
}> {
  try {
    const { data: note, error } = await supabase
      .from("house_notes")
      .upsert(
        {
          house_id: houseId,
          content: content.trim(),
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "house_id",
        }
      )
      .select()
      .single();

    if (error) {
      return { note: null, error };
    }

    return { note, error: null };
  } catch (error) {
    console.error("Error updating house note:", error);
    return { note: null, error: error as Error };
  }
}
