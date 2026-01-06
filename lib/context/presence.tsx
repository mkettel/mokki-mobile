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
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceUser {
  user_id: string;
  online_at: string;
}

interface PresenceContextType {
  onlineUserIds: string[];
  isUserOnline: (userId: string) => boolean;
  onlineCount: number;
  isConnected: boolean;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeHouse } = useHouse();

  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for subscription management
  const channelRef = useRef<RealtimeChannel | null>(null);
  const houseIdRef = useRef<string | null>(null);

  // Check if a user is online
  const isUserOnline = useCallback(
    (userId: string) => onlineUserIds.includes(userId),
    [onlineUserIds]
  );

  // Set up presence subscription when house changes
  useEffect(() => {
    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setIsConnected(false);
      setOnlineUserIds([]);
    }

    if (!activeHouse?.id || !user?.id) {
      houseIdRef.current = null;
      return;
    }

    // Capture current house ID to prevent stale closures
    const currentHouseId = activeHouse.id;
    houseIdRef.current = currentHouseId;

    // Create presence channel for this house
    const channel = supabase.channel(`presence:house-${currentHouseId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Listen for presence sync events
    channel.on("presence", { event: "sync" }, () => {
      if (houseIdRef.current !== currentHouseId) return;

      const state = channel.presenceState<PresenceUser>();
      const userIds = Object.values(state)
        .flat()
        .map((p) => p.user_id)
        .filter((id): id is string => !!id);

      // Deduplicate user IDs
      setOnlineUserIds([...new Set(userIds)]);
    });

    // Subscribe and track our presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        if (houseIdRef.current !== currentHouseId) return;

        setIsConnected(true);

        // Track our presence
        await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount or house change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [activeHouse?.id, user?.id]);

  // Clear presence when user logs out
  useEffect(() => {
    if (!user) {
      setOnlineUserIds([]);
      setIsConnected(false);
    }
  }, [user]);

  const value: PresenceContextType = {
    onlineUserIds,
    isUserOnline,
    onlineCount: onlineUserIds.length,
    isConnected,
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(): PresenceContextType {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error("usePresence must be used within a PresenceProvider");
  }
  return context;
}
