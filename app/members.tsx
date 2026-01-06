import { InviteModal, MemberList } from "@/components/members";
import { TopBar } from "@/components/TopBar";
import { typography } from "@/constants/theme";
import { getHouseMembers, isUserAdmin } from "@/lib/api/members";
import { useAuth } from "@/lib/context/auth";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import type { HouseMemberWithProfile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MembersScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { activeHouse } = useHouse();

  const [members, setMembers] = useState<HouseMemberWithProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!activeHouse?.id) return;

    try {
      const [membersResult, adminResult] = await Promise.all([
        getHouseMembers(activeHouse.id),
        isUserAdmin(activeHouse.id),
      ]);

      if (!membersResult.error) {
        setMembers(membersResult.members);
      }
      if (!adminResult.error) {
        setIsAdmin(adminResult.isAdmin);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeHouse?.id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadMembers();
  };

  if (!activeHouse) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <FontAwesome
              name="chevron-left"
              size={18}
              color={colors.foreground}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Members
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <FontAwesome name="home" size={48} color={colors.mutedForeground} />
          <Text style={[styles.noHouseText, { color: colors.mutedForeground }]}>
            Select a house to view members
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar />

      {/* Header with back and invite buttons */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <FontAwesome
            name="chevron-left"
            size={18}
            color={colors.foreground}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Members
        </Text>
        {isAdmin ? (
          <TouchableOpacity
            onPress={() => setShowInviteModal(true)}
            style={[styles.inviteButton, { backgroundColor: colors.primary }]}
          >
            <FontAwesome
              name="user-plus"
              size={14}
              color={colors.primaryForeground}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading members...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* House name */}
          <View style={styles.houseInfo}>
            <Text style={[styles.houseName, { color: colors.foreground }]}>
              {activeHouse.name}
            </Text>
            <Text
              style={[styles.houseSubtitle, { color: colors.mutedForeground }]}
            >
              {members.filter((m) => m.invite_status === "accepted").length}{" "}
              members
            </Text>
          </View>

          {/* Member list */}
          <MemberList
            members={members}
            currentUserId={user?.id || ""}
            isAdmin={isAdmin}
            onMembersChange={loadMembers}
          />

          {/* Admin info */}
          {isAdmin && (
            <View
              style={[
                styles.adminInfo,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <FontAwesome
                name="info-circle"
                size={16}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.adminInfoText,
                  { color: colors.mutedForeground },
                ]}
              >
                As an admin, you can invite new members, change roles, and
                remove members.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Invite Modal */}
      <InviteModal
        visible={showInviteModal}
        houseId={activeHouse.id}
        houseName={activeHouse.name}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={loadMembers}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  headerSpacer: {
    width: 40,
  },
  inviteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  noHouseText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  houseInfo: {
    marginBottom: 20,
  },
  houseName: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  houseSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  adminInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 24,
    gap: 10,
  },
  adminInfoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 18,
  },
});
