import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useColors } from "@/lib/context/theme";
import { typography } from "@/constants/theme";
import type { StayWithExpense } from "@/lib/api/stays";

interface StayDetailModalProps {
  visible: boolean;
  stay: StayWithExpense | null;
  currentUserId: string;
  onClose: () => void;
  onEdit: (stay: StayWithExpense) => void;
  onDelete: (stay: StayWithExpense) => void;
}

type StayStatus = "current" | "today" | "upcoming" | "past";

function getStayStatus(stay: StayWithExpense): StayStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkIn = new Date(stay.check_in);
  checkIn.setHours(0, 0, 0, 0);

  const checkOut = new Date(stay.check_out);
  checkOut.setHours(0, 0, 0, 0);

  if (checkIn.getTime() === today.getTime()) {
    return "today";
  }
  if (checkIn <= today && checkOut >= today) {
    return "current";
  }
  if (checkIn > today) {
    return "upcoming";
  }
  return "past";
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

function calculateNights(checkIn: string, checkOut: string): number {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffTime = outDate.getTime() - inDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function StayDetailModal({
  visible,
  stay,
  currentUserId,
  onClose,
  onEdit,
  onDelete,
}: StayDetailModalProps) {
  const colors = useColors();

  if (!stay) return null;

  const isCreator = currentUserId === stay.user_id;
  const status = getStayStatus(stay);
  const isPast = status === "past";
  const canEdit = isCreator && !isPast;
  const canDelete = isCreator && !isPast;
  const nights = calculateNights(stay.check_in, stay.check_out);

  const getDisplayName = () => {
    const profile = stay.profiles;
    return profile.display_name || profile.email.split("@")[0];
  };

  const getInitial = () => {
    const profile = stay.profiles;
    const name = profile.display_name || profile.email;
    return name.charAt(0).toUpperCase();
  };

  const getStatusBadge = () => {
    const configs = {
      current: { bg: colors.primary, text: "#fff", label: "Current" },
      today: { bg: "#22c55e", text: "#fff", label: "Today" },
      upcoming: { bg: colors.muted, text: colors.foreground, label: "Upcoming" },
      past: { bg: colors.muted, text: colors.mutedForeground, label: "Past" },
    };
    return configs[status];
  };

  const statusConfig = getStatusBadge();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Stay Details
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Name Section with Avatar */}
          <View style={styles.nameSection}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {getInitial()}
              </Text>
            </View>
            <View style={styles.nameInfo}>
              <Text style={[styles.stayName, { color: colors.foreground }]}>
                {getDisplayName()}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Check-in */}
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <FontAwesome name="sign-in" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
              Check-in
            </Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatDate(stay.check_in)}
            </Text>
          </View>

          {/* Check-out */}
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <FontAwesome name="sign-out" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
              Check-out
            </Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatDate(stay.check_out)}
            </Text>
          </View>

          {/* Nights */}
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <FontAwesome name="moon-o" size={16} color={colors.mutedForeground} />
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
              Nights
            </Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {nights} night{nights !== 1 ? "s" : ""}
            </Text>
          </View>

          {/* Guests */}
          {stay.guest_count > 0 && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <FontAwesome name="users" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                Guests
              </Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {stay.guest_count} guest{stay.guest_count !== 1 ? "s" : ""}
              </Text>
            </View>
          )}

          {/* Bed Assignment */}
          {stay.bedSignup ? (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <FontAwesome name="bed" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                Bed
              </Text>
              <View style={styles.bedInfoContainer}>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>
                  {stay.bedSignup.bedName}
                </Text>
                <Text style={[styles.bedSubtext, { color: colors.mutedForeground }]}>
                  {stay.bedSignup.roomName}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <FontAwesome name="bed" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>
                Bed
              </Text>
              <Text style={[styles.infoValue, { color: colors.mutedForeground, fontStyle: "italic" }]}>
                Not assigned
              </Text>
            </View>
          )}

          {/* Notes */}
          {stay.notes && (
            <View style={styles.notesSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Notes
              </Text>
              <Text style={[styles.notesText, { color: colors.mutedForeground }]}>
                {stay.notes}
              </Text>
            </View>
          )}

          {/* Guest Fee Info */}
          {stay.linkedExpense && (
            <View style={styles.guestFeeSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Guest Fee
              </Text>
              <View style={[styles.guestFeeCard, { backgroundColor: colors.muted }]}>
                <View style={styles.guestFeeRow}>
                  <View style={styles.feeInfo}>
                    <FontAwesome name="dollar" size={14} color={colors.foreground} />
                    <Text style={[styles.feeAmount, { color: colors.foreground }]}>
                      {stay.linkedExpense.amount.toFixed(0)}
                    </Text>
                  </View>
                  {stay.linkedExpense.split && (
                    <View
                      style={[
                        styles.paidBadge,
                        {
                          backgroundColor: stay.linkedExpense.split.settled
                            ? "#dcfce7"
                            : "#fef3c7",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paidText,
                          {
                            color: stay.linkedExpense.split.settled
                              ? "#166534"
                              : "#92400e",
                          },
                        ]}
                      >
                        {stay.linkedExpense.split.settled ? "Paid" : "Unpaid"}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.feeBreakdown, { color: colors.mutedForeground }]}>
                  {stay.guest_count} guest{stay.guest_count !== 1 ? "s" : ""} × {nights} night{nights !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons - Only shown for creator of non-past stays */}
        {(canEdit || canDelete) && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {canEdit && (
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  onClose();
                  onEdit(stay);
                }}
              >
                <FontAwesome name="pencil" size={16} color={colors.primaryForeground} />
                <Text style={[styles.editButtonText, { color: colors.primaryForeground }]}>
                  Edit Stay
                </Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                style={[styles.deleteButton, { borderColor: colors.destructive }]}
                onPress={() => {
                  onClose();
                  onDelete(stay);
                }}
              >
                <FontAwesome name="trash-o" size={16} color={colors.destructive} />
                <Text style={[styles.deleteButtonText, { color: colors.destructive }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  nameSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontFamily: typography.fontFamily.chillaxBold,
  },
  nameInfo: {
    flex: 1,
    marginLeft: 16,
  },
  stayName: {
    fontSize: 22,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    textAlign: "right",
  },
  bedInfoContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  bedSubtext: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  notesSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    lineHeight: 22,
  },
  guestFeeSection: {
    marginTop: 24,
  },
  guestFeeCard: {
    padding: 16,
    borderRadius: 12,
  },
  guestFeeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  feeAmount: {
    fontSize: 20,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  paidBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  feeBreakdown: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 20,
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
