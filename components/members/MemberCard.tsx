import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import type { HouseMemberWithProfile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface MemberCardProps {
  member: HouseMemberWithProfile;
  isCurrentUser: boolean;
  isAdmin: boolean;
  isOnline?: boolean;
  showRiderType?: boolean;
  onRoleToggle?: () => void;
  onRemove?: () => void;
}

const RIDER_EMOJI: Record<string, string> = {
  skier: "\u26F7\uFE0F",
  snowboarder: "\uD83C\uDFC2",
  both: "\u26F7\uFE0F\uD83C\uDFC2",
};

export function MemberCard({
  member,
  isCurrentUser,
  isAdmin,
  isOnline,
  showRiderType = false,
  onRoleToggle,
  onRemove,
}: MemberCardProps) {
  const colors = useColors();
  const profile = member.profiles;
  const isPending = member.invite_status === "pending";

  const getInitials = () => {
    if (isPending && member.invited_email) {
      return member.invited_email.charAt(0).toUpperCase();
    }
    if (profile?.display_name) {
      return profile.display_name.charAt(0).toUpperCase();
    }
    if (profile?.email) {
      return profile.email.charAt(0).toUpperCase();
    }
    return "?";
  };

  const getName = () => {
    if (isPending) {
      return member.invited_email || "Pending";
    }
    return profile?.display_name || profile?.email || "Unknown";
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {profile?.avatar_url && !isPending ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: isPending ? colors.muted : colors.primary }]}>
            <Text style={[styles.initials, { color: isPending ? colors.mutedForeground : colors.primaryForeground }]}>
              {getInitials()}
            </Text>
          </View>
        )}
        {member.role === "admin" && !isPending && (
          <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
            <FontAwesome name="shield" size={10} color={colors.primaryForeground} />
          </View>
        )}
        {isOnline && !isPending && (
          <View style={[styles.onlineBadge, { borderColor: colors.card }]} />
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {getName()}
          </Text>
          {isCurrentUser && (
            <Text style={[styles.youLabel, { color: colors.mutedForeground }]}>
              (you)
            </Text>
          )}
        </View>

        {isPending ? (
          <View style={[styles.pendingBadge, { backgroundColor: colors.muted }]}>
            <FontAwesome name="clock-o" size={10} color={colors.mutedForeground} />
            <Text style={[styles.pendingText, { color: colors.mutedForeground }]}>
              Invited
            </Text>
          </View>
        ) : (
          <View style={styles.detailsRow}>
            {showRiderType && profile?.rider_type && (
              <Text style={styles.riderEmoji}>
                {RIDER_EMOJI[profile.rider_type]}
              </Text>
            )}
            {profile?.tagline && (
              <Text
                style={[styles.tagline, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {profile.tagline}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Actions (admin only, not for self) */}
      {isAdmin && !isCurrentUser && (
        <View style={styles.actions}>
          {!isPending && onRoleToggle && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.border }]}
              onPress={onRoleToggle}
            >
              <FontAwesome
                name={member.role === "admin" ? "user" : "shield"}
                size={14}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          )}
          {onRemove && (
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.destructive }]}
              onPress={onRemove}
            >
              <FontAwesome name="times" size={14} color={colors.destructive} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  adminBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
    flexShrink: 1,
  },
  youLabel: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  riderEmoji: {
    fontSize: 14,
  },
  tagline: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    flex: 1,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  pendingText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
