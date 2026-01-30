import React, { useCallback, useRef } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import { useAuth } from "@/lib/context/auth";
import type { ChatMessageWithProfile } from "@/lib/api/chat";
import type { MessageAttachment } from "@/types/database";
import { MessageBubble } from "./MessageBubble";
import { format, isSameDay, parseISO } from "date-fns";
import { FontAwesome } from "@expo/vector-icons";

interface MessageListProps {
  messages: ChatMessageWithProfile[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onScrollToBottom?: () => void;
  onAttachmentPress?: (attachment: MessageAttachment, allAttachments: MessageAttachment[]) => void;
}

export function MessageList({
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  onScrollToBottom,
  onAttachmentPress,
}: MessageListProps) {
  const colors = useColors();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  // Check if we should show date separator
  const shouldShowDateSeparator = (
    currentMessage: ChatMessageWithProfile,
    previousMessage: ChatMessageWithProfile | undefined
  ) => {
    if (!previousMessage) return true;
    const currentDate = parseISO(currentMessage.created_at);
    const previousDate = parseISO(previousMessage.created_at);
    return !isSameDay(currentDate, previousDate);
  };

  // Check if we should show avatar (collapse consecutive messages from same user)
  // Avatar appears on the LAST (most recent) message of a consecutive group
  const shouldShowAvatar = (
    currentMessage: ChatMessageWithProfile,
    previousMessage: ChatMessageWithProfile | undefined
  ) => {
    if (!previousMessage) return true;
    // Show avatar if previous message (in inverted list = next in time) is from different user
    // This puts the avatar on the most recent message of a group
    return currentMessage.user_id !== previousMessage.user_id;
  };

  // Check if we should show name (on FIRST/oldest message of a consecutive group)
  const shouldShowName = (
    currentMessage: ChatMessageWithProfile,
    nextMessage: ChatMessageWithProfile | undefined
  ) => {
    if (!nextMessage) return true;
    // Show name if next message (in inverted list = earlier in time) is from different user
    // This puts the name on the first message of a group
    return currentMessage.user_id !== nextMessage.user_id;
  };

  // Format date for separator
  const formatDateSeparator = (dateString: string) => {
    const date = parseISO(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) {
      return "Today";
    } else if (isSameDay(date, yesterday)) {
      return "Yesterday";
    }
    return format(date, "EEEE, MMMM d");
  };

  const renderMessage = useCallback(
    ({
      item,
      index,
    }: {
      item: ChatMessageWithProfile;
      index: number;
    }) => {
      const isOwnMessage = item.user_id === user?.id;
      // In an inverted list, the next item in the array is actually the previous message in time
      const nextMessage = messages[index + 1];
      const previousMessage = messages[index - 1];

      // Show date separator above this message if it's a different day than the next message (which is earlier in time)
      const showDateSeparator = shouldShowDateSeparator(item, nextMessage);
      // Avatar shows on the most recent message (bottom of group)
      const showAvatar = shouldShowAvatar(item, previousMessage);
      // Name shows on the first message (top of group)
      const showName = shouldShowName(item, nextMessage);

      return (
        <View>
          {/* Date separator appears before the message so it's visually above in the inverted list */}
          {showDateSeparator && (
            <View style={styles.dateSeparator}>
              <View
                style={[styles.dateSeparatorLine, { backgroundColor: colors.border }]}
              />
              <Text
                style={[
                  styles.dateSeparatorText,
                  { color: colors.mutedForeground, backgroundColor: colors.background },
                ]}
              >
                {formatDateSeparator(item.created_at)}
              </Text>
              <View
                style={[styles.dateSeparatorLine, { backgroundColor: colors.border }]}
              />
            </View>
          )}
          <MessageBubble
            message={item}
            isOwnMessage={isOwnMessage}
            showAvatar={showAvatar}
            showName={showName && !isOwnMessage}
            onAttachmentPress={onAttachmentPress}
          />
        </View>
      );
    },
    [messages, user?.id, colors, onAttachmentPress]
  );

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;

    return (
      <View style={styles.loadingFooter}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        ) : (
          <TouchableOpacity onPress={onLoadMore} style={styles.loadMoreButton}>
            <Text style={[styles.loadMoreText, { color: colors.mutedForeground }]}>
              Load earlier messages
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [hasMore, isLoading, onLoadMore, colors]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.mutedForeground} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="comments-o" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No messages yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Be the first to send a message!
        </Text>
      </View>
    );
  }, [isLoading, colors]);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    onScrollToBottom?.();
  }, [onScrollToBottom]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && styles.emptyListContent,
        ]}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={() => hasMore && !isLoading && onLoadMore()}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
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
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
    paddingHorizontal: 12,
  },
  loadingFooter: {
    paddingVertical: 16,
    alignItems: "center",
  },
  loadMoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loadMoreText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    // Since the list is inverted, we need to flip the empty state
    transform: [{ scaleY: -1 }],
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
});
