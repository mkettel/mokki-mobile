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
import { useAuth } from "@/lib/context/auth";
import { useHouse } from "@/lib/context/house";
import { getHouseMembers } from "@/lib/api/members";
import type { Profile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";

interface MemberPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectMember: (member: Profile) => void;
}

export function MemberPicker({
  visible,
  onClose,
  onSelectMember,
}: MemberPickerProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { activeHouse } = useHouse();
  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible && activeHouse?.id) {
      loadMembers();
    }
  }, [visible, activeHouse?.id]);

  const loadMembers = async () => {
    if (!activeHouse?.id) return;

    setIsLoading(true);
    const { members: houseMembers, error } = await getHouseMembers(activeHouse.id);

    if (!error && houseMembers) {
      // Filter out current user
      const otherMembers = houseMembers
        .filter((m) => m.user_id !== user?.id && m.profiles)
        .map((m) => m.profiles as Profile);
      setMembers(otherMembers);
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

    return (
      <TouchableOpacity
        style={[styles.memberItem, { borderBottomColor: colors.border }]}
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
          No other members in this house
        </Text>
      </View>
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
            New Message
          </Text>
          <View style={styles.closeButton} />
        </View>

        {/* Member List */}
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            members.length === 0 && styles.emptyListContent,
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
  },
  emptyText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
  },
});
