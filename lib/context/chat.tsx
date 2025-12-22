import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./auth";
import { useHouse } from "./house";
import {
  getHouseMessages,
  sendHouseMessage as apiSendHouseMessage,
  sendHouseMessageWithAttachments,
  markHouseChatRead,
  getHouseUnreadCount,
  getAllUnreadCounts,
  subscribeToHouseChat,
  unsubscribeFromChannel,
  ChatMessageWithProfile,
  PendingAttachment,
} from "@/lib/api/chat";
import { supabase } from "@/lib/supabase/client";

interface ChatContextType {
  // House chat state
  messages: ChatMessageWithProfile[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;

  // Unread counts
  unreadHouseChat: number;
  unreadDMTotal: number;
  unreadByConversation: Record<string, number>;

  // Actions
  sendMessage: (content: string, attachments?: PendingAttachment[]) => Promise<boolean>;
  loadMoreMessages: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  markAsRead: () => Promise<void>;
  refreshUnreadCounts: () => Promise<void>;

  // Real-time status
  isConnected: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeHouse } = useHouse();

  // State
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Unread counts
  const [unreadHouseChat, setUnreadHouseChat] = useState(0);
  const [unreadDMTotal, setUnreadDMTotal] = useState(0);
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});

  // Refs for subscription management
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const houseIdRef = useRef<string | null>(null);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!activeHouse?.id) {
      setMessages([]);
      setHasMore(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { messages: fetchedMessages, error: fetchError } =
        await getHouseMessages(activeHouse.id, { limit: 50 });

      if (fetchError) {
        setError(fetchError);
        setMessages([]);
      } else {
        setMessages(fetchedMessages);
        setHasMore(fetchedMessages.length === 50);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [activeHouse?.id]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!activeHouse?.id || !hasMore || isLoading || messages.length === 0) {
      return;
    }

    setIsLoading(true);

    try {
      const oldestMessage = messages[messages.length - 1];
      const { messages: olderMessages, error: fetchError } =
        await getHouseMessages(activeHouse.id, {
          limit: 50,
          before: oldestMessage.created_at,
        });

      if (fetchError) {
        console.error("Error loading more messages:", fetchError);
      } else {
        setMessages((prev) => [...prev, ...olderMessages]);
        setHasMore(olderMessages.length === 50);
      }
    } catch (err) {
      console.error("Error loading more messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeHouse?.id, hasMore, isLoading, messages]);

  // Send a message (with optional attachments)
  const sendMessage = useCallback(
    async (content: string, attachments?: PendingAttachment[]): Promise<boolean> => {
      if (!activeHouse?.id || !user?.id) {
        return false;
      }

      // Must have either content or attachments
      if (!content.trim() && (!attachments || attachments.length === 0)) {
        return false;
      }

      try {
        let sendError: Error | null = null;

        if (attachments && attachments.length > 0) {
          // Send with attachments
          const result = await sendHouseMessageWithAttachments(
            activeHouse.id,
            user.id,
            content,
            attachments
          );
          sendError = result.error;
        } else {
          // Send text only
          const result = await apiSendHouseMessage(
            activeHouse.id,
            user.id,
            content
          );
          sendError = result.error;
        }

        if (sendError) {
          console.error("Error sending message:", sendError);
          return false;
        }

        // Message will be added via realtime subscription
        return true;
      } catch (err) {
        console.error("Error sending message:", err);
        return false;
      }
    },
    [activeHouse?.id, user?.id]
  );

  // Refresh messages
  const refreshMessages = useCallback(async () => {
    await fetchMessages();
  }, [fetchMessages]);

  // Mark chat as read
  const markAsRead = useCallback(async () => {
    if (!activeHouse?.id || !user?.id) return;

    const latestMessageId = messages.length > 0 ? messages[0].id : undefined;
    await markHouseChatRead(activeHouse.id, user.id, latestMessageId);

    // Reset house chat unread count
    setUnreadHouseChat(0);
  }, [activeHouse?.id, user?.id, messages]);

  // Refresh unread counts
  const refreshUnreadCounts = useCallback(async () => {
    if (!activeHouse?.id || !user?.id) return;

    const { houseChat, dmTotal, dmByConversation } = await getAllUnreadCounts(
      activeHouse.id,
      user.id
    );

    setUnreadHouseChat(houseChat);
    setUnreadDMTotal(dmTotal);
    setUnreadByConversation(dmByConversation);
  }, [activeHouse?.id, user?.id]);

  // Set up realtime subscription when house changes
  useEffect(() => {
    // Clean up previous subscription
    if (channelRef.current) {
      unsubscribeFromChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
    }

    if (!activeHouse?.id) {
      houseIdRef.current = null;
      setMessages([]);
      setHasMore(false);
      return;
    }

    // Capture current house ID to prevent stale closures
    const currentHouseId = activeHouse.id;
    houseIdRef.current = currentHouseId;

    // Fetch initial messages
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { messages: fetchedMessages, error: fetchError } =
          await getHouseMessages(currentHouseId, { limit: 50 });

        // Verify we're still on the same house
        if (houseIdRef.current !== currentHouseId) return;

        if (fetchError) {
          setError(fetchError);
          setMessages([]);
        } else {
          setMessages(fetchedMessages);
          setHasMore(fetchedMessages.length === 50);
        }
      } catch (err) {
        if (houseIdRef.current !== currentHouseId) return;
        setError(err as Error);
      } finally {
        if (houseIdRef.current === currentHouseId) {
          setIsLoading(false);
        }
      }

      // Load unread counts
      if (user?.id) {
        const { houseChat, dmTotal, dmByConversation } = await getAllUnreadCounts(
          currentHouseId,
          user.id
        );
        if (houseIdRef.current === currentHouseId) {
          setUnreadHouseChat(houseChat);
          setUnreadDMTotal(dmTotal);
          setUnreadByConversation(dmByConversation);
        }
      }
    };

    loadInitialData();

    // Set up new subscription
    const channel = subscribeToHouseChat(currentHouseId, (newMessage) => {
      // Verify message is for current house before adding
      if (houseIdRef.current === currentHouseId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [newMessage, ...prev];
        });
      }
    });

    channelRef.current = channel;

    // Track connection status
    channel.on("system", { event: "subscribed" }, () => {
      if (houseIdRef.current === currentHouseId) {
        setIsConnected(true);
      }
    });

    // Cleanup on unmount or house change
    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [activeHouse?.id, user?.id]);

  // Clear messages when user logs out
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setHasMore(false);
      setError(null);
    }
  }, [user]);

  const value: ChatContextType = {
    messages,
    isLoading,
    error,
    hasMore,
    unreadHouseChat,
    unreadDMTotal,
    unreadByConversation,
    sendMessage,
    loadMoreMessages,
    refreshMessages,
    markAsRead,
    refreshUnreadCounts,
    isConnected,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
