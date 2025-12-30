import { GeometricBackground } from "@/components/GeometricBackground";
import { TopBar } from "@/components/TopBar";
import { typography } from "@/constants/theme";
import { getRoomsAndBeds } from "@/lib/api/bedSignups";
import {
  createBed,
  createRoom,
  deleteBed,
  deleteRoom,
  updateBed,
  updateRoom,
  BED_TYPES,
  ROOM_TYPES,
} from "@/lib/api/rooms";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import type { Bed, BedType, Room, RoomType, RoomWithBeds } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// ============================================
// Add/Edit Room Modal
// ============================================

interface RoomModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, roomType: RoomType) => Promise<void>;
  initialName?: string;
  initialRoomType?: RoomType;
  isEditing?: boolean;
}

function RoomModal({
  visible,
  onClose,
  onSave,
  initialName = "",
  initialRoomType = "bedroom",
  isEditing = false,
}: RoomModalProps) {
  const colors = useColors();
  const [name, setName] = useState(initialName);
  const [roomType, setRoomType] = useState<RoomType>(initialRoomType);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setRoomType(initialRoomType);
    }
  }, [visible, initialName, initialRoomType]);

  const handleSave = async () => {
    if (!name.trim()) {
      const message = "Please enter a room name";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
      return;
    }

    setIsSaving(true);
    try {
      await onSave(name.trim(), roomType);
      onClose();
    } catch (error) {
      const message = "Failed to save room";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    }
    setIsSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {isEditing ? "Edit Room" : "Add Room"}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <FontAwesome name="times" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                  Room Name
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Master Bedroom"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.foreground, marginTop: 16 },
                  ]}
                >
                  Room Type
                </Text>
                <View style={styles.typeOptions}>
                  {ROOM_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        {
                          backgroundColor:
                            roomType === type.value
                              ? colors.primary + "20"
                              : colors.background,
                          borderColor:
                            roomType === type.value ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setRoomType(type.value)}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          {
                            color:
                              roomType === type.value
                                ? colors.primary
                                : colors.foreground,
                          },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={onClose}
                  disabled={isSaving}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text
                      style={[styles.saveButtonText, { color: colors.primaryForeground }]}
                    >
                      {isEditing ? "Save" : "Add Room"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ============================================
// Add/Edit Bed Modal
// ============================================

interface BedModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, bedType: BedType, isPremium: boolean) => Promise<void>;
  initialName?: string;
  initialBedType?: BedType;
  initialIsPremium?: boolean;
  isEditing?: boolean;
}

