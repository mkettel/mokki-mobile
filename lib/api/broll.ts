import { supabase } from "@/lib/supabase/client";
import type {
  BRollMedia,
  BRollMediaWithProfile,
  BRollMediaGroupedByDay,
  MediaType,
  Profile,
} from "@/types/database";
import { format, isToday, isYesterday } from "date-fns";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { decode } from "base64-arraybuffer";

// File size limits
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Allowed file types
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format video duration
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Check if file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
}

/**
 * Check if file is a video
 */
export function isVideoFile(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType);
}

/**
 * Get media type from mime type
 */
export function getMediaType(mimeType: string): MediaType | null {
  if (isImageFile(mimeType)) return "image";
  if (isVideoFile(mimeType)) return "video";
  return null;
}

/**
 * Format display date for grouping
 */
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

/**
 * Group media items by date
 */
export function groupMediaByDate(
  items: BRollMediaWithProfile[]
): BRollMediaGroupedByDay[] {
  const grouped: Record<string, BRollMediaWithProfile[]> = {};

  items.forEach((item) => {
    const dateKey = format(new Date(item.created_at), "yyyy-MM-dd");
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(item);
  });

  return Object.entries(grouped)
    .map(([date, items]) => ({
      date,
      displayDate: formatDisplayDate(date),
      items,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Get B-Roll media for a house
 */
export async function getBRollMedia(
  houseId: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  items: BRollMediaWithProfile[];
  grouped: BRollMediaGroupedByDay[];
  hasMore: boolean;
  error: Error | null;
}> {
  try {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const { data, error, count } = await supabase
      .from("b_roll_media")
      .select(
        `
        *,
        profiles (*)
      `,
        { count: "exact" }
      )
      .eq("house_id", houseId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { items: [], grouped: [], hasMore: false, error };
    }

    const items = (data || []) as BRollMediaWithProfile[];
    const grouped = groupMediaByDate(items);
    const hasMore = (count || 0) > offset + items.length;

    return { items, grouped, hasMore, error: null };
  } catch (error) {
    console.error("Error fetching B-Roll media:", error);
    return { items: [], grouped: [], hasMore: false, error: error as Error };
  }
}

/**
 * Upload media to Supabase storage and save metadata
 */
export async function uploadBRollMedia(
  houseId: string,
  userId: string,
  file: {
    uri: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    width?: number;
    height?: number;
    duration?: number;
  },
  caption?: string
): Promise<{
  item: BRollMedia | null;
  error: Error | null;
}> {
  try {
    const mediaType = getMediaType(file.mimeType);
    if (!mediaType) {
      return { item: null, error: new Error("Invalid file type") };
    }

    // Validate file size
    const maxSize = mediaType === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.fileSize > maxSize) {
      return {
        item: null,
        error: new Error(
          `File too large. Maximum size is ${formatFileSize(maxSize)}`
        ),
      };
    }

    // Generate storage path
    const timestamp = Date.now();
    const sanitizedFileName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${houseId}/${userId}/${timestamp}_${sanitizedFileName}`;

    let uploadError: Error | null = null;

    if (Platform.OS === "web") {
      // Web: use fetch to get blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from("broll")
        .upload(storagePath, blob, {
          contentType: file.mimeType,
          cacheControl: "3600",
        });
      uploadError = error;
    } else {
      // Mobile: handle different URI formats
      let fileUri = file.uri;

      // If URI is not a file:// URI, copy to cache directory first
      if (!fileUri.startsWith("file://")) {
        const cacheDir = FileSystem.cacheDirectory;
        const cachedFile = `${cacheDir}upload_${timestamp}_${sanitizedFileName}`;
        await FileSystem.copyAsync({
          from: fileUri,
          to: cachedFile,
        });
        fileUri = cachedFile;
      }

      // Read file as base64 and decode to ArrayBuffer
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });

      const { error } = await supabase.storage
        .from("broll")
        .upload(storagePath, decode(base64), {
          contentType: file.mimeType,
          cacheControl: "3600",
        });
      uploadError = error;

      // Clean up cached file if we created one
      if (fileUri !== file.uri) {
        try {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    if (uploadError) {
      return { item: null, error: uploadError };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("broll").getPublicUrl(storagePath);

    // Save metadata to database
    const { data: item, error: dbError } = await supabase
      .from("b_roll_media")
      .insert({
        house_id: houseId,
        uploaded_by: userId,
        media_type: mediaType,
        storage_path: storagePath,
        public_url: publicUrl,
        caption: caption?.trim() || null,
        file_name: file.fileName,
        file_size: file.fileSize,
        mime_type: file.mimeType,
        width: file.width || null,
        height: file.height || null,
        duration: file.duration || null,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up storage if db save failed
      await supabase.storage.from("broll").remove([storagePath]);
      return { item: null, error: dbError };
    }

    return { item, error: null };
  } catch (error) {
    console.error("Error uploading B-Roll media:", error);
    return { item: null, error: error as Error };
  }
}

/**
 * Update media caption
 */
export async function updateBRollCaption(
  mediaId: string,
  caption: string | null
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("b_roll_media")
      .update({
        caption: caption?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mediaId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating caption:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Delete B-Roll media
 */
export async function deleteBRollMedia(mediaId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // First get the media to find storage path
    const { data: media, error: fetchError } = await supabase
      .from("b_roll_media")
      .select("storage_path")
      .eq("id", mediaId)
      .single();

    if (fetchError || !media) {
      return { success: false, error: fetchError || new Error("Media not found") };
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("broll")
      .remove([media.storage_path]);

    if (storageError) {
      console.error("Error deleting from storage:", storageError);
      // Continue to delete from database even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("b_roll_media")
      .delete()
      .eq("id", mediaId);

    if (dbError) {
      return { success: false, error: dbError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting B-Roll media:", error);
    return { success: false, error: error as Error };
  }
}
