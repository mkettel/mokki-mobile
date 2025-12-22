import { supabase } from "@/lib/supabase/client";
import type {
  MessageWithProfile,
  Profile,
  Conversation,
  ConversationWithLatest,
  MessageAttachment,
} from "@/types/database";
import { decode } from "base64-arraybuffer";
import { File } from "expo-file-system";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Platform } from "react-native";
import {
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  getMediaType,
  formatFileSize,
} from "./broll";

// ============================================
// Constants
// ============================================

export const MAX_MESSAGE_LENGTH = 2000;

// ============================================
// Types
// ============================================

// Re-export MessageWithProfile as ChatMessageWithProfile for consistency
export type ChatMessageWithProfile = MessageWithProfile;

// Export conversation types for use in components
export type { Conversation, ConversationWithLatest };

// Helper type for conversation with the other user's profile
export type ConversationWithOtherUser = Conversation & {
  otherUser: Profile;
  latestMessage?: {
    content: string;
    created_at: string;
    user_id: string;
  };
  unreadCount: number;
};

/**
 * Get messages for a house chat with pagination
 */
export async function getHouseMessages(
  houseId: string,
  options?: {
    limit?: number;
    before?: string; // created_at timestamp for pagination
  }
): Promise<{
  messages: ChatMessageWithProfile[];
  error: Error | null;
}> {
  try {
    let query = supabase
      .from("messages")
      .select(`
        *,
        profiles (*)
      `)
      .eq("house_id", houseId)
      .order("created_at", { ascending: false })
      .limit(options?.limit || 50);

    if (options?.before) {
      query = query.lt("created_at", options.before);
    }

    const { data, error } = await query;

    if (error) {
      return { messages: [], error };
    }

    return { messages: (data || []) as ChatMessageWithProfile[], error: null };
  } catch (error) {
    console.error("Error fetching house messages:", error);
    return { messages: [], error: error as Error };
  }
}

/**
 * Send a message to house chat
 */
