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
  HouseWithRole,
} from "@/lib/api/house";
import { useAuth } from "./auth";

interface HouseContextType {
  activeHouse: HouseWithRole | null;
  houses: HouseWithRole[];
  isLoading: boolean;
  error: Error | null;
  setActiveHouse: (house: HouseWithRole) => Promise<void>;
  refreshHouses: () => Promise<void>;
}

const HouseContext = createContext<HouseContextType | undefined>(undefined);

export function HouseProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [activeHouse, setActiveHouseState] = useState<HouseWithRole | null>(
    null
  );
  const [houses, setHouses] = useState<HouseWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

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

  const value: HouseContextType = {
    activeHouse,
    houses,
    isLoading: authLoading || isLoading,
    error,
    setActiveHouse,
    refreshHouses,
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
