import { typography } from "@/constants/theme";
import { EXPENSE_CATEGORIES, formatAmount } from "@/lib/api/expenses";
import { useColors } from "@/lib/context/theme";
import type { ExpenseCategory, Profile } from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ReceiptPicker, type ReceiptFile } from "./ReceiptPicker";

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    amount: number;
    description?: string;
    category: ExpenseCategory;
    date: string;
    splits: { userId: string; amount: number }[];
    receipt?: ReceiptFile;
  }) => Promise<void>;
  members: Profile[];
  currentUserId: string;
}

type SplitMode = "even" | "custom";

export function AddExpenseModal({
  visible,
  onClose,
  onSubmit,
  members,
  currentUserId,
}: AddExpenseModalProps) {
  const colors = useColors();
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Split state
  const [splitMode, setSplitMode] = useState<SplitMode>("even");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    {}
  );

  // Receipt state
  const [receipt, setReceipt] = useState<ReceiptFile | null>(null);

  // Filter out current user from members list
  const otherMembers = useMemo(
    () => members.filter((m) => m.id !== currentUserId),
    [members, currentUserId]
  );

  const amount = parseFloat(amountStr) || 0;

  // Calculate splits
  const calculatedSplits = useMemo(() => {
    if (selectedMembers.length === 0 || amount === 0) {
      return [];
    }

    if (splitMode === "even") {
      const perPerson = formatAmount(amount / selectedMembers.length);
      const remainder = formatAmount(
        amount - perPerson * selectedMembers.length
      );

      return selectedMembers.map((userId, index) => ({
        userId,
        amount: index === 0 ? formatAmount(perPerson + remainder) : perPerson,
      }));
    } else {
      return selectedMembers.map((userId) => ({
        userId,
        amount: parseFloat(customAmounts[userId] || "0") || 0,
      }));
    }
  }, [selectedMembers, amount, splitMode, customAmounts]);

  const splitsTotal = calculatedSplits.reduce((sum, s) => sum + s.amount, 0);
  const isBalanced = Math.abs(splitsTotal - amount) < 0.01;

  const resetForm = () => {
    setTitle("");
    setAmountStr("");
    setDescription("");
    setCategory("other");
    setDate(new Date());
    setSplitMode("even");
    setSelectedMembers([]);
    setCustomAmounts({});
    setReceipt(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Please enter an expense title");
      return;
    }

    if (amount <= 0) {
      Alert.alert("Required", "Please enter a valid amount");
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert(
        "Required",
        "Please select at least one member to split with"
      );
      return;
    }

    if (!isBalanced) {
      Alert.alert(
        "Invalid Splits",
        "Split amounts must equal the total expense amount"
      );
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        amount,
        description: description.trim() || undefined,
        category,
        date: date.toISOString().split("T")[0],
        splits: calculatedSplits,
        receipt: receipt || undefined,
      });
      handleClose();
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  const selectAllMembers = () => {
    setSelectedMembers(otherMembers.map((m) => m.id));
  };

  const selectNoneMembers = () => {
    setSelectedMembers([]);
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDisplayName = (profile: Profile) => {
    return profile.display_name || profile.email.split("@")[0];
  };

  const getInitial = (profile: Profile) => {
    const name = getDisplayName(profile);
    return name.charAt(0).toUpperCase();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Add Expense
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Title *
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="What was this expense for?"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Amount *
            </Text>
            <View
              style={[
                styles.amountContainer,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.dollarSign, { color: colors.mutedForeground }]}
              >
                $
              </Text>
              <TextInput
                style={[styles.amountInput, { color: colors.foreground }]}
                value={amountStr}
                onChangeText={setAmountStr}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Category
            </Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text
                style={[styles.selectButtonText, { color: colors.foreground }]}
              >
                {EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ||
                  "Other"}
              </Text>
              <FontAwesome
                name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                size={12}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
            {showCategoryPicker && (
              <View
                style={[
                  styles.pickerDropdown,
                  { backgroundColor: colors.card },
                ]}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.pickerOption,
                      category === cat.value && {
                        backgroundColor: colors.muted,
                      },
                    ]}
                    onPress={() => {
                      setCategory(cat.value);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: cat.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: colors.foreground },
                      ]}
                    >
                      {cat.label}
                    </Text>
                    {category === cat.value && (
                      <FontAwesome
                        name="check"
                        size={14}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Date
            </Text>
            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome
                name="calendar"
                size={14}
                color={colors.mutedForeground}
              />
              <Text
                style={[
                  styles.selectButtonText,
                  { color: colors.foreground, flex: 1 },
                ]}
              >
                {formatDate(date)}
              </Text>
            </TouchableOpacity>
            {(showDatePicker || Platform.OS === "ios") && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, d) => {
                  setShowDatePicker(false);
                  if (d) setDate(d);
                }}
                style={Platform.OS === "ios" ? styles.iosPicker : undefined}
              />
            )}
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Description (optional)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add more details..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          {/* Receipt */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Receipt (optional)
            </Text>
            <ReceiptPicker value={receipt} onChange={setReceipt} />
          </View>

          {/* Split Section */}
          <View style={styles.field}>
            <View style={styles.splitHeader}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Split With *
              </Text>
              <View style={styles.splitModeToggle}>
                <TouchableOpacity
                  style={[
                    styles.splitModeButton,
                    splitMode === "even" && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setSplitMode("even")}
                >
                  <Text
                    style={[
                      styles.splitModeText,
                      {
                        color:
                          splitMode === "even"
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    Even
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.splitModeButton,
                    splitMode === "custom" && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => setSplitMode("custom")}
                >
                  <Text
                    style={[
                      styles.splitModeText,
                      {
                        color:
                          splitMode === "custom"
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick select buttons */}
            <View style={styles.quickSelectRow}>
              <TouchableOpacity onPress={selectAllMembers}>
                <Text
                  style={[styles.quickSelectText, { color: colors.primary }]}
                >
                  Select All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={selectNoneMembers}>
                <Text
                  style={[styles.quickSelectText, { color: colors.primary }]}
                >
                  Select None
                </Text>
              </TouchableOpacity>
            </View>

            {/* Members list */}
            <View style={styles.membersList}>
              {otherMembers.map((member) => {
                const isSelected = selectedMembers.includes(member.id);
                const splitAmount = calculatedSplits.find(
                  (s) => s.userId === member.id
                )?.amount;

                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.memberRow,
                      {
                        backgroundColor: isSelected
                          ? colors.muted
                          : "transparent",
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => toggleMember(member.id)}
                  >
                    <View style={styles.memberLeft}>
                      <View
                        style={[
                          styles.memberCheckbox,
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
                          <FontAwesome name="check" size={10} color="#fff" />
                        )}
                      </View>
                      <View
                        style={[
                          styles.memberAvatar,
                          { backgroundColor: colors.muted },
                        ]}
                      >
                        <Text
                          style={[
                            styles.memberAvatarText,
                            { color: colors.foreground },
                          ]}
                        >
                          {getInitial(member)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.memberName,
                          { color: colors.foreground },
                        ]}
                      >
                        {getDisplayName(member)}
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={styles.memberRight}>
                        {splitMode === "custom" ? (
                          <View
                            style={[
                              styles.customAmountInput,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dollarSignSmall,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              $
                            </Text>
                            <TextInput
                              style={[
                                styles.customInput,
                                { color: colors.foreground },
                              ]}
                              value={customAmounts[member.id] || ""}
                              onChangeText={(val) =>
                                setCustomAmounts({
                                  ...customAmounts,
                                  [member.id]: val,
                                })
                              }
                              placeholder="0.00"
                              placeholderTextColor={colors.mutedForeground}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.splitAmountText,
                              { color: colors.foreground },
                            ]}
                          >
                            ${splitAmount?.toFixed(2) || "0.00"}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Split total */}
            {selectedMembers.length > 0 && (
              <View
                style={[
                  styles.splitTotalRow,
                  {
                    backgroundColor: isBalanced ? "#f0fdf4" : "#fef2f2",
                    borderColor: isBalanced ? "#16a34a" : "#dc2626",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.splitTotalLabel,
                    { color: isBalanced ? "#166534" : "#991b1b" },
                  ]}
                >
                  Split Total: ${splitsTotal.toFixed(2)}
                </Text>
                {!isBalanced && (
                  <Text style={[styles.splitTotalDiff, { color: "#991b1b" }]}>
                    {splitsTotal > amount ? "Over" : "Under"} by $
                    {Math.abs(splitsTotal - amount).toFixed(2)}
                  </Text>
                )}
                {isBalanced && (
                  <FontAwesome name="check-circle" size={16} color="#16a34a" />
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              (isLoading || !isBalanced || selectedMembers.length === 0) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading || !isBalanced || selectedMembers.length === 0}
          >
            <Text
              style={[
                styles.submitButtonText,
                { color: colors.primaryForeground },
              ]}
            >
              {isLoading ? "Adding..." : "Add Expense"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
    marginBottom: 8,
  },
  textInput: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
  },
  textArea: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
    minHeight: 60,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  dollarSign: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  selectButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillax,
  },
  pickerDropdown: {
    marginTop: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iosPicker: {
    height: 120,
    marginTop: -8,
  },
  splitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  splitModeToggle: {
    flexDirection: "row",
    borderRadius: 6,
    overflow: "hidden",
  },
  splitModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  splitModeText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  quickSelectRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  quickSelectText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  membersList: {
    gap: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  memberLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  memberName: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
  },
  memberRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  splitAmountText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  customAmountInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    width: 80,
  },
  dollarSignSmall: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
  },
  customInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "right",
  },
  splitTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  splitTotalLabel: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  splitTotalDiff: {
    fontSize: 12,
    fontFamily: typography.fontFamily.chillax,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
});
