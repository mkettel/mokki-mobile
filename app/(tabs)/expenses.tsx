import {
  AddExpenseModal,
  BalanceDetailModal,
  BalanceList,
  EditExpenseModal,
  ExpenseList,
  ExpenseSummaryCards,
  GuestFeesList,
} from "@/components/expenses";
import type { ReceiptFile } from "@/components/expenses/ReceiptPicker";
import { GeometricBackground } from "@/components/GeometricBackground";
import { PageContainer } from "@/components/PageContainer";
import { TopBar } from "@/components/TopBar";
import { typography } from "@/constants/theme";
import {
  createExpense,
  deleteExpense,
  getExpense,
  getHouseExpenses,
  getHouseMembersForExpenses,
  getUserBalances,
  settleAllWithUser,
  settleExpenseSplit,
  unsettleExpenseSplit,
  updateExpense,
} from "@/lib/api/expenses";
import {
  removeReceiptFromExpense,
  uploadReceiptAndUpdateExpense,
} from "@/lib/api/receipts";
import {
  getHouseStays,
  settleGuestFee,
  unsettleGuestFee,
  type StayWithExpense,
} from "@/lib/api/stays";
import { getCurrentProfile, updateProfile } from "@/lib/api/profile";
import { useAuth } from "@/lib/context/auth";
import { supabase } from "@/lib/supabase/client";
import { useHouse } from "@/lib/context/house";
import { useColors } from "@/lib/context/theme";
import type {
  ExpenseBalanceData,
  ExpenseCategory,
  ExpenseWithDetails,
  HouseSettings,
  Profile,
  UserBalance,
} from "@/types/database";
import { FontAwesome } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

type TabType = "balances" | "expenses" | "guest_fees";

