import React from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import type { ConversationWithOtherUser } from "@/lib/api/chat";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { FontAwesome } from "@expo/vector-icons";

interface ConversationListProps {
  conversations: ConversationWithOtherUser[];
  isLoading: boolean;
  onConversationPress: (conversation: ConversationWithOtherUser) => void;
  onNewConversation?: () => void;
}

export function ConversationList({
  conversations,
  isLoading,
  onConversationPress,
  onNewConversation,
}: ConversationListProps) {
  const colors = useColors();

  const formatTime = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    }
    return format(date, "MMM d");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderConversation = ({ item }: { item: ConversationWithOtherUser }) => {
    const displayName = item.otherUser?.display_name || "Unknown";
    const avatarUrl = item.otherUser?.avatar_url;
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          { borderBottomColor: colors.border },
        ]}
        onPress={() => onConversationPress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
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
                style={[styles.avatarInitials, { color: colors.mutedForeground }]}
              >
                {getInitials(displayName)}
              </Text>
            </View>
          )}
          {hasUnread && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.unreadBadgeText, { color: colors.primaryForeground }]}>
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.name,
                { color: colors.foreground },
                hasUnread && styles.nameUnread,
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {item.latestMessage && (
              <Text style={[styles.time, { color: colors.mutedForeground }]}>
                {formatTime(item.latestMessage.created_at)}
              </Text>
            )}
          </View>
          {item.latestMessage && (
            <Text
              style={[
                styles.preview,
                { color: colors.mutedForeground },
                hasUnread && styles.previewUnread,
              ]}
              numberOfLines={1}
            >
              {item.latestMessage.content}
            </Text>
          )}
        </View>

        {/* Chevron */}
        <FontAwesome
          name="chevron-right"
          size={12}
          color={colors.mutedForeground}
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.mutedForeground} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="envelope-o" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No conversations yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Start a conversation with a house member
        </Text>
        {onNewConversation && (
          <TouchableOpacity
            style={[styles.newButton, { backgroundColor: colors.primary }]}
            onPress={onNewConversation}
          >
            <FontAwesome name="plus" size={14} color={colors.primaryForeground} />
            <Text style={[styles.newButtonText, { color: colors.primaryForeground }]}>
              New Message
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    flex: 1,
    marginRight: 8,
  },
  nameUnread: {
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  time: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  preview: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  previewUnread: {
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  chevron: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 8,
    textAlign: "center",
  },
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  newButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
