import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import { getAllResorts } from "@/lib/api/weather";
import type { Resort } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ResortPickerModalProps {
  visible: boolean;
  selectedResortIds: string[];
  onClose: () => void;
  onSave: (resortIds: string[]) => Promise<void>;
}

export function ResortPickerModal({
  visible,
  selectedResortIds,
  onClose,
  onSave,
}: ResortPickerModalProps) {
  const colors = useColors();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all resorts when modal opens
  useEffect(() => {
    if (visible) {
      setSelected(new Set(selectedResortIds));
      fetchResorts();
    }
  }, [visible, selectedResortIds]);

  const fetchResorts = async () => {
    setIsLoading(true);
    const { resorts: allResorts, error } = await getAllResorts();
    if (!error) {
      setResorts(allResorts);
    }
    setIsLoading(false);
  };

  const toggleResort = (resortId: string) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resortId)) {
        newSet.delete(resortId);
      } else {
        newSet.add(resortId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(Array.from(selected));
      onClose();
    } catch (error) {
      console.error("Error saving resorts:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => {
    if (selected.size !== selectedResortIds.length) return true;
    return !selectedResortIds.every((id) => selected.has(id));
  };

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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Manage Resorts
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !hasChanges()}
            style={[
              styles.saveButton,
              {
                backgroundColor: hasChanges() ? colors.primary : colors.muted,
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={[
                  styles.saveButtonText,
                  { opacity: hasChanges() ? 1 : 0.5 },
                ]}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={styles.description}>
          <Text style={[styles.descriptionText, { color: colors.mutedForeground }]}>
            Select the resorts you want to track weather and snow reports for.
          </Text>
        </View>

        {/* Resort list */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.foreground} />
          </View>
        ) : resorts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="map-marker" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No resorts available
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {resorts.map((resort) => {
              const isSelected = selected.has(resort.id);
              return (
                <TouchableOpacity
                  key={resort.id}
                  style={[
                    styles.resortItem,
                    {
                      backgroundColor: isSelected
                        ? `${colors.primary}15`
                        : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => toggleResort(resort.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resortInfo}>
                    <Text
                      style={[styles.resortName, { color: colors.foreground }]}
                    >
                      {resort.name}
                    </Text>
                    {resort.elevation_summit && (
                      <Text
                        style={[
                          styles.resortElevation,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Summit: {resort.elevation_summit.toLocaleString()} ft
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : "transparent",
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    {isSelected && (
                      <FontAwesome name="check" size={12} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* Selected count */}
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {selected.size} resort{selected.size !== 1 ? "s" : ""} selected
          </Text>
        </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  description: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resortItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  resortInfo: {
    flex: 1,
    marginRight: 12,
  },
  resortName: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  resortElevation: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
});