export async function sendHouseMessage(
  houseId: string,
  userId: string,
  content: string
): Promise<{
  message: any | null;
  error: Error | null;
}> {
  try {
    const trimmedContent = content.trim();

    // Validate message length
    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
      return {
        message: null,
        error: new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`),
      };
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        house_id: houseId,
        user_id: userId,
        content: trimmedContent,
        type: "text",
      })
      .select()
      .single();

    if (error) {
      return { message: null, error };
    }

    return { message, error: null };
  } catch (error) {
    console.error("Error sending house message:", error);
    return { message: null, error: error as Error };
  }
}

// ============================================
// Read Receipt Functions
// ============================================

/**
 * Mark house chat as read
 */
export async function markHouseChatRead(
  houseId: string,
  userId: string,
  lastMessageId?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("chat_read_receipts")
      .upsert(
        {
          user_id: userId,
          house_id: houseId,
          last_read_at: new Date().toISOString(),
          last_read_message_id: lastMessageId || null,
        },
        {
          onConflict: "user_id,house_id",
        }
      );

    if (error) {
      console.error("Error marking house chat as read:", error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error marking house chat as read:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Mark DM conversation as read
 */
export async function markConversationRead(
  conversationId: string,
  userId: string,
  lastMessageId?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("chat_read_receipts")
      .upsert(
        {
          user_id: userId,
          conversation_id: conversationId,
          last_read_at: new Date().toISOString(),
          last_read_message_id: lastMessageId || null,
        },
        {
          onConflict: "user_id,conversation_id",
        }
      );

    if (error) {
      console.error("Error marking conversation as read:", error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get unread count for house chat
 */
export async function getHouseUnreadCount(
  houseId: string,
  userId: string
): Promise<{ count: number; error: Error | null }> {
  try {
    // Get user's last read timestamp for this house
    const { data: receipt } = await supabase
      .from("chat_read_receipts")
      .select("last_read_at")
      .eq("user_id", userId)
      .eq("house_id", houseId)
      .single();

    const lastReadAt = receipt?.last_read_at || "1970-01-01T00:00:00Z";

    // Count messages after last read (excluding user's own messages)
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("house_id", houseId)
      .neq("user_id", userId)
      .gt("created_at", lastReadAt);

    if (error) {
      return { count: 0, error };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    console.error("Error getting house unread count:", error);
    return { count: 0, error: error as Error };
  }
}

/**
 * Get unread count for a conversation
 */
export async function getConversationUnreadCount(
  conversationId: string,
  userId: string
): Promise<{ count: number; error: Error | null }> {
  try {
    // Get user's last read timestamp for this conversation
    const { data: receipt } = await supabase
      .from("chat_read_receipts")
      .select("last_read_at")
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .single();

    const lastReadAt = receipt?.last_read_at || "1970-01-01T00:00:00Z";

    // Count messages after last read (excluding user's own messages)
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .neq("user_id", userId)
      .gt("created_at", lastReadAt);

    if (error) {
      return { count: 0, error };
    }

    return { count: count || 0, error: null };
  } catch (error) {
    console.error("Error getting conversation unread count:", error);
    return { count: 0, error: error as Error };
  }
}

/**
 * Get all unread counts for a user in a house (house chat + all DMs)
 */
export async function getAllUnreadCounts(
  houseId: string,
  userId: string
): Promise<{
  houseChat: number;
  dmTotal: number;
  dmByConversation: Record<string, number>;
  error: Error | null;
}> {
  try {
    // Get house chat unread
    const { count: houseChat } = await getHouseUnreadCount(houseId, userId);

    // Get all conversations for this user in this house
    const { conversations } = await getConversations(houseId, userId);

    let dmTotal = 0;
    const dmByConversation: Record<string, number> = {};

    for (const conv of conversations) {
      const { count } = await getConversationUnreadCount(conv.id, userId);
      dmByConversation[conv.id] = count;
      dmTotal += count;
    }

    return {
      houseChat,
      dmTotal,
      dmByConversation,
      error: null,
    };
  } catch (error) {
    console.error("Error getting all unread counts:", error);
    return {
      houseChat: 0,
      dmTotal: 0,
      dmByConversation: {},
      error: error as Error,
    };
  }
}

// ============================================
// Realtime Subscription Helpers
// ============================================

/**
 * Subscribe to house chat messages
 */
export function subscribeToHouseChat(
  houseId: string,
  onMessage: (message: ChatMessageWithProfile) => void
) {
  const channel = supabase
    .channel(`house-chat:${houseId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `house_id=eq.${houseId}`,
      },
      async (payload) => {
        // Fetch the full message with profile
        const { data } = await supabase
          .from("messages")
          .select(`*, profiles (*)`)
          .eq("id", payload.new.id)
          .single();

        if (data) {
          onMessage(data as ChatMessageWithProfile);
        }
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribeFromChannel(channel: ReturnType<typeof supabase.channel>) {
  supabase.removeChannel(channel);
}

// ============================================
// Direct Message Functions (Phase 3)
// ============================================

/**
 * Get or create a conversation between two users in a house
 * Note: Uses raw query since conversations table may not be in generated types yet
 */
export async function getOrCreateConversation(
  houseId: string,
  userId: string,
  otherUserId: string
): Promise<{
  conversation: Conversation | null;
  error: Error | null;
}> {
  try {
    // Ensure participant_1 < participant_2 (database constraint)
    const [participant_1, participant_2] =
      userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

    // Try to find existing conversation using raw query
    const { data: existing, error: findError } = await supabase
      .from("conversations")
      .select("*")
      .eq("house_id", houseId)
      .eq("participant_1", participant_1)
      .eq("participant_2", participant_2)
      .maybeSingle();

    if (findError) {
      return { conversation: null, error: findError };
    }

    if (existing) {
      return { conversation: existing as Conversation, error: null };
    }

    // Create new conversation
    const { data: created, error: createError } = await supabase
      .from("conversations")
      .insert({
        house_id: houseId,
        participant_1,
        participant_2,
      })
      .select()
      .single();

    if (createError) {
      return { conversation: null, error: createError };
    }

    return { conversation: created as Conversation, error: null };
  } catch (error) {
    console.error("Error getting or creating conversation:", error);
    return { conversation: null, error: error as Error };
  }
}

/**
 * Get all conversations for a user in a house with latest message and other user profile
 */
export async function getConversations(
  houseId: string,
  userId: string
): Promise<{
  conversations: ConversationWithOtherUser[];
  error: Error | null;
}> {
  try {
    // Get conversations where user is a participant
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("house_id", houseId)
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      return { conversations: [], error };
    }

    if (!data || data.length === 0) {
      return { conversations: [], error: null };
    }

    // For each conversation, get the other user's profile and latest message
    const conversationsWithDetails = await Promise.all(
      data.map(async (conv: Conversation) => {
        // Determine the other user's ID
        const otherUserId = conv.participant_1 === userId
          ? conv.participant_2
          : conv.participant_1;

        // Get other user's profile
        const { data: otherUserProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", otherUserId)
          .single();

        // Get latest message for this conversation
        const { data: latestMessages } = await supabase
          .from("messages")
          .select("content, created_at, user_id")
          .eq("conversation_id" as any, conv.id)
          .order("created_at", { ascending: false })
          .limit(1);

        // Get unread count using read receipts
        const { count: unreadCountVal } = await getConversationUnreadCount(conv.id, userId);

        return {
          ...conv,
          otherUser: otherUserProfile as Profile,
          latestMessage: latestMessages?.[0],
          unreadCount: unreadCountVal || 0,
        } as ConversationWithOtherUser;
      })
    );

    return { conversations: conversationsWithDetails, error: null };
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return { conversations: [], error: error as Error };
  }
}

/**
 * Get messages for a DM conversation with pagination
 */
export async function getConversationMessages(
  conversationId: string,
  options?: {
    limit?: number;
    before?: string;
  }
): Promise<{
  messages: ChatMessageWithProfile[];
  error: Error | null;
}> {
  try {
    let query = supabase
      .from("messages")
      .select(`
        *,
        profiles (*)
      `)
      .eq("conversation_id" as any, conversationId)
      .order("created_at", { ascending: false })
      .limit(options?.limit || 50);

    if (options?.before) {
      query = query.lt("created_at", options.before);
    }

    const { data, error } = await query;

    if (error) {
      return { messages: [], error };
    }

    return { messages: (data || []) as ChatMessageWithProfile[], error: null };
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return { messages: [], error: error as Error };
  }
}

/**
 * Send a DM message
 */
export async function sendDirectMessage(
  conversationId: string,
  userId: string,
  content: string
): Promise<{
  message: any | null;
  error: Error | null;
}> {
  try {
    const trimmedContent = content.trim();

    // Validate message length
    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
      return {
        message: null,
        error: new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`),
      };
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        content: trimmedContent,
        type: "text",
      })
      .select()
      .single();

    if (error) {
      return { message: null, error };
    }

    return { message, error: null };
  } catch (error) {
    console.error("Error sending direct message:", error);
    return { message: null, error: error as Error };
  }
}

/**
 * Get a conversation by ID
 */
export async function getConversation(
  conversationId: string
): Promise<{
  conversation: Conversation | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (error) {
      return { conversation: null, error };
    }

    return { conversation: data as Conversation, error: null };
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return { conversation: null, error: error as Error };
  }
}

/**
 * Subscribe to DM conversation messages
 */
export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: ChatMessageWithProfile) => void
) {
  const channel = supabase
    .channel(`dm:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        // Fetch the full message with profile
        const { data } = await supabase
          .from("messages")
          .select(`*, profiles (*)`)
          .eq("id", payload.new.id)
          .single();

        if (data) {
          onMessage(data as ChatMessageWithProfile);
        }
      }
    )
    .subscribe();

  return channel;
}

// ============================================
// Media Attachment Functions (Phase 4)
// ============================================

// Pending attachment type for UI state before upload
export type PendingAttachment = {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
  type: "image" | "video";
};

/**
 * Upload a chat media attachment to storage
 */
export async function uploadChatAttachment(
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
  }
): Promise<{
  attachment: Omit<MessageAttachment, "id" | "message_id" | "created_at"> | null;
  error: Error | null;
}> {
  try {
    const mediaType = getMediaType(file.mimeType);
    if (!mediaType) {
      return { attachment: null, error: new Error("Invalid file type") };
    }

    // Validate file size
    const maxSize = mediaType === "image" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.fileSize > maxSize) {
      return {
        attachment: null,
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
      // Web: fetch and upload as blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(storagePath, blob, {
          contentType: file.mimeType,
          cacheControl: "3600",
        });
      uploadError = error;
    } else {
      // Mobile: use File class
      const localFile = new File(file.uri);
      const base64Data = await localFile.base64();

      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(storagePath, decode(base64Data), {
          contentType: file.mimeType,
          cacheControl: "3600",
        });
      uploadError = error;
    }

    if (uploadError) {
      return { attachment: null, error: uploadError };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-attachments").getPublicUrl(storagePath);

    // Generate thumbnail for videos
    let thumbnailUrl: string | null = null;
    if (mediaType === "video" && Platform.OS !== "web") {
      try {
        const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(
          file.uri,
          { time: 1000 }
        );

        const thumbnailPath = `${houseId}/${userId}/${timestamp}_thumb.jpg`;
        const thumbnailFile = new File(thumbnailUri);
        const thumbnailBase64 = await thumbnailFile.base64();

        const { error: thumbError } = await supabase.storage
          .from("chat-attachments")
          .upload(thumbnailPath, decode(thumbnailBase64), {
            contentType: "image/jpeg",
            cacheControl: "3600",
          });

        if (!thumbError) {
          const {
            data: { publicUrl: thumbPublicUrl },
          } = supabase.storage.from("chat-attachments").getPublicUrl(thumbnailPath);
          thumbnailUrl = thumbPublicUrl;
        }
      } catch (thumbError) {
        console.warn("Failed to generate thumbnail:", thumbError);
      }
    }

    return {
      attachment: {
        media_type: mediaType,
        storage_path: storagePath,
        public_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        file_name: file.fileName,
        file_size: file.fileSize,
        mime_type: file.mimeType,
        width: file.width || null,
        height: file.height || null,
        duration: file.duration || null,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error uploading chat attachment:", error);
    return { attachment: null, error: error as Error };
  }
}

/**
 * Send a message with attachments to house chat
 */
export async function sendHouseMessageWithAttachments(
  houseId: string,
  userId: string,
  content: string,
  pendingAttachments: PendingAttachment[]
): Promise<{
  message: any | null;
  error: Error | null;
}> {
  try {
    const trimmedContent = content.trim();

    // Validate message length
    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
      return {
        message: null,
        error: new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`),
      };
    }

    // Upload all attachments first
    const uploadedAttachments: Omit<MessageAttachment, "id" | "message_id" | "created_at">[] = [];
    const failedUploads: string[] = [];

    for (const pending of pendingAttachments) {
      const { attachment, error: uploadError } = await uploadChatAttachment(
        houseId,
        userId,
        {
          uri: pending.uri,
          fileName: pending.fileName,
          mimeType: pending.mimeType,
          fileSize: pending.fileSize,
          width: pending.width,
          height: pending.height,
          duration: pending.duration,
        }
      );

      if (uploadError || !attachment) {
        console.error("Error uploading attachment:", uploadError);
        failedUploads.push(pending.fileName);
        continue;
      }

      uploadedAttachments.push(attachment);
    }

    // If all uploads failed, return error
    if (failedUploads.length > 0 && uploadedAttachments.length === 0 && !trimmedContent) {
      return {
        message: null,
        error: new Error(`Failed to upload: ${failedUploads.join(", ")}`),
      };
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        house_id: houseId,
        user_id: userId,
        content: trimmedContent,
        type: "text",
        has_attachments: uploadedAttachments.length > 0,
      })
      .select()
      .single();

    if (messageError) {
      return { message: null, error: messageError };
    }

    // Save attachments to database
    if (uploadedAttachments.length > 0) {
      const attachmentsWithMessageId = uploadedAttachments.map((a) => ({
        ...a,
        message_id: message.id,
      }));

      const { error: attachmentError } = await supabase
        .from("message_attachments")
        .insert(attachmentsWithMessageId);

      if (attachmentError) {
        console.error("Error saving attachments:", attachmentError);
      }
    }

    return { message, error: null };
  } catch (error) {
    console.error("Error sending message with attachments:", error);
    return { message: null, error: error as Error };
  }
}

/**
 * Send a DM with attachments
 */
export async function sendDirectMessageWithAttachments(
  conversationId: string,
  houseId: string,
  userId: string,
  content: string,
  pendingAttachments: PendingAttachment[]
): Promise<{
  message: any | null;
  error: Error | null;
}> {
  try {
    const trimmedContent = content.trim();

    // Validate message length
    if (trimmedContent.length > MAX_MESSAGE_LENGTH) {
      return {
        message: null,
        error: new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`),
      };
    }

    // Upload all attachments first
    const uploadedAttachments: Omit<MessageAttachment, "id" | "message_id" | "created_at">[] = [];
    const failedUploads: string[] = [];

    for (const pending of pendingAttachments) {
      const { attachment, error: uploadError } = await uploadChatAttachment(
        houseId,
        userId,
        {
          uri: pending.uri,
          fileName: pending.fileName,
          mimeType: pending.mimeType,
          fileSize: pending.fileSize,
          width: pending.width,
          height: pending.height,
          duration: pending.duration,
        }
      );

      if (uploadError || !attachment) {
        console.error("Error uploading attachment:", uploadError);
        failedUploads.push(pending.fileName);
        continue;
      }

      uploadedAttachments.push(attachment);
    }

    // If all uploads failed, return error
    if (failedUploads.length > 0 && uploadedAttachments.length === 0 && !trimmedContent) {
      return {
        message: null,
        error: new Error(`Failed to upload: ${failedUploads.join(", ")}`),
      };
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        content: trimmedContent,
        type: "text",
        has_attachments: uploadedAttachments.length > 0,
      })
      .select()
      .single();

    if (messageError) {
      return { message: null, error: messageError };
    }

    // Save attachments to database
    if (uploadedAttachments.length > 0) {
      const attachmentsWithMessageId = uploadedAttachments.map((a) => ({
        ...a,
        message_id: message.id,
      }));

      const { error: attachmentError } = await supabase
        .from("message_attachments")
        .insert(attachmentsWithMessageId);

      if (attachmentError) {
        console.error("Error saving attachments:", attachmentError);
      }
    }

    return { message, error: null };
  } catch (error) {
    console.error("Error sending DM with attachments:", error);
    return { message: null, error: error as Error };
  }
}

/**
 * Get attachments for a message
 */
export async function getMessageAttachments(
  messageId: string
): Promise<{
  attachments: MessageAttachment[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("message_attachments")
      .select("*")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });

    if (error) {
      return { attachments: [], error };
    }

    return { attachments: data as MessageAttachment[], error: null };
  } catch (error) {
    console.error("Error fetching message attachments:", error);
    return { attachments: [], error: error as Error };
  }
}
