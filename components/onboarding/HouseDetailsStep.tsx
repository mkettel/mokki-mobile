import { typography } from "@/constants/theme";
import { useColors } from "@/lib/context/theme";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface HouseDetailsStepProps {
  houseName: string;
  onHouseNameChange: (name: string) => void;
  tripStartDate: Date | null;
  onTripStartDateChange: (date: Date | null) => void;
  tripEndDate: Date | null;
  onTripEndDateChange: (date: Date | null) => void;
  showTripDates: boolean;
}

export function HouseDetailsStep({
  houseName,
  onHouseNameChange,
  tripStartDate,
  onTripStartDateChange,
  tripEndDate,
  onTripEndDateChange,
  showTripDates,
}: HouseDetailsStepProps) {
  const colors = useColors();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return "Select date...";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        House details
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Give your house a name that everyone will recognize.
      </Text>

      {/* House Name */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.foreground }]}>
          House Name
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          value={houseName}
          onChangeText={onHouseNameChange}
          placeholder="e.g., Powder Palace"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {/* Trip Dates (conditional) */}
      {showTripDates && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Trip Dates (optional)
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            Set dates to show a countdown on the home screen.
          </Text>

          {/* Start Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Start Date
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setShowStartPicker(true)}
            >
              <FontAwesome name="calendar" size={16} color={colors.foreground} />
              <Text
                style={[
                  styles.dateText,
                  {
                    color: tripStartDate ? colors.foreground : colors.mutedForeground,
                  },
                ]}
              >
                {formatDate(tripStartDate)}
              </Text>
              {tripStartDate && (
                <TouchableOpacity
                  onPress={() => onTripStartDateChange(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <FontAwesome name="times" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {(showStartPicker || Platform.OS === "ios") && Platform.OS !== "web" && (
              <DateTimePicker
                value={tripStartDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowStartPicker(false);
                  if (date) onTripStartDateChange(date);
                }}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
          </View>

          {/* End Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              End Date
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setShowEndPicker(true)}
            >
              <FontAwesome name="calendar" size={16} color={colors.foreground} />
              <Text
                style={[
                  styles.dateText,
                  {
                    color: tripEndDate ? colors.foreground : colors.mutedForeground,
                  },
                ]}
              >
                {formatDate(tripEndDate)}
              </Text>
              {tripEndDate && (
                <TouchableOpacity
                  onPress={() => onTripEndDateChange(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <FontAwesome name="times" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            {(showEndPicker || Platform.OS === "ios") && Platform.OS !== "web" && (
              <DateTimePicker
                value={tripEndDate || tripStartDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  setShowEndPicker(false);
                  if (date) onTripEndDateChange(date);
                }}
                minimumDate={tripStartDate || undefined}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 24,
    lineHeight: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 16,
    lineHeight: 20,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
  },
  iosPicker: {
    height: 150,
    marginTop: 8,
  },
});