function BedModal({
  visible,
  onClose,
  onSave,
  initialName = "",
  initialBedType = "twin",
  initialIsPremium = false,
  isEditing = false,
}: BedModalProps) {
  const colors = useColors();
  const [name, setName] = useState(initialName);
  const [bedType, setBedType] = useState<BedType>(initialBedType);
  const [isPremium, setIsPremium] = useState(initialIsPremium);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setBedType(initialBedType);
      setIsPremium(initialIsPremium);
    }
  }, [visible, initialName, initialBedType, initialIsPremium]);

  const handleSave = async () => {
    if (!name.trim()) {
      const message = "Please enter a bed name";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
      return;
    }

    setIsSaving(true);
    try {
      await onSave(name.trim(), bedType, isPremium);
      onClose();
    } catch (error) {
      const message = "Failed to save bed";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Error", message);
      }
    }
    setIsSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {isEditing ? "Edit Bed" : "Add Bed"}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <FontAwesome name="times" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                  Bed Name
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Top Left Bunk"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.foreground, marginTop: 16 },
                  ]}
                >
                  Bed Type
                </Text>
                <View style={styles.typeOptions}>
                  {BED_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        {
                          backgroundColor:
                            bedType === type.value
                              ? colors.primary + "20"
                              : colors.background,
                          borderColor:
                            bedType === type.value ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setBedType(type.value)}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          {
                            color:
                              bedType === type.value
                                ? colors.primary
                                : colors.foreground,
                          },
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.premiumToggle,
                    {
                      backgroundColor: isPremium
                        ? colors.primary + "20"
                        : colors.background,
                      borderColor: isPremium ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setIsPremium(!isPremium)}
                >
                  <FontAwesome
                    name={isPremium ? "star" : "star-o"}
                    size={16}
                    color={isPremium ? colors.primary : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.premiumToggleText,
                      { color: isPremium ? colors.primary : colors.foreground },
                    ]}
                  >
                    Premium Bed
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.premiumHint, { color: colors.mutedForeground }]}>
                  Premium beds are highlighted for tracking purposes
                </Text>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={onClose}
                  disabled={isSaving}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                  ) : (
                    <Text
                      style={[styles.saveButtonText, { color: colors.primaryForeground }]}
                    >
                      {isEditing ? "Save" : "Add Bed"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ============================================
// Room Card Component
// ============================================

interface RoomCardProps {
  room: RoomWithBeds;
  onEditRoom: () => void;
  onDeleteRoom: () => void;
  onAddBed: () => void;
  onEditBed: (bed: Bed) => void;
  onDeleteBed: (bed: Bed) => void;
}

function RoomCard({
  room,
  onEditRoom,
  onDeleteRoom,
  onAddBed,
  onEditBed,
  onDeleteBed,
}: RoomCardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.roomCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleRow}>
          <FontAwesome
            name={room.room_type === "bunk_room" ? "th-large" : "home"}
            size={16}
            color={colors.foreground}
          />
          <Text style={[styles.roomName, { color: colors.foreground }]}>
            {room.name}
          </Text>
          <View
            style={[styles.roomTypeBadge, { backgroundColor: colors.muted }]}
          >
            <Text style={[styles.roomTypeBadgeText, { color: colors.foreground }]}>
              {room.room_type === "bunk_room" ? "Bunk Room" : "Bedroom"}
            </Text>
          </View>
        </View>
        <View style={styles.roomActions}>
          <TouchableOpacity onPress={onEditRoom} style={styles.iconButton}>
            <FontAwesome name="pencil" size={14} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDeleteRoom} style={styles.iconButton}>
            <FontAwesome name="trash-o" size={14} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bedsList}>
        {room.beds.length === 0 ? (
          <Text style={[styles.noBeds, { color: colors.mutedForeground }]}>
            No beds added yet
          </Text>
        ) : (
          room.beds.map((bed) => (
            <View
              key={bed.id}
              style={[styles.bedItem, { borderColor: colors.border }]}
            >
              <View style={styles.bedInfo}>
                {bed.is_premium && (
                  <FontAwesome
                    name="star"
                    size={12}
                    color={colors.primary}
                    style={styles.premiumIcon}
                  />
                )}
                <Text style={[styles.bedName, { color: colors.foreground }]}>
                  {bed.name}
                </Text>
                <View
                  style={[styles.bedTypeBadge, { backgroundColor: colors.muted }]}
                >
                  <Text
                    style={[styles.bedTypeBadgeText, { color: colors.foreground }]}
                  >
                    {bed.bed_type}
                  </Text>
                </View>
              </View>
              <View style={styles.bedActions}>
                <TouchableOpacity
                  onPress={() => onEditBed(bed)}
                  style={styles.smallIconButton}
                >
                  <FontAwesome name="pencil" size={12} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onDeleteBed(bed)}
                  style={styles.smallIconButton}
                >
                  <FontAwesome name="trash-o" size={12} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        style={[styles.addBedButton, { borderColor: colors.border }]}
        onPress={onAddBed}
      >
        <FontAwesome name="plus" size={12} color={colors.primary} />
        <Text style={[styles.addBedButtonText, { color: colors.primary }]}>
          Add Bed
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// Main Screen
// ============================================

export default function RoomConfigurationScreen() {
  const colors = useColors();
  const router = useRouter();
  const { activeHouse } = useHouse();

  const [rooms, setRooms] = useState<RoomWithBeds[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Room modal state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Bed modal state
  const [showBedModal, setShowBedModal] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [selectedRoomForBed, setSelectedRoomForBed] = useState<Room | null>(null);

  const fetchRooms = useCallback(async () => {
    if (!activeHouse?.id) return;

    const { rooms: fetchedRooms, error } = await getRoomsAndBeds(activeHouse.id);
    if (!error) {
      setRooms(fetchedRooms);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, [activeHouse?.id]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleAddRoom = () => {
    setEditingRoom(null);
    setShowRoomModal(true);
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setShowRoomModal(true);
  };

  const handleDeleteRoom = (room: Room) => {
    const message = `Delete "${room.name}"? This will also delete all beds in this room.`;

    const doDelete = async () => {
      const { error } = await deleteRoom(room.id);
      if (error) {
        const errorMessage = "Failed to delete room";
        if (Platform.OS === "web") {
          window.alert(errorMessage);
        } else {
          Alert.alert("Error", errorMessage);
        }
      } else {
        fetchRooms();
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        doDelete();
      }
    } else {
      Alert.alert("Delete Room", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: doDelete, style: "destructive" },
      ]);
    }
  };

  const handleSaveRoom = async (name: string, roomType: RoomType) => {
    if (!activeHouse?.id) return;

    if (editingRoom) {
      const { error } = await updateRoom(editingRoom.id, { name, roomType });
      if (error) throw error;
    } else {
      const { error } = await createRoom(activeHouse.id, { name, roomType });
      if (error) throw error;
    }

    await fetchRooms();
  };

  const handleAddBed = (room: Room) => {
    setEditingBed(null);
    setSelectedRoomForBed(room);
    setShowBedModal(true);
  };

  const handleEditBed = (bed: Bed) => {
    setEditingBed(bed);
    setSelectedRoomForBed(null); // We have the bed, we know its room
    setShowBedModal(true);
  };

  const handleDeleteBed = (bed: Bed) => {
    const message = `Delete "${bed.name}"?`;

    const doDelete = async () => {
      const { error } = await deleteBed(bed.id);
      if (error) {
        const errorMessage = "Failed to delete bed";
        if (Platform.OS === "web") {
          window.alert(errorMessage);
        } else {
          Alert.alert("Error", errorMessage);
        }
      } else {
        fetchRooms();
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        doDelete();
      }
    } else {
      Alert.alert("Delete Bed", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: doDelete, style: "destructive" },
      ]);
    }
  };

  const handleSaveBed = async (
    name: string,
    bedType: BedType,
    isPremium: boolean
  ) => {
    if (!activeHouse?.id) return;

    if (editingBed) {
      const { error } = await updateBed(editingBed.id, { name, bedType, isPremium });
      if (error) throw error;
    } else if (selectedRoomForBed) {
      const { error } = await createBed(selectedRoomForBed.id, activeHouse.id, {
        name,
        bedType,
        isPremium,
      });
      if (error) throw error;
    }

    await fetchRooms();
  };

  const totalBeds = rooms.reduce((sum, room) => sum + room.beds.length, 0);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.foreground} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GeometricBackground />
      <TopBar />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <FontAwesome name="chevron-left" size={18} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Room Configuration
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {rooms.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              {rooms.length === 1 ? "Room" : "Rooms"}
            </Text>
          </View>
          <View
            style={[styles.summaryDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {totalBeds}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              {totalBeds === 1 ? "Bed" : "Beds"}
            </Text>
          </View>
        </View>

        {/* Rooms List */}
        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="bed" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No Rooms Yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add rooms and beds to enable bed sign-up for your house.
            </Text>
          </View>
        ) : (
          <View style={styles.roomsList}>
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onEditRoom={() => handleEditRoom(room)}
                onDeleteRoom={() => handleDeleteRoom(room)}
                onAddBed={() => handleAddBed(room)}
                onEditBed={handleEditBed}
                onDeleteBed={handleDeleteBed}
              />
            ))}
          </View>
        )}

        {/* Add Room Button */}
        <TouchableOpacity
          style={[styles.addRoomButton, { backgroundColor: colors.primary }]}
          onPress={handleAddRoom}
        >
          <FontAwesome name="plus" size={16} color={colors.primaryForeground} />
          <Text
            style={[styles.addRoomButtonText, { color: colors.primaryForeground }]}
          >
            Add Room
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Room Modal */}
      <RoomModal
        visible={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        onSave={handleSaveRoom}
        initialName={editingRoom?.name}
        initialRoomType={editingRoom?.room_type}
        isEditing={!!editingRoom}
      />

      {/* Bed Modal */}
      <BedModal
        visible={showBedModal}
        onClose={() => {
          setShowBedModal(false);
          setSelectedRoomForBed(null);
          setEditingBed(null);
        }}
        onSave={handleSaveBed}
        initialName={editingBed?.name}
        initialBedType={editingBed?.bed_type}
        initialIsPremium={editingBed?.is_premium}
        isEditing={!!editingBed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  summaryValue: {
    fontSize: 28,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 280,
  },
  roomsList: {
    gap: 16,
  },
  roomCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roomTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  roomTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roomTypeBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.chillaxMedium,
    textTransform: "uppercase",
  },
  roomActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  smallIconButton: {
    padding: 6,
  },
  bedsList: {
    gap: 8,
  },
  noBeds: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  bedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  bedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  premiumIcon: {
    marginRight: 2,
  },
  bedName: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  bedTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bedTypeBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.chillax,
    textTransform: "capitalize",
  },
  bedActions: {
    flexDirection: "row",
    gap: 4,
  },
  addBedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  addBedButtonText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  addRoomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  addRoomButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeOptionText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  premiumToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  premiumToggleText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  premiumHint: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
