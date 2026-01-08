import { typography } from "@/constants/theme";
import { cancelInvite, removeMember, updateMemberRole } from "@/lib/api/members";
import { usePresence } from "@/lib/context/presence";
import { useColors } from "@/lib/context/theme";
import type { HouseMemberWithProfile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { MemberCard } from "./MemberCard";

interface MemberListProps {
  members: HouseMemberWithProfile[];
  currentUserId: string;
  isAdmin: boolean;
  showRiderType?: boolean;
  onMembersChange: () => void;
}

export function MemberList({
  members,
  currentUserId,
  isAdmin,
  showRiderType = false,
  onMembersChange,
}: MemberListProps) {
  const colors = useColors();
  const { isUserOnline } = usePresence();

  const acceptedMembers = members.filter((m) => m.invite_status === "accepted");
  const pendingMembers = members.filter((m) => m.invite_status === "pending");

  const handleRoleToggle = async (member: HouseMemberWithProfile) => {
    const newRole = member.role === "admin" ? "member" : "admin";
    const actionText = newRole === "admin" ? "Make admin" : "Remove admin";

    const doToggle = async () => {
      const { error } = await updateMemberRole(member.id, newRole);
      if (error) {
        const message = error.message || "Failed to update role";
        if (Platform.OS === "web") {
          window.alert(message);
        } else {
          Alert.alert("Error", message);
        }
      } else {
        onMembersChange();
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`${actionText} for ${member.profiles?.display_name || member.profiles?.email}?`)) {
        doToggle();
      }
    } else {
      Alert.alert(
        actionText,
        `${actionText} for ${member.profiles?.display_name || member.profiles?.email}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", onPress: doToggle },
        ]
      );
    }
  };

  const handleRemoveMember = async (member: HouseMemberWithProfile) => {
    const isPending = member.invite_status === "pending";
    const name = isPending
      ? member.invited_email
      : member.profiles?.display_name || member.profiles?.email;
    const title = isPending ? "Cancel Invitation" : "Remove Member";
    const message = isPending
      ? `Cancel the invitation for ${name}?`
      : `Remove ${name} from this house?`;

    const doRemove = async () => {
      const { error } = isPending
        ? await cancelInvite(member.id)
        : await removeMember(member.id);

      if (error) {
        const errorMessage = error.message || "Failed to remove";
        if (Platform.OS === "web") {
          window.alert(errorMessage);
        } else {
          Alert.alert("Error", errorMessage);
        }
      } else {
        onMembersChange();
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        doRemove();
      }
    } else {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: isPending ? "Cancel Invite" : "Remove", style: "destructive", onPress: doRemove },
      ]);
    }
  };

  if (members.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="users" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No members yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Accepted Members */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Members
          </Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.countText, { color: colors.primaryForeground }]}>
              {acceptedMembers.length}
            </Text>
          </View>
        </View>
        <View style={styles.membersList}>
          {acceptedMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isCurrentUser={member.user_id === currentUserId}
              isAdmin={isAdmin}
              isOnline={member.user_id ? isUserOnline(member.user_id) : false}
              showRiderType={showRiderType}
              onRoleToggle={() => handleRoleToggle(member)}
              onRemove={() => handleRemoveMember(member)}
            />
          ))}
        </View>
      </View>

      {/* Pending Invitations */}
      {pendingMembers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Pending Invitations
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.countText, { color: colors.mutedForeground }]}>
                {pendingMembers.length}
              </Text>
            </View>
          </View>
          <View style={styles.membersList}>
            {pendingMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                isCurrentUser={false}
                isAdmin={isAdmin}
                onRemove={() => handleRemoveMember(member)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  membersList: {
    gap: 8,
  },
});
