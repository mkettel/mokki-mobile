import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getUserHouses,
  getActiveHouse,
  setActiveHouseId,
  acceptAllPendingInvites,
  toggleHouseArchived,
  HouseWithRole,
} from "@/lib/api/house";
import { useAuth } from "./auth";
import { useTheme } from "./theme";
import type { HouseSettings } from "@/types/database";

interface HouseContextType {
  activeHouse: HouseWithRole | null;
  houses: HouseWithRole[];
  isLoading: boolean;
  error: Error | null;
  setActiveHouse: (house: HouseWithRole) => Promise<void>;
  refreshHouses: () => Promise<void>;
  archiveHouse: (houseId: string, isArchived: boolean) => Promise<void>;
}

const HouseContext = createContext<HouseContextType | undefined>(undefined);

export function HouseProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { setHouseTheme } = useTheme();
  const [activeHouse, setActiveHouseState] = useState<HouseWithRole | null>(
    null
  );
  const [houses, setHouses] = useState<HouseWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Sync house theme when active house changes
  useEffect(() => {
    if (activeHouse) {
      const settings = activeHouse.settings as HouseSettings | undefined;
      setHouseTheme(settings?.theme || null);
    } else {
      setHouseTheme(null);
    }
  }, [activeHouse, setHouseTheme]);

  // Fetch houses when user changes
  const fetchHouses = useCallback(async () => {
    if (!user) {
      setActiveHouseState(null);
      setHouses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, accept any pending invites - pass user info to avoid auth race condition
      await acceptAllPendingInvites(user.id, user.email || undefined);

      // Then fetch houses - pass user.id to avoid auth race condition
      const { activeHouse, houses, error } = await getActiveHouse(user.id);

      if (error) {
        setError(error);
        setActiveHouseState(null);
        setHouses([]);
      } else {
        setActiveHouseState(activeHouse);
        setHouses(houses);
      }
    } catch (err) {
      console.error("Error fetching houses:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch houses when user is authenticated
  useEffect(() => {
    if (!authLoading) {
      fetchHouses();
    }
  }, [user, authLoading, fetchHouses]);

  // Set active house and persist to storage
  const setActiveHouse = useCallback(
    async (house: HouseWithRole) => {
      try {
        await setActiveHouseId(house.id);
        setActiveHouseState(house);
      } catch (err) {
        console.error("Error setting active house:", err);
        throw err;
      }
    },
    []
  );

  // Refresh houses from server
  const refreshHouses = useCallback(async () => {
    await fetchHouses();
  }, [fetchHouses]);

  // Archive or unarchive a house for the current user
  const archiveHouse = useCallback(
    async (houseId: string, isArchived: boolean) => {
      if (!user) throw new Error("Not authenticated");

      const { success, error } = await toggleHouseArchived(
        houseId,
        isArchived,
        user.id
      );

      if (error || !success) {
        console.error("Error archiving house:", error);
        throw error || new Error("Failed to archive house");
      }

      // If archiving the active house, switch to another non-archived house
      if (isArchived && activeHouse?.id === houseId) {
        const nextHouse = houses.find((h) => h.id !== houseId && !h.isArchived);
        if (nextHouse) {
          await setActiveHouse(nextHouse);
        }
      }

      // Refresh to get updated list
      await fetchHouses();
    },
    [user, activeHouse, houses, fetchHouses, setActiveHouse]
  );

  const value: HouseContextType = {
    activeHouse,
    houses,
    isLoading: authLoading || isLoading,
    error,
    setActiveHouse,
    refreshHouses,
    archiveHouse,
  };

  return (
    <HouseContext.Provider value={value}>{children}</HouseContext.Provider>
  );
}

export function useHouse(): HouseContextType {
  const context = useContext(HouseContext);
  if (context === undefined) {
    throw new Error("useHouse must be used within a HouseProvider");
  }
  return context;
}
