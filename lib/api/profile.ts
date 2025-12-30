import { supabase } from "@/lib/supabase/client";
import type { Profile, RiderType } from "@/types/database";
import { decode } from "base64-arraybuffer";
import { File } from "expo-file-system";
import { Platform } from "react-native";

// Validation constants
export const MAX_DISPLAY_NAME_LENGTH = 100;
export const MAX_TAGLINE_LENGTH = 100;
export const MIN_VENMO_LENGTH = 5;
export const MAX_VENMO_LENGTH = 30;
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/**
 * Validate Venmo handle format
 */
export function isValidVenmoHandle(handle: string): boolean {
  if (handle.length < MIN_VENMO_LENGTH || handle.length > MAX_VENMO_LENGTH) {
    return false;
  }
  // Alphanumeric, hyphens, and underscores only
  return /^[a-zA-Z0-9_-]+$/.test(handle);
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile(): Promise<{
  profile: Profile | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { profile: null, error: authError || new Error("Not authenticated") };
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      return { profile: null, error };
    }

    return { profile, error: null };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return { profile: null, error: error as Error };
  }
}

/**
 * Get a profile by user ID
 */
export async function getProfile(userId: string): Promise<{
  profile: Profile | null;
  error: Error | null;
}> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      return { profile: null, error };
    }

    return { profile, error: null };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return { profile: null, error: error as Error };
  }
}

/**
 * Update the current user's profile
 */
export async function updateProfile(updates: {
  display_name?: string | null;
  rider_type?: RiderType | null;
  tagline?: string | null;
  venmo_handle?: string | null;
}): Promise<{
  profile: Profile | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { profile: null, error: authError || new Error("Not authenticated") };
    }

    // Validate display name
    if (updates.display_name !== undefined && updates.display_name !== null) {
      if (updates.display_name.length > MAX_DISPLAY_NAME_LENGTH) {
        return {
          profile: null,
          error: new Error(`Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less`),
        };
      }
    }

    // Validate tagline
    if (updates.tagline !== undefined && updates.tagline !== null) {
      if (updates.tagline.length > MAX_TAGLINE_LENGTH) {
        return {
          profile: null,
          error: new Error(`Tagline must be ${MAX_TAGLINE_LENGTH} characters or less`),
        };
      }
    }

    // Validate venmo handle
    if (updates.venmo_handle !== undefined && updates.venmo_handle !== null && updates.venmo_handle !== "") {
      if (!isValidVenmoHandle(updates.venmo_handle)) {
        return {
          profile: null,
          error: new Error(`Venmo handle must be ${MIN_VENMO_LENGTH}-${MAX_VENMO_LENGTH} characters, alphanumeric with hyphens and underscores only`),
        };
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.display_name !== undefined) {
      updateData.display_name = updates.display_name?.trim() || null;
    }
    if (updates.rider_type !== undefined) {
      updateData.rider_type = updates.rider_type;
    }
    if (updates.tagline !== undefined) {
      updateData.tagline = updates.tagline?.trim() || null;
    }
    if (updates.venmo_handle !== undefined) {
      updateData.venmo_handle = updates.venmo_handle?.trim() || null;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      return { profile: null, error };
    }

    return { profile, error: null };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { profile: null, error: error as Error };
  }
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(imageUri: string, mimeType: string): Promise<{
  avatarUrl: string | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { avatarUrl: null, error: authError || new Error("Not authenticated") };
    }

    // Validate mime type
    if (!ALLOWED_AVATAR_TYPES.includes(mimeType)) {
      return {
        avatarUrl: null,
        error: new Error("Invalid file type. Please use JPEG, PNG, WebP, or GIF."),
      };
    }

    // Get file extension from mime type
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const extension = extensions[mimeType] || "jpg";

    // Generate storage path
    const storagePath = `${user.id}/avatar.${extension}`;

    // First, remove any existing avatar files
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(user.id);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("avatars").remove(filesToDelete);
    }

    // Upload to Supabase storage
    let uploadError: Error | null = null;

    if (Platform.OS === "web") {
      // Web: fetch and upload as blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Validate file size
      if (blob.size > MAX_AVATAR_SIZE) {
        return {
          avatarUrl: null,
          error: new Error("Image must be 5MB or less"),
        };
      }

      const { error } = await supabase.storage
        .from("avatars")
        .upload(storagePath, blob, {
          contentType: mimeType,
          cacheControl: "3600",
          upsert: true,
        });
      uploadError = error;
    } else {
      // Mobile (iOS/Android): use File class to read the file properly
      // fetch() doesn't work with local file:// URIs on mobile
      const localFile = new File(imageUri);
      const base64Data = await localFile.base64();

      // Validate file size (base64 is ~33% larger than original)
      const estimatedSize = (base64Data.length * 3) / 4;
      if (estimatedSize > MAX_AVATAR_SIZE) {
        return {
          avatarUrl: null,
          error: new Error("Image must be 5MB or less"),
        };
      }

      const { error } = await supabase.storage
        .from("avatars")
        .upload(storagePath, decode(base64Data), {
          contentType: mimeType,
          cacheControl: "3600",
          upsert: true,
        });
      uploadError = error;
    }

    if (uploadError) {
      return { avatarUrl: null, error: uploadError };
    }

    // Get public URL with cache-busting timestamp
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(storagePath);

    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    // Update profile with new avatar URL
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      return { avatarUrl: null, error: profileError };
    }

    return { avatarUrl, error: null };
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return { avatarUrl: null, error: error as Error };
  }
}

/**
 * Remove avatar image
 */
export async function removeAvatar(): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: authError || new Error("Not authenticated") };
    }

    // List and remove all files in user's avatar folder
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(user.id);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from("avatars").remove(filesToDelete);
    }

    // Update profile to remove avatar URL
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      return { success: false, error: profileError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error removing avatar:", error);
    return { success: false, error: error as Error };
  }
}