export default function ExpensesScreen() {
  const colors = useColors();
  const { activeHouse } = useHouse();
  const { user } = useAuth();

  // Data state
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [balanceData, setBalanceData] = useState<ExpenseBalanceData | null>(
    null
  );
  const [members, setMembers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Guest fees state
  const [guestFeeStays, setGuestFeeStays] = useState<StayWithExpense[]>([]);
  const [guestFeeRecipientId, setGuestFeeRecipientId] = useState<string | null>(
    null
  );

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("balances");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] =
    useState<ExpenseWithDetails | null>(null);
  const [showBalanceDetail, setShowBalanceDetail] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<UserBalance | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Venmo setup banner state
  const [userVenmoHandle, setUserVenmoHandle] = useState<string | null>(null);
  const [venmoInput, setVenmoInput] = useState("");
  const [isSavingVenmo, setIsSavingVenmo] = useState(false);
  const [showVenmoBanner, setShowVenmoBanner] = useState(true);
  const [showVenmoModal, setShowVenmoModal] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!activeHouse || !user) return;

    try {
      const [expensesResult, balancesResult, membersResult, staysResult] =
        await Promise.all([
          getHouseExpenses(activeHouse.id),
          getUserBalances(activeHouse.id, user.id),
          getHouseMembersForExpenses(activeHouse.id),
          getHouseStays(activeHouse.id),
        ]);

      if (expensesResult.error) {
        console.error("Error fetching expenses:", expensesResult.error);
      } else {
        setExpenses(expensesResult.expenses);
      }

      if (balancesResult.error) {
        console.error("Error fetching balances:", balancesResult.error);
      } else if (balancesResult.data) {
        setBalanceData(balancesResult.data);
      }

      if (membersResult.error) {
        console.error("Error fetching members:", membersResult.error);
      } else {
        setMembers(membersResult.members);
      }

      if (staysResult.error) {
        console.error("Error fetching stays:", staysResult.error);
      } else {
        // Filter to stays with guest fees
        const staysWithFees = staysResult.stays.filter((s) => s.linkedExpense);
        setGuestFeeStays(staysWithFees);
      }

      // Get recipient ID from house settings
      const settings = activeHouse.settings as HouseSettings | undefined;
      setGuestFeeRecipientId(settings?.guestFeeRecipient ?? null);
    } catch (error) {
      console.error("Error fetching expense data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeHouse, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscription for expenses and splits
  useEffect(() => {
    if (!activeHouse) return;

    const channel = supabase
      .channel(`expenses:${activeHouse.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
          filter: `house_id=eq.${activeHouse.id}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expense_splits",
        },
        () => {
          // Reload when splits change (settlements)
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeHouse?.id, fetchData]);

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Fetch user's Venmo handle on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const { profile } = await getCurrentProfile();
      if (profile) {
        setUserVenmoHandle(profile.venmo_handle);
      }
    };
    fetchProfile();
  }, []);

  // Save Venmo handle
  const handleSaveVenmo = async () => {
    if (!venmoInput.trim()) return;

    setIsSavingVenmo(true);
    const { profile, error } = await updateProfile({
      venmo_handle: venmoInput.trim(),
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else if (profile) {
      setUserVenmoHandle(profile.venmo_handle);
      setVenmoInput("");
      setShowVenmoBanner(false);
    }
    setIsSavingVenmo(false);
  };

  // Expense actions
  const handleAddExpense = async (data: {
    title: string;
    amount: number;
    description?: string;
    category: ExpenseCategory;
    date: string;
    splits: { userId: string; amount: number }[];
    payerShare?: number;
    receipt?: ReceiptFile;
  }) => {
    if (!activeHouse || !user) return;

    const { expense, error } = await createExpense(
      activeHouse.id,
      user.id,
      data
    );

    if (error) {
      throw error;
    }

    // If receipt was provided, upload it
    if (data.receipt && expense) {
      const { error: receiptError } = await uploadReceiptAndUpdateExpense(
        activeHouse.id,
        expense.id,
        {
          uri: data.receipt.uri,
          mimeType: data.receipt.mimeType,
          fileSize: data.receipt.fileSize,
        }
      );

      if (receiptError) {
        // Don't throw - expense was created successfully, just log receipt error
        console.error("Error uploading receipt:", receiptError);
        Alert.alert(
          "Receipt Upload Failed",
          "The expense was created, but the receipt could not be uploaded. You can add it later by editing the expense."
        );
      }
    }

    fetchData();
  };

  const handleEditExpense = async (data: {
    title: string;
    amount: number;
    description?: string;
    category: ExpenseCategory;
    date: string;
    splits: { userId: string; amount: number }[];
    receipt?: ReceiptFile;
    removeReceipt?: boolean;
  }) => {
    if (!editingExpense || !activeHouse) return;

    const { error } = await updateExpense(editingExpense.id, user!.id, data);

    if (error) {
      throw error;
    }

    // Handle receipt changes
    if (data.receipt) {
      // Upload new receipt
      const { error: receiptError } = await uploadReceiptAndUpdateExpense(
        activeHouse.id,
        editingExpense.id,
        {
          uri: data.receipt.uri,
          mimeType: data.receipt.mimeType,
          fileSize: data.receipt.fileSize,
        }
      );

      if (receiptError) {
        console.error("Error uploading receipt:", receiptError);
        Alert.alert(
          "Receipt Upload Failed",
          "The expense was updated, but the receipt could not be uploaded."
        );
      }
    } else if (data.removeReceipt && editingExpense.receipt_url) {
      // Remove existing receipt
      const { error: removeError } = await removeReceiptFromExpense(
        editingExpense.id,
        editingExpense.receipt_url
      );

      if (removeError) {
        console.error("Error removing receipt:", removeError);
      }
    }

    fetchData();
  };

  const handleDeleteExpense = (expense: ExpenseWithDetails) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteExpense(expense.id);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              fetchData();
            }
          },
        },
      ]
    );
  };

  const handleSettleSplit = async (splitId: string) => {
    if (!user) return;
    const { error } = await settleExpenseSplit(splitId, user.id);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      fetchData();
    }
  };

  const handleUnsettleSplit = async (splitId: string) => {
    const { error } = await unsettleExpenseSplit(splitId);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      fetchData();
    }
  };

  const handleSettleAllWithUser = async (userId: string) => {
    if (!activeHouse || !user) return;

    const { error } = await settleAllWithUser(activeHouse.id, user.id, userId);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      fetchData();
    }
  };

  const handleSettleGuestFee = async (splitId: string) => {
    const { error } = await settleGuestFee(splitId);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      fetchData();
    }
  };

  const handleUnsettleGuestFee = async (splitId: string) => {
    const { error } = await unsettleGuestFee(splitId);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      fetchData();
    }
  };

  const openEditModal = (expense: ExpenseWithDetails) => {
    setEditingExpense(expense);
    setShowEditModal(true);
  };

  const handleEditExpenseById = async (expenseId: string) => {
    const { expense, error } = await getExpense(expenseId);
    if (error) {
      Alert.alert("Error", "Could not load expense for editing");
      return;
    }
    if (expense) {
      openEditModal(expense);
    }
  };

  const openBalanceDetail = (balance: UserBalance) => {
    setSelectedBalance(balance);
    setShowBalanceDetail(true);
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <GeometricBackground />
        <Text style={[styles.loadingHeader, { color: colors.foreground }]}>
          MÖKKI
        </Text>
        <ActivityIndicator size="large" color={colors.foreground} />
      </View>
    );
  }

  return (
    <PageContainer>
      <GeometricBackground />
      <TopBar />

      {/* Header with action button */}
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Pay up
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddModal(true)}
        >
          <FontAwesome name="plus" size={16} color={colors.primaryForeground} />
          <Text
            style={[styles.addButtonText, { color: colors.primaryForeground }]}
          >
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {balanceData && (
        <View style={styles.summaryContainer}>
          <ExpenseSummaryCards summary={balanceData.summary} />
        </View>
      )}

      {/* Tab switcher */}
      <View style={[styles.tabContainer, { backgroundColor: colors.muted }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "balances" && { backgroundColor: colors.background },
          ]}
          onPress={() => setActiveTab("balances")}
        >
          <FontAwesome
            name="users"
            size={14}
            color={
              activeTab === "balances"
                ? colors.foreground
                : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "balances"
                    ? colors.foreground
                    : colors.mutedForeground,
              },
            ]}
          >
            Balances
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "expenses" && { backgroundColor: colors.background },
          ]}
          onPress={() => setActiveTab("expenses")}
        >
          <FontAwesome
            name="list"
            size={14}
            color={
              activeTab === "expenses"
                ? colors.foreground
                : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "expenses"
                    ? colors.foreground
                    : colors.mutedForeground,
              },
            ]}
          >
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "guest_fees" && { backgroundColor: colors.background },
          ]}
          onPress={() => setActiveTab("guest_fees")}
        >
          <FontAwesome
            name="bed"
            size={14}
            color={
              activeTab === "guest_fees"
                ? colors.foreground
                : colors.mutedForeground
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "guest_fees"
                    ? colors.foreground
                    : colors.mutedForeground,
              },
            ]}
          >
            Guest Fees
          </Text>
        </TouchableOpacity>
      </View>

      {/* Venmo Setup Banner */}
      {userVenmoHandle === null && showVenmoBanner && (
        <View style={[styles.venmoBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.venmoBannerHeader}>
            <View style={styles.venmoBannerTitleRow}>
              <FontAwesome name="dollar" size={16} color={colors.primary} />
              <Text style={[styles.venmoBannerTitle, { color: colors.foreground }]}>
                Add your Venmo
              </Text>
            </View>
            <TouchableOpacity
              style={styles.venmoBannerClose}
              onPress={() => setShowVenmoBanner(false)}
            >
              <FontAwesome name="times" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.venmoBannerText, { color: colors.mutedForeground }]}>
            Make it easier for housemates to pay you back
          </Text>
          <TouchableOpacity
            style={[styles.venmoAddButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowVenmoModal(true)}
          >
            <Text style={[styles.venmoAddButtonText, { color: colors.primaryForeground }]}>
              Add Venmo Handle
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Venmo Input Modal */}
      <Modal
        visible={showVenmoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVenmoModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
          setShowVenmoModal(false);
        }}>
          <View style={styles.venmoModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
              >
                <View style={[styles.venmoModalContent, { backgroundColor: colors.card }]}>
                  <Text style={[styles.venmoModalTitle, { color: colors.foreground }]}>
                    Add your Venmo handle
                  </Text>
                  <Text style={[styles.venmoModalSubtitle, { color: colors.mutedForeground }]}>
                    This lets housemates easily pay you back
                  </Text>
                  <View style={[styles.venmoModalInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.venmoAtSign, { color: colors.mutedForeground }]}>@</Text>
                    <TextInput
                      style={[styles.venmoModalInput, { color: colors.foreground }]}
                      value={venmoInput}
                      onChangeText={setVenmoInput}
                      placeholder="username"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleSaveVenmo}
                    />
                  </View>
                  <View style={styles.venmoModalButtons}>
                    <TouchableOpacity
                      style={[styles.venmoModalCancelButton, { borderColor: colors.border }]}
                      onPress={() => {
                        setVenmoInput("");
                        setShowVenmoModal(false);
                      }}
                    >
                      <Text style={[styles.venmoModalCancelText, { color: colors.foreground }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.venmoModalSaveButton,
                        { backgroundColor: colors.primary },
                        (!venmoInput.trim() || isSavingVenmo) && { opacity: 0.5 },
                      ]}
                      onPress={async () => {
                        await handleSaveVenmo();
                        if (venmoInput.trim()) {
                          setShowVenmoModal(false);
                        }
                      }}
                      disabled={!venmoInput.trim() || isSavingVenmo}
                    >
                      {isSavingVenmo ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <Text style={[styles.venmoModalSaveText, { color: colors.primaryForeground }]}>
                          Save
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === "balances" && (
          <BalanceList
            balances={balanceData?.balances || []}
            onSettleAll={handleSettleAllWithUser}
            onSelectBalance={openBalanceDetail}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === "expenses" && (
          <ExpenseList
            expenses={expenses}
            currentUserId={user?.id || ""}
            onEditExpense={openEditModal}
            onDeleteExpense={handleDeleteExpense}
            onSettleSplit={handleSettleSplit}
            onUnsettleSplit={handleUnsettleSplit}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === "guest_fees" && (
          <GuestFeesList
            stays={guestFeeStays}
            recipientId={guestFeeRecipientId}
            currentUserId={user?.id || ""}
            onSettleGuestFee={handleSettleGuestFee}
            onUnsettleGuestFee={handleUnsettleGuestFee}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </View>

      {/* Modals */}
      <AddExpenseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddExpense}
        members={members}
        currentUserId={user?.id || ""}
      />

      <EditExpenseModal
        visible={showEditModal}
        expense={editingExpense}
        onClose={() => {
          setShowEditModal(false);
          setEditingExpense(null);
        }}
        onSubmit={handleEditExpense}
        members={members}
        currentUserId={user?.id || ""}
      />

      <BalanceDetailModal
        visible={showBalanceDetail}
        balance={selectedBalance}
        houseId={activeHouse?.id || ""}
        currentUserId={user?.id || ""}
        houseName={activeHouse?.name}
        onClose={() => {
          setShowBalanceDetail(false);
          setSelectedBalance(null);
        }}
        onSettled={fetchData}
        onEditExpense={handleEditExpenseById}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingHeader: {
    fontSize: 24,
    fontFamily: typography.fontFamily.chillaxBold,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
    maxWidth: "70%",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 4,
    borderRadius: 10,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  venmoBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  venmoBannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  venmoBannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  venmoBannerTitle: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxSemibold,
  },
  venmoBannerClose: {
    padding: 4,
  },
  venmoBannerText: {
    fontSize: 13,
    fontFamily: typography.fontFamily.chillax,
    marginBottom: 12,
  },
  venmoAddButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  venmoAddButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  venmoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  venmoModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 24,
  },
  venmoModalTitle: {
    fontSize: 18,
    fontFamily: typography.fontFamily.chillaxSemibold,
    textAlign: "center",
    marginBottom: 8,
  },
  venmoModalSubtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.chillax,
    textAlign: "center",
    marginBottom: 20,
  },
  venmoModalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  venmoAtSign: {
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
    marginRight: 4,
  },
  venmoModalInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: typography.fontFamily.chillax,
    paddingVertical: 14,
  },
  venmoModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  venmoModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  venmoModalCancelText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
  venmoModalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  venmoModalSaveText: {
    fontSize: 15,
    fontFamily: typography.fontFamily.chillaxMedium,
  },
});
