import { GeometricBackground } from "@/components/GeometricBackground";
import { PageContainer } from "@/components/PageContainer";
import { TopBar } from "@/components/TopBar";
import {
  AttachmentViewer,
  ConversationList,
  MemberPicker,
  MessageInput,
  MessageList,
} from "@/components/chat";
import { typography } from "@/constants/theme";
import {
  ConversationWithOtherUser,
  getConversations,
  getOrCreateConversation,
} from "@/lib/api/chat";
import { useAuth } from "@/lib/context/auth";
import { useChat } from "@/lib/context/chat";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import type { MessageAttachment, Profile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type TabType = "house" | "dms";

export default function ChatScreen() {
  const colors = useColors();
  const { activeHouse } = useHouse();
  const { user } = useAuth();
  const {
    messages,
    isLoading: houseChatLoading,
    hasMore,
    sendMessage,
    loadMoreMessages,
    refreshMessages,
    markAsRead,
    refreshUnreadCounts,
    unreadHouseChat,
    unreadDMTotal,
    isConnected,
  } = useChat();

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>("house");
  const [conversations, setConversations] = useState<
    ConversationWithOtherUser[]
  >([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  // Attachment viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerAttachments, setViewerAttachments] = useState<
    MessageAttachment[]
  >([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!activeHouse?.id || !user?.id) return;

    setConversationsLoading(true);
    const { conversations: convs, error } = await getConversations(
      activeHouse.id,
      user.id
    );
    if (!error) {
      setConversations(convs);
    }
    setConversationsLoading(false);
  }, [activeHouse?.id, user?.id]);

  // Mark messages as read when screen is focused and on house chat tab
  useFocusEffect(
    useCallback(() => {
      if (activeTab === "house" && messages.length > 0) {
        markAsRead();
      }
      if (activeTab === "dms") {
        fetchConversations();
      }
    }, [activeTab, messages.length, markAsRead, fetchConversations])
  );

  // Refresh data when house changes
  useEffect(() => {
    if (activeHouse?.id) {
      refreshMessages();
      if (activeTab === "dms") {
        fetchConversations();
      }
    }
  }, [activeHouse?.id]);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === "dms") {
      fetchConversations();
    }
  };

  // Handle starting a new DM
  const handleStartDM = async (member: Profile) => {
    if (!activeHouse?.id || !user?.id) return;

    const { conversation, error } = await getOrCreateConversation(
      activeHouse.id,
      user.id,
      member.id
    );

    if (conversation && !error) {
      router.push(`/chat/${conversation.id}`);
    }
  };

  // Handle conversation press
  const handleConversationPress = (conv: ConversationWithOtherUser) => {
    router.push(`/chat/${conv.id}`);
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

  if (!activeHouse) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <PageContainer>
      <GeometricBackground />
      <TopBar />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {activeTab === "house" ? "House Chat" : "Direct Messages"}
          </Text>
          {activeTab === "house" && (
            <View style={styles.connectionStatus}>
              <View
                style={[
                  styles.connectionDot,
                  {
                    backgroundColor: isConnected
                      ? "#22c55e"
                      : colors.mutedForeground,
                  },
                ]}
              />
              <Text
                style={[
                  styles.connectionText,
                  { color: colors.mutedForeground },
                ]}
              >
                {isConnected ? "Live" : "Connecting..."}
              </Text>
            </View>
          )}
        </View>

        {/* New DM button */}
        {activeTab === "dms" && (
          <TouchableOpacity
            style={[styles.newButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowMemberPicker(true)}
          >
            <FontAwesome name="plus" size={14} color="#FFFFFF" />
            <Text style={styles.newButtonText}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab switcher */}
      <View style={[styles.tabContainer, { backgroundColor: colors.muted }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "house" && { backgroundColor: colors.background },
          ]}
          onPress={() => handleTabChange("house")}
        >
          <View style={styles.tabIconContainer}>
            <FontAwesome
              name="home"
              size={14}
              color={
                activeTab === "house"
                  ? colors.foreground
                  : colors.mutedForeground
              }
            />
            {unreadHouseChat > 0 && activeTab !== "house" && (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: colors.destructive },
                ]}
              >
                <Text style={styles.tabBadgeText}>
                  {unreadHouseChat > 99 ? "99+" : unreadHouseChat}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "house"
                    ? colors.foreground
                    : colors.mutedForeground,
              },
            ]}
          >
            House
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "dms" && { backgroundColor: colors.background },
          ]}
          onPress={() => handleTabChange("dms")}
        >
          <View style={styles.tabIconContainer}>
            <FontAwesome
              name="envelope"
              size={14}
              color={
                activeTab === "dms" ? colors.foreground : colors.mutedForeground
              }
            />
            {unreadDMTotal > 0 && activeTab !== "dms" && (
              <View
                style={[
                  styles.tabBadge,
                  { backgroundColor: colors.destructive },
                ]}
              >
                <Text style={styles.tabBadgeText}>
                  {unreadDMTotal > 99 ? "99+" : unreadDMTotal}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "dms"
                    ? colors.foreground
                    : colors.mutedForeground,
              },
            ]}
          >
            Direct
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.contentContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {activeTab === "house" ? (
          <>
            <MessageList
              messages={messages}
              isLoading={houseChatLoading}
              hasMore={hasMore}
              onLoadMore={loadMoreMessages}
              onAttachmentPress={handleAttachmentPress}
            />
            <MessageInput
              onSend={sendMessage}
              placeholder="Message the house..."
            />
          </>
        ) : (
          <ConversationList
            conversations={conversations}
            isLoading={conversationsLoading}
            onConversationPress={handleConversationPress}
            onNewConversation={() => setShowMemberPicker(true)}
          />
        )}
      </KeyboardAvoidingView>

      {/* Member Picker Modal */}
      <MemberPicker
        visible={showMemberPicker}
        onClose={() => setShowMemberPicker(false)}
        onSelectMember={handleStartDM}
      />

      {/* Attachment Viewer */}
      <AttachmentViewer
        visible={viewerVisible}
        attachments={viewerAttachments}
        initialIndex={viewerInitialIndex}
        onClose={() => setViewerVisible(false)}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  newButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 4,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  tabIconContainer: {
    position: "relative",
  },
  tabBadge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
  },
});
