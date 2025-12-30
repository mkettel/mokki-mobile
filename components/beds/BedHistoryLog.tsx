import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import { getBedSignupHistory, getUserBedStats } from "@/lib/api/bedSignups";
import type { BedSignupHistoryEntry } from "@/types/database";

interface BedHistoryLogProps {
  houseId: string;
  onClose?: () => void;
}

interface UserStats {
  id: string;
  name: string;
  email: string;
  totalClaims: number;
  byRoom: Record<string, number>;
  premiumCount: number;
}

export function BedHistoryLog({ houseId, onClose }: BedHistoryLogProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<BedSignupHistoryEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [viewMode, setViewMode] = useState<"history" | "stats">("history");
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const { history: historyData, error: historyError } = await getBedSignupHistory(houseId, 20);

      if (historyError) {
        throw historyError;
      }

      setHistory(historyData);

      // Calculate user stats from history
      const statsMap = new Map<string, UserStats>();

      for (const entry of historyData) {
        for (const claim of entry.claims) {
          const userId = claim.user_id;
          const profile = claim.profiles;
          const bed = claim.beds;
          const room = bed.rooms;

          if (!statsMap.has(userId)) {
            statsMap.set(userId, {
              id: userId,
              name: profile.display_name || profile.email.split("@")[0],
              email: profile.email,
              totalClaims: 0,
              byRoom: {},
              premiumCount: 0,
            });
          }

          const stats = statsMap.get(userId)!;
          stats.totalClaims++;
          stats.byRoom[room.name] = (stats.byRoom[room.name] || 0) + 1;
          if (bed.is_premium) {
            stats.premiumCount++;
          }
        }
      }

      // Sort by total claims descending
      const sortedStats = Array.from(statsMap.values()).sort(
        (a, b) => b.totalClaims - a.totalClaims
      );
      setUserStats(sortedStats);

      setLoading(false);
    } catch (err) {
      console.error("Error loading bed history:", err);
      setError("Failed to load bed history");
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatWeekendDate = (start: string, end: string) => {
    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T00:00:00");
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  };

  const formatFullDate = (start: string) => {
    const date = new Date(start + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "#22c55e";
      case "closed":
        return colors.mutedForeground;
      default:
        return colors.primary;
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Loading history...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.foreground }]}>
          Bed History
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* View Mode Toggle */}
      <View style={[styles.toggleContainer, { backgroundColor: colors.muted }]}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "history" && { backgroundColor: colors.background },
          ]}
          onPress={() => setViewMode("history")}
        >
          <Text
            style={[
              styles.toggleText,
              { color: viewMode === "history" ? colors.foreground : colors.mutedForeground },
            ]}
          >
            By Weekend
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "stats" && { backgroundColor: colors.background },
          ]}
          onPress={() => setViewMode("stats")}
        >
          <Text
            style={[
              styles.toggleText,
              { color: viewMode === "stats" ? colors.foreground : colors.mutedForeground },
            ]}
          >
            By Member
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={[styles.errorCard, { backgroundColor: colors.destructive + "20" }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {viewMode === "history" ? (
          // History View - By Weekend
          <>
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome name="calendar-o" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No History Yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                  Bed assignments will appear here after sign-up windows close.
                </Text>
              </View>
            ) : (
              history.map((entry) => (
                <View
                  key={entry.signupWindow.id}
                  style={[styles.weekendCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.weekendHeader}>
                    <View>
                      <Text style={[styles.weekendDate, { color: colors.foreground }]}>
                        {formatWeekendDate(
                          entry.signupWindow.target_weekend_start,
                          entry.signupWindow.target_weekend_end
                        )}
                      </Text>
                      <Text style={[styles.weekendYear, { color: colors.mutedForeground }]}>
                        {formatFullDate(entry.signupWindow.target_weekend_start)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(entry.signupWindow.status) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(entry.signupWindow.status) },
                        ]}
                      >
                        {entry.signupWindow.status === "open" ? "Open" : "Closed"}
                      </Text>
                    </View>
                  </View>

                  {entry.claims.length === 0 ? (
                    <Text style={[styles.noClaims, { color: colors.mutedForeground }]}>
                      No beds were claimed
                    </Text>
                  ) : (
                    <View style={styles.claimsList}>
                      {entry.claims.map((claim) => (
                        <View
                          key={claim.id}
                          style={[styles.claimRow, { borderTopColor: colors.border }]}
                        >
                          <View style={styles.claimUser}>
                            <View
                              style={[styles.userAvatar, { backgroundColor: colors.primary }]}
                            >
                              <Text style={[styles.userInitial, { color: colors.primaryForeground }]}>
                                {(claim.profiles.display_name || claim.profiles.email)
                                  .charAt(0)
                                  .toUpperCase()}
                              </Text>
                            </View>
                            <Text style={[styles.userName, { color: colors.foreground }]}>
                              {claim.profiles.display_name || claim.profiles.email.split("@")[0]}
                            </Text>
                          </View>
                          <View style={styles.claimBed}>
                            <Text style={[styles.roomName, { color: colors.mutedForeground }]}>
                              {claim.beds.rooms.name}
                            </Text>
                            <Text style={[styles.bedName, { color: colors.foreground }]}>
                              {claim.beds.name}
                              {claim.beds.is_premium && (
                                <Text style={{ color: colors.primary }}> *</Text>
                              )}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        ) : (
          // Stats View - By Member
          <>
            {userStats.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome name="users" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No Stats Yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                  Member statistics will appear after beds are claimed.
                </Text>
              </View>
            ) : (
              userStats.map((stats, index) => (
                <View
                  key={stats.id}
                  style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.statsHeader}>
                    <View style={styles.statsUser}>
                      <Text style={[styles.statsRank, { color: colors.mutedForeground }]}>
                        #{index + 1}
                      </Text>
                      <View
                        style={[styles.userAvatar, { backgroundColor: colors.primary }]}
                      >
                        <Text style={[styles.userInitial, { color: colors.primaryForeground }]}>
                          {stats.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.userName, { color: colors.foreground }]}>
                          {stats.name}
                        </Text>
                        <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
                          {stats.email}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statsTotal}>
                      <Text style={[styles.totalNumber, { color: colors.primary }]}>
                        {stats.totalClaims}
                      </Text>
                      <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
                        beds
                      </Text>
                    </View>
                  </View>

                  <View style={styles.roomBreakdown}>
                    {Object.entries(stats.byRoom).map(([roomName, count]) => (
                      <View key={roomName} style={styles.roomStat}>
                        <Text style={[styles.roomStatName, { color: colors.mutedForeground }]}>
                          {roomName}
                        </Text>
                        <Text style={[styles.roomStatCount, { color: colors.foreground }]}>
                          {count}x
                        </Text>
                      </View>
                    ))}
                    {stats.premiumCount > 0 && (
                      <View style={styles.roomStat}>
                        <Text style={[styles.roomStatName, { color: colors.primary }]}>
                          Premium beds
                        </Text>
                        <Text style={[styles.roomStatCount, { color: colors.primary }]}>
                          {stats.premiumCount}x
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  toggleContainer: {
    flexDirection: "row",
    margin: 16,
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  errorCard: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  weekendCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  weekendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
  },
  weekendDate: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  weekendYear: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  noClaims: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontStyle: "italic",
  },
  claimsList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  claimRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  claimUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  userInitial: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  userName: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  claimBed: {
    alignItems: "flex-end",
  },
  roomName: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  bedName: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  statsCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  statsRank: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    width: 24,
  },
  userEmail: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 1,
  },
  statsTotal: {
    alignItems: "center",
  },
  totalNumber: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  totalLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillax,
  },
  roomBreakdown: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  roomStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roomStatName: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  roomStatCount: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  bottomPadding: {
    height: 40,
  },
});
