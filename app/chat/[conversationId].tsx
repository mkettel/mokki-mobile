import { AttachmentViewer, MessageInput, MessageList } from "@/components/chat";
import { typography } from "@/constants/theme";
import {
  ChatMessageWithProfile,
  Conversation,
  getConversation,
  getConversationMessages,
  markConversationRead,
  PendingAttachment,
  sendDirectMessage,
  sendDirectMessageWithAttachments,
  subscribeToConversation,
  unsubscribeFromChannel,
} from "@/lib/api/chat";
import { useAuth } from "@/lib/context/auth";
import { useChat } from "@/lib/context/chat";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import { supabase } from "@/lib/supabase/client";
import type { MessageAttachment, Profile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const { activeHouse } = useHouse();
  const { refreshUnreadCounts } = useChat();

  // State
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Attachment viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerAttachments, setViewerAttachments] = useState<
    MessageAttachment[]
  >([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Ref for channel
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch conversation and initial messages
  const fetchData = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    setIsLoading(true);

    // Get conversation
    const { conversation: conv, error: convError } = await getConversation(
      conversationId
    );

    if (convError || !conv) {
      console.error("Error fetching conversation:", convError);
      setIsLoading(false);
      return;
    }

    setConversation(conv);

    // Get other user's profile
    const otherUserId =
      conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;

    const { data: otherUserData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", otherUserId)
      .single();

    setOtherUser(otherUserData as Profile);

    // Get messages
    const { messages: msgs, error: msgsError } = await getConversationMessages(
      conversationId,
      { limit: 50 }
    );

    if (!msgsError) {
      setMessages(msgs);
      setHasMore(msgs.length === 50);
    }

    setIsLoading(false);
  }, [conversationId, user?.id]);

  // Load more messages
  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || !hasMore || isLoading || messages.length === 0) {
      return;
    }

    const oldestMessage = messages[messages.length - 1];
    const { messages: olderMessages, error } = await getConversationMessages(
      conversationId,
      { limit: 50, before: oldestMessage.created_at }
    );

    if (!error) {
      setMessages((prev) => [...prev, ...olderMessages]);
      setHasMore(olderMessages.length === 50);
    }
  }, [conversationId, hasMore, isLoading, messages]);

  // Send message (with optional attachments)
  const handleSendMessage = useCallback(
    async (
      content: string,
      attachments?: PendingAttachment[]
    ): Promise<boolean> => {
      if (!conversationId || !user?.id || !activeHouse?.id) {
        return false;
      }

      // Must have either content or attachments
      if (!content.trim() && (!attachments || attachments.length === 0)) {
        return false;
      }

      let error: Error | null = null;

      if (attachments && attachments.length > 0) {
        // Send with attachments
        const result = await sendDirectMessageWithAttachments(
          conversationId,
          activeHouse.id,
          user.id,
          content,
          attachments
        );
        error = result.error;
      } else {
        // Send text only
        const result = await sendDirectMessage(
          conversationId,
          user.id,
          content
        );
        error = result.error;
      }

      if (error) {
        console.error("Error sending message:", error);
        return false;
      }

      return true;
    },
    [conversationId, user?.id, activeHouse?.id]
  );

  // Mark conversation as read
  const markAsRead = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    const latestMessageId = messages.length > 0 ? messages[0].id : undefined;
    await markConversationRead(conversationId, user.id, latestMessageId);
    refreshUnreadCounts();
  }, [conversationId, user?.id, messages, refreshUnreadCounts]);

  // Set up data and realtime subscription
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    let cancelled = false;

    // Load initial data
    const loadData = async () => {
      setIsLoading(true);

      // Get conversation
      const { conversation: conv, error: convError } = await getConversation(
        conversationId
      );

      if (cancelled) return;

      if (convError || !conv) {
        console.error("Error fetching conversation:", convError);
        setIsLoading(false);
        return;
      }

      setConversation(conv);

      // Get other user's profile
      const otherUserId =
        conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1;

      const { data: otherUserData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", otherUserId)
        .single();

      if (cancelled) return;
      setOtherUser(otherUserData as Profile);

      // Get messages
      const { messages: msgs, error: msgsError } = await getConversationMessages(
        conversationId,
        { limit: 50 }
      );

      if (cancelled) return;

      if (!msgsError) {
        setMessages(msgs);
        setHasMore(msgs.length === 50);
      }

      setIsLoading(false);
    };

    loadData();

    // Set up realtime subscription
    const channel = subscribeToConversation(conversationId, (newMessage) => {
      if (!cancelled) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [newMessage, ...prev];
        });
      }
    });

    channelRef.current = channel;

    channel.on("system", { event: "subscribed" }, () => {
      if (!cancelled) {
        setIsConnected(true);
      }
    });

    return () => {
      cancelled = true;
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [conversationId, user?.id]);

  // Mark as read when messages load
  useEffect(() => {
    if (messages.length > 0 && conversationId && user?.id) {
      const latestMessageId = messages[0].id;
      markConversationRead(conversationId, user.id, latestMessageId);
      refreshUnreadCounts();
    }
  }, [messages.length > 0, conversationId, user?.id, refreshUnreadCounts]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle attachment press
  const handleAttachmentPress = (
    attachment: MessageAttachment,
    allAttachments: MessageAttachment[]
  ) => {
    const index = allAttachments.findIndex((a) => a.id === attachment.id);
    setViewerAttachments(allAttachments);
    setViewerInitialIndex(index >= 0 ? index : 0);
    setViewerVisible(true);
  };

  const displayName = otherUser?.display_name || "Loading...";
  const avatarUrl = otherUser?.avatar_url;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <FontAwesome
            name="chevron-left"
            size={16}
            color={colors.foreground}
          />
        </TouchableOpacity>

        {/* User info */}
        <TouchableOpacity style={styles.userInfo} activeOpacity={0.7}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: colors.muted },
              ]}
            >
              <Text
                style={[
                  styles.avatarInitials,
                  { color: colors.mutedForeground },
                ]}
              >
                {getInitials(displayName)}
              </Text>
            </View>
          )}
          <View style={styles.nameContainer}>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {displayName}
            </Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isConnected
                      ? "#22c55e"
                      : colors.mutedForeground,
                  },
                ]}
              />
              <Text
                style={[styles.statusText, { color: colors.mutedForeground }]}
              >
                {isConnected ? "Live" : "Connecting..."}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.backButton} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.messagesContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.mutedForeground} />
          </View>
        ) : (
          <MessageList
            messages={messages}
            isLoading={false}
            hasMore={hasMore}
            onLoadMore={loadMoreMessages}
            onAttachmentPress={handleAttachmentPress}
          />
        )}

        {/* Input */}
        <MessageInput
          onSend={handleSendMessage}
          placeholder={`Message ${displayName}...`}
        />
      </KeyboardAvoidingView>

      {/* Attachment Viewer */}
      <AttachmentViewer
        visible={viewerVisible}
        attachments={viewerAttachments}
        initialIndex={viewerInitialIndex}
        onClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  nameContainer: {
    alignItems: "flex-start",
  },
  name: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  messagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
