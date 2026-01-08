import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import { getHouseMembers } from "@/lib/api/members";
import { getEligibleCoClaimers } from "@/lib/api/bedSignups";
import type { Profile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";

interface CoBookerPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectMember: (member: Profile) => void;
  onClear?: () => void;
  selectedMember?: Profile | null;
  houseId: string;
  excludeUserId: string;
  signupWindowId?: string; // If provided, filters out users with existing claims
}

export function CoBookerPicker({
  visible,
  onClose,
  onSelectMember,
  onClear,
  selectedMember,
  houseId,
  excludeUserId,
  signupWindowId,
}: CoBookerPickerProps) {
  const colors = useColors();
  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible && houseId) {
      loadMembers();
    }
  }, [visible, houseId, signupWindowId]);

  const loadMembers = async () => {
    if (!houseId) return;

    setIsLoading(true);

    // If we have a signup window, use the specialized function that filters out claimers
    if (signupWindowId) {
      const { members: eligibleMembers, error } = await getEligibleCoClaimers(
        houseId,
        signupWindowId,
        excludeUserId
      );

      if (!error) {
        setMembers(eligibleMembers);
      }
    } else {
      // Otherwise just get all house members (excluding current user)
      const { members: houseMembers, error } = await getHouseMembers(houseId);

      if (!error && houseMembers) {
        const otherMembers = houseMembers
          .filter((m) => m.user_id !== excludeUserId && m.profiles)
          .map((m) => m.profiles as Profile);
        setMembers(otherMembers);
      }
    }

    setIsLoading(false);
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

  const renderMember = ({ item }: { item: Profile }) => {
    const displayName = item.display_name || item.email;
    const avatarUrl = item.avatar_url;
    const isSelected = selectedMember?.id === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.memberItem,
          { borderBottomColor: colors.border },
          isSelected && { backgroundColor: colors.primary + "15" },
        ]}
        onPress={() => {
          onSelectMember(item);
          onClose();
        }}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View
            style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}
          >
            <Text
              style={[styles.avatarInitials, { color: colors.mutedForeground }]}
            >
              {getInitials(displayName)}
            </Text>
          </View>
        )}

        {/* Name */}
        <View style={styles.nameContainer}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {displayName}
          </Text>
          {item.tagline && (
            <Text
              style={[styles.tagline, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {item.tagline}
            </Text>
          )}
        </View>

        {/* Selected indicator */}
        {isSelected && (
          <FontAwesome name="check" size={16} color={colors.primary} />
        )}
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
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {signupWindowId
            ? "No available members (others may already have bed claims)"
            : "No other members in this house"}
        </Text>
      </View>
    );
  };

  const renderHeader = () => {
    if (!selectedMember || !onClear) return null;

    return (
      <TouchableOpacity
        style={[styles.clearOption, { borderBottomColor: colors.border }]}
        onPress={() => {
          onClear();
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.clearIcon, { backgroundColor: colors.muted }]}>
          <FontAwesome name="user-times" size={16} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.clearText, { color: colors.destructive }]}>
          Remove Co-Booker
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Select Co-Booker
          </Text>
          <View style={styles.closeButton} />
        </View>

        {/* Member List */}
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            members.length === 0 && !selectedMember && styles.emptyListContent,
          ]}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  clearOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  clearIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  clearText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarInitials: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  tagline: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
});
