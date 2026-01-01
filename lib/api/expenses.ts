import { supabase } from "@/lib/supabase/client";
import type {
  Expense,
  ExpenseSplit,
  ExpenseWithDetails,
  ExpenseBalanceData,
  UserBalance,
  ExpenseSummary,
  ExpenseCategory,
  Profile,
  BalanceBreakdown,
  BalanceBreakdownItem,
} from "@/types/database";
import { sendExpenseNotification, sendSettlementNotification } from "./notifications";

// Category display info
export const EXPENSE_CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  color: string;
  bgColor: string;
}[] = [
  { value: "groceries", label: "Groceries", color: "#166534", bgColor: "#dcfce7" },
  { value: "utilities", label: "Utilities", color: "#1e40af", bgColor: "#dbeafe" },
  { value: "supplies", label: "Supplies", color: "#7e22ce", bgColor: "#f3e8ff" },
  { value: "rent", label: "Rent", color: "#c2410c", bgColor: "#ffedd5" },
  { value: "entertainment", label: "Entertainment", color: "#be185d", bgColor: "#fce7f3" },
  { value: "transportation", label: "Transportation", color: "#a16207", bgColor: "#fef3c7" },
  { value: "guest_fees", label: "Guest Fees", color: "#dc2626", bgColor: "#fee2e2" },
  { value: "other", label: "Other", color: "#4b5563", bgColor: "#f3f4f6" },
];

export function getCategoryInfo(category: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find((c) => c.value === category) || EXPENSE_CATEGORIES[7];
}

/**
 * Get all expenses for a house with full details
 */
export async function getHouseExpenses(
  houseId: string,
  options?: { limit?: number; offset?: number; category?: ExpenseCategory }
): Promise<{
  expenses: ExpenseWithDetails[];
  error: Error | null;
}> {
  try {
    let query = supabase
      .from("expenses")
      .select(`
        *,
        paid_by_profile:profiles!expenses_paid_by_fkey (*),
        created_by_profile:profiles!expenses_created_by_fkey (*),
        expense_splits (
          *,
          profiles!expense_splits_user_id_fkey (*)
        )
      `)
      .eq("house_id", houseId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (options?.category) {
      query = query.eq("category", options.category);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data: expenses, error } = await query;

    if (error) {
      return { expenses: [], error };
    }

    return { expenses: (expenses || []) as ExpenseWithDetails[], error: null };
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return { expenses: [], error: error as Error };
  }
}

/**
 * Get a single expense by ID
 */
export async function getExpense(expenseId: string): Promise<{
  expense: ExpenseWithDetails | null;
  error: Error | null;
}> {
  try {
    const { data: expense, error } = await supabase
      .from("expenses")
      .select(`
        *,
        paid_by_profile:profiles!expenses_paid_by_fkey (*),
        created_by_profile:profiles!expenses_created_by_fkey (*),
        expense_splits (
          *,
          profiles!expense_splits_user_id_fkey (*)
        )
      `)
      .eq("id", expenseId)
      .single();

    if (error) {
      return { expense: null, error };
    }

    return { expense: expense as ExpenseWithDetails, error: null };
  } catch (error) {
    console.error("Error fetching expense:", error);
    return { expense: null, error: error as Error };
  }
}

/**
 * Calculate user balances for a house
 */
export async function getUserBalances(
  houseId: string,
  currentUserId: string
): Promise<{
  data: ExpenseBalanceData | null;
  error: Error | null;
}> {
  try {
    // Get all unsettled expense splits for this house
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select(`
        id,
        paid_by,
        expense_splits (
          id,
          user_id,
          amount,
          settled
        )
      `)
      .eq("house_id", houseId);

    if (expensesError) {
      return { data: null, error: expensesError };
    }

    // Get all house members for display info
    const { data: members, error: membersError } = await supabase
      .from("house_members")
      .select(`
        user_id,
        profiles (*)
      `)
      .eq("house_id", houseId)
      .eq("invite_status", "accepted");

    if (membersError) {
      return { data: null, error: membersError };
    }

    // Build a map of user profiles
    const profileMap: Record<string, Profile> = {};
    members?.forEach((m) => {
      if (m.user_id && m.profiles) {
        profileMap[m.user_id] = m.profiles as Profile;
      }
    });

    // Calculate balances
    const balanceMap: Record<string, { owes: number; owed: number }> = {};

    expenses?.forEach((expense) => {
      const paidBy = expense.paid_by;

      expense.expense_splits?.forEach((split) => {
        if (split.settled) return; // Skip settled splits

        const splitUserId = split.user_id;
        const amount = split.amount;

        // Initialize balance entries
        if (!balanceMap[splitUserId]) {
          balanceMap[splitUserId] = { owes: 0, owed: 0 };
        }
        if (!balanceMap[paidBy]) {
          balanceMap[paidBy] = { owes: 0, owed: 0 };
        }

        // If current user paid, the split user owes them
        if (paidBy === currentUserId && splitUserId !== currentUserId) {
          balanceMap[splitUserId].owes += amount;
        }
        // If someone else paid and current user has a split, current user owes them
        else if (splitUserId === currentUserId && paidBy !== currentUserId) {
          balanceMap[paidBy].owed += amount;
        }
      });
    });

    // Ensure all house members are in the balance map (even with $0)
    members?.forEach((m) => {
      if (m.user_id && m.user_id !== currentUserId && !balanceMap[m.user_id]) {
        balanceMap[m.user_id] = { owes: 0, owed: 0 };
      }
    });

    // Convert to UserBalance array - include ALL members
    const balances: UserBalance[] = Object.entries(balanceMap)
      .filter(([userId]) => userId !== currentUserId)
      .map(([userId, { owes, owed }]) => {
        const profile = profileMap[userId];
        return {
          userId,
          displayName: profile?.display_name || null,
          avatarUrl: profile?.avatar_url || null,
          venmoHandle: profile?.venmo_handle || null,
          owes: Math.round(owes * 100) / 100,
          owed: Math.round(owed * 100) / 100,
          netBalance: Math.round((owes - owed) * 100) / 100,
        };
      })
      // Sort: non-zero balances first (by absolute value), then zero balances alphabetically
      .sort((a, b) => {
        const aHasBalance = a.netBalance !== 0;
        const bHasBalance = b.netBalance !== 0;
        if (aHasBalance && !bHasBalance) return -1;
        if (!aHasBalance && bHasBalance) return 1;
        if (aHasBalance && bHasBalance) {
          return Math.abs(b.netBalance) - Math.abs(a.netBalance);
        }
        // Both zero - sort alphabetically
        return (a.displayName || "").localeCompare(b.displayName || "");
      });

    // Calculate summary
    const summary: ExpenseSummary = {
      totalYouOwe: Math.round(balances.reduce((sum, b) => sum + b.owed, 0) * 100) / 100,
      totalYouAreOwed: Math.round(balances.reduce((sum, b) => sum + b.owes, 0) * 100) / 100,
      netBalance: Math.round(balances.reduce((sum, b) => sum + b.netBalance, 0) * 100) / 100,
    };

    return {
      data: { balances, summary },
      error: null,
    };
  } catch (error) {
    console.error("Error calculating balances:", error);
    return { data: null, error: error as Error };
  }
}

/**
 * Create a new expense with splits
 */
export async function createExpense(
  houseId: string,
  userId: string,
  data: {
    title: string;
    amount: number;
    description?: string;
    category: ExpenseCategory;
    date: string;
    splits: { userId: string; amount: number }[];
    payerShare?: number;
  }
): Promise<{
  expense: Expense | null;
  error: Error | null;
}> {
  try {
    const { title, amount, description, category, date, splits, payerShare = 0 } = data;

    // Validate splits sum to total (with tolerance for floating point)
    // When payer includes themselves in the split, payerShare represents their portion
    const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);
    const effectiveTotal = splitsTotal + payerShare;
    if (Math.abs(effectiveTotal - amount) > 0.01) {
      return {
        expense: null,
        error: new Error("Split amounts must equal the total expense amount"),
      };
    }

    // Create the expense
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        house_id: houseId,
        paid_by: userId,
        created_by: userId,
        title: title.trim(),
        amount,
        description: description?.trim() || "",
        category,
        date,
      })
      .select()
      .single();

    if (expenseError || !expense) {
      return { expense: null, error: expenseError };
    }

    // Create expense splits
    if (splits.length > 0) {
      const splitRows = splits.map((split) => ({
        expense_id: expense.id,
        user_id: split.userId,
        amount: split.amount,
        settled: false,
      }));

      const { error: splitsError } = await supabase
        .from("expense_splits")
        .insert(splitRows);

      if (splitsError) {
        console.error("Error creating splits:", splitsError);
        // Don't fail the whole operation, expense was created
      } else {
        // Send notifications to split recipients (excluding the payer)
        const recipientSplits = splits.filter((s) => s.userId !== userId);

        if (recipientSplits.length > 0) {
          // Get creator profile for notification
          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("id", userId)
            .single();

          // Get house name for notification
          const { data: house } = await supabase
            .from("houses")
            .select("name")
            .eq("id", houseId)
            .single();

          if (creatorProfile && house) {
            // Send notifications asynchronously (don't block UI)
            sendExpenseNotification({
              expenseId: expense.id,
              expenseTitle: title.trim(),
              totalAmount: amount,
              splits: recipientSplits,
              creatorName:
                creatorProfile.display_name ||
                creatorProfile.email.split("@")[0],
              houseName: house.name,
            }).catch((err) => {
              console.error("Failed to send expense notifications:", err);
            });
          }
        }
      }
    }

    return { expense, error: null };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { expense: null, error: error as Error };
  }
}

/**
 * Update an existing expense
 */
export async function updateExpense(
  expenseId: string,
  userId: string,
  data: {
    title: string;
    amount: number;
    description?: string;
    category: ExpenseCategory;
    date: string;
    splits?: { userId: string; amount: number }[];
  }
): Promise<{
  expense: Expense | null;
  error: Error | null;
}> {
  try {
    const { title, amount, description, category, date, splits } = data;

    // Get existing splits before update (for notification comparison)
    const { data: existingSplits } = await supabase
      .from("expense_splits")
      .select("user_id")
      .eq("expense_id", expenseId);

    const existingSplitUserIds = new Set(
      existingSplits?.map((s) => s.user_id) || []
    );

    // Update the expense
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .update({
        title: title.trim(),
        amount,
        description: description?.trim() || "",
        category,
        date,
      })
      .eq("id", expenseId)
      .select()
      .single();

    if (expenseError || !expense) {
      return { expense: null, error: expenseError };
    }

    // Update splits if provided
    if (splits !== undefined) {
      // Validate splits sum
      const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(splitsTotal - amount) > 0.01) {
        return {
          expense: null,
          error: new Error("Split amounts must equal the total expense amount"),
        };
      }

      // Delete existing splits
      await supabase.from("expense_splits").delete().eq("expense_id", expenseId);

      // Create new splits
      if (splits.length > 0) {
        const splitRows = splits.map((split) => ({
          expense_id: expenseId,
          user_id: split.userId,
          amount: split.amount,
          settled: false,
        }));

        const { error: splitsError } = await supabase
          .from("expense_splits")
          .insert(splitRows);

        if (splitsError) {
          console.error("Error updating splits:", splitsError);
        } else {
          // Find newly added split recipients (not in original list, not the editor)
          const newSplits = splits.filter(
            (s) => !existingSplitUserIds.has(s.userId) && s.userId !== userId
          );

          if (newSplits.length > 0) {
            // Get editor profile for notification
            const { data: editorProfile } = await supabase
              .from("profiles")
              .select("display_name, email")
              .eq("id", userId)
              .single();

            // Get house name for notification
            const { data: house } = await supabase
              .from("houses")
              .select("name")
              .eq("id", expense.house_id)
              .single();

            if (editorProfile && house) {
              // Send notifications to newly added split recipients
              sendExpenseNotification({
                expenseId: expense.id,
                expenseTitle: title.trim(),
                totalAmount: amount,
                splits: newSplits,
                creatorName:
                  editorProfile.display_name ||
                  editorProfile.email.split("@")[0],
                houseName: house.name,
              }).catch((err) => {
                console.error("Failed to send expense notifications:", err);
              });
            }
          }
        }
      }
    }

    return { expense, error: null };
  } catch (error) {
    console.error("Error updating expense:", error);
    return { expense: null, error: error as Error };
  }
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Splits will cascade delete via FK
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Settle an expense split (mark as paid)
 */
export async function settleExpenseSplit(splitId: string, settledByUserId?: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Try with settled_by first, fall back without if column doesn't exist
    const updateData: Record<string, unknown> = {
      settled: true,
      settled_at: new Date().toISOString(),
    };

    if (settledByUserId) {
      updateData.settled_by = settledByUserId;
    }

    const { error } = await supabase
      .from("expense_splits")
      .update(updateData)
      .eq("id", splitId);

    if (error) {
      // If settled_by column doesn't exist, retry without it
      if (error.message?.includes("settled_by")) {
        const { error: retryError } = await supabase
          .from("expense_splits")
          .update({
            settled: true,
            settled_at: new Date().toISOString(),
          })
          .eq("id", splitId);

        if (retryError) {
          return { success: false, error: retryError };
        }
        return { success: true, error: null };
      }
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error settling split:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Unsettle an expense split
 */
export async function unsettleExpenseSplit(splitId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("expense_splits")
      .update({
        settled: false,
        settled_at: null,
        settled_by: null,
      })
      .eq("id", splitId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error unsettling split:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Settle all splits with a specific user
 */
export async function settleAllWithUser(
  houseId: string,
  currentUserId: string,
  otherUserId: string
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Get all expenses paid by current user
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("id")
      .eq("house_id", houseId)
      .eq("paid_by", currentUserId);

    if (expensesError) {
      return { success: false, error: expensesError };
    }

    if (!expenses || expenses.length === 0) {
      return { success: true, error: null };
    }

    const expenseIds = expenses.map((e) => e.id);

    // Update all unsettled splits for these expenses where user_id = otherUserId
    const { error } = await supabase
      .from("expense_splits")
      .update({
        settled: true,
        settled_at: new Date().toISOString(),
        settled_by: currentUserId,
      })
      .in("expense_id", expenseIds)
      .eq("user_id", otherUserId)
      .eq("settled", false);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error settling all with user:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get house members for expense splitting
 */
export async function getHouseMembersForExpenses(houseId: string): Promise<{
  members: Profile[];
  error: Error | null;
}> {
  try {
    const { data: members, error } = await supabase
      .from("house_members")
      .select(`
        user_id,
        profiles (*)
      `)
      .eq("house_id", houseId)
      .eq("invite_status", "accepted");

    if (error) {
      return { members: [], error };
    }

    const profiles = (members || [])
      .filter((m) => m.profiles !== null)
      .map((m) => m.profiles as Profile);

    return { members: profiles, error: null };
  } catch (error) {
    console.error("Error fetching house members:", error);
    return { members: [], error: error as Error };
  }
}

/**
 * Get detailed balance breakdown between current user and another user
 * Includes both settled and unsettled expenses for history
 */
export async function getBalanceBreakdown(
  houseId: string,
  currentUserId: string,
  otherUserId: string
): Promise<{
  data: BalanceBreakdown | null;
  error: Error | null;
}> {
  try {
    // Get the other user's profile
    const { data: otherProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", otherUserId)
      .single();

    if (profileError) {
      return { data: null, error: profileError };
    }

    // Get all house member profiles for settled_by lookup
    const { data: members } = await supabase
      .from("house_members")
      .select("user_id, profiles (id, display_name)")
      .eq("house_id", houseId)
      .eq("invite_status", "accepted");

    const profileMap: Record<string, string> = {};
    members?.forEach((m) => {
      if (m.profiles && m.user_id) {
        profileMap[m.user_id] = (m.profiles as { display_name: string | null }).display_name || "Unknown";
      }
    });

    // Get all expenses in the house with their splits (including settled)
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select(`
        id,
        title,
        description,
        amount,
        category,
        date,
        paid_by,
        receipt_url,
        paid_by_profile:profiles!expenses_paid_by_fkey (display_name),
        expense_splits (
          id,
          user_id,
          amount,
          settled,
          settled_at,
          settled_by
        )
      `)
      .eq("house_id", houseId)
      .order("date", { ascending: false });

    if (expensesError) {
      return { data: null, error: expensesError };
    }

    const theyOweYou: BalanceBreakdownItem[] = [];
    const youOweThem: BalanceBreakdownItem[] = [];

    expenses?.forEach((expense) => {
      const paidBy = expense.paid_by;
      const paidByName = (expense.paid_by_profile as { display_name: string | null })?.display_name || "Unknown";

      expense.expense_splits?.forEach((split) => {
        const settledByName = split.settled_by ? profileMap[split.settled_by] || "Unknown" : null;

        // Expenses YOU paid where THEY have a split = they owe you
        if (paidBy === currentUserId && split.user_id === otherUserId) {
          theyOweYou.push({
            expenseId: expense.id,
            splitId: split.id,
            title: expense.title ?? "Expense",
            description: expense.description ?? null,
            category: expense.category as ExpenseCategory,
            date: expense.date,
            splitAmount: split.amount,
            totalExpenseAmount: expense.amount,
            paidByName: "You",
            paidById: paidBy,
            receiptUrl: expense.receipt_url ?? null,
            settled: split.settled,
            settledAt: split.settled_at,
            settledByName,
          });
        }
        // Expenses THEY paid where YOU have a split = you owe them
        else if (paidBy === otherUserId && split.user_id === currentUserId) {
          youOweThem.push({
            expenseId: expense.id,
            splitId: split.id,
            title: expense.title ?? "Expense",
            description: expense.description ?? null,
            category: expense.category as ExpenseCategory,
            date: expense.date,
            splitAmount: split.amount,
            totalExpenseAmount: expense.amount,
            paidByName,
            paidById: paidBy,
            receiptUrl: expense.receipt_url ?? null,
            settled: split.settled,
            settledAt: split.settled_at,
            settledByName,
          });
        }
      });
    });

    // Sort: unsettled first, then settled (by date descending within each group)
    const sortItems = (items: BalanceBreakdownItem[]) => {
      return items.sort((a, b) => {
        if (a.settled !== b.settled) return a.settled ? 1 : -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    };

    sortItems(theyOweYou);
    sortItems(youOweThem);

    // Only count unsettled amounts for totals
    const totalTheyOwe = Math.round(
      theyOweYou.filter((item) => !item.settled).reduce((sum, item) => sum + item.splitAmount, 0) * 100
    ) / 100;
    const totalYouOwe = Math.round(
      youOweThem.filter((item) => !item.settled).reduce((sum, item) => sum + item.splitAmount, 0) * 100
    ) / 100;
    const netBalance = Math.round((totalTheyOwe - totalYouOwe) * 100) / 100;

    return {
      data: {
        otherUser: {
          userId: otherUserId,
          displayName: otherProfile.display_name,
          avatarUrl: otherProfile.avatar_url,
          venmoHandle: otherProfile.venmo_handle,
        },
        theyOweYou,
        youOweThem,
        totalTheyOwe,
        totalYouOwe,
        netBalance,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error getting balance breakdown:", error);
    return { data: null, error: error as Error };
  }
}

/**
 * Settle all splits bidirectionally between current user and another user
 * This settles:
 * - Expenses YOU paid where THEY have unsettled splits
 * - Expenses THEY paid where YOU have unsettled splits
 */
export async function settleUpWithUser(
  houseId: string,
  currentUserId: string,
  otherUserId: string
): Promise<{
  success: boolean;
  settledCount: number;
  error: Error | null;
}> {
  try {
    // Get all expenses in the house paid by either user with their splits
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select(`
        id,
        paid_by,
        expense_splits (
          id,
          user_id,
          amount,
          settled
        )
      `)
      .eq("house_id", houseId)
      .in("paid_by", [currentUserId, otherUserId]);

    if (expensesError) {
      return { success: false, settledCount: 0, error: expensesError };
    }

    if (!expenses || expenses.length === 0) {
      return { success: true, settledCount: 0, error: null };
    }

    // Separate expenses by who paid
    const expensesPaidByMe = expenses.filter((e) => e.paid_by === currentUserId);
    const expensesPaidByThem = expenses.filter((e) => e.paid_by === otherUserId);

    let settledCount = 0;
    let settledAmount = 0;

    // Calculate amounts being settled and get expense IDs
    expensesPaidByMe.forEach((e) => {
      e.expense_splits?.forEach((split) => {
        if (split.user_id === otherUserId && !split.settled) {
          settledAmount += split.amount;
        }
      });
    });
    expensesPaidByThem.forEach((e) => {
      e.expense_splits?.forEach((split) => {
        if (split.user_id === currentUserId && !split.settled) {
          settledAmount += split.amount;
        }
      });
    });

    const expenseIdsPaidByMe = expensesPaidByMe.map((e) => e.id);
    const expenseIdsPaidByThem = expensesPaidByThem.map((e) => e.id);

    // Settle their splits on expenses I paid
    if (expenseIdsPaidByMe.length > 0) {
      const { data: settled1, error: error1 } = await supabase
        .from("expense_splits")
        .update({
          settled: true,
          settled_at: new Date().toISOString(),
          settled_by: currentUserId,
        })
        .in("expense_id", expenseIdsPaidByMe)
        .eq("user_id", otherUserId)
        .eq("settled", false)
        .select("id");

      if (error1) {
        return { success: false, settledCount: 0, error: error1 };
      }
      settledCount += settled1?.length || 0;
    }

    // Settle my splits on expenses they paid
    if (expenseIdsPaidByThem.length > 0) {
      const { data: settled2, error: error2 } = await supabase
        .from("expense_splits")
        .update({
          settled: true,
          settled_at: new Date().toISOString(),
          settled_by: currentUserId,
        })
        .in("expense_id", expenseIdsPaidByThem)
        .eq("user_id", currentUserId)
        .eq("settled", false)
        .select("id");

      if (error2) {
        return { success: false, settledCount, error: error2 };
      }
      settledCount += settled2?.length || 0;
    }

    // Send notification to the other user if any splits were settled
    if (settledCount > 0) {
      // Get current user's name and house name for the notification
      const [{ data: currentUserProfile }, { data: house }] = await Promise.all([
        supabase.from("profiles").select("display_name, email").eq("id", currentUserId).single(),
        supabase.from("houses").select("name").eq("id", houseId).single(),
      ]);

      if (currentUserProfile && house) {
        const settlerName = currentUserProfile.display_name || currentUserProfile.email.split("@")[0];

        // Send notification asynchronously (don't block)
        sendSettlementNotification({
          recipientUserId: otherUserId,
          settlerName,
          houseName: house.name,
          settledAmount: Math.round(settledAmount * 100) / 100,
          settledCount,
        }).catch((err) => {
          console.error("Failed to send settlement notification:", err);
        });
      }
    }

    return { success: true, settledCount, error: null };
  } catch (error) {
    console.error("Error settling up with user:", error);
    return { success: false, settledCount: 0, error: error as Error };
  }
}

/**
 * Format amount to 2 decimal places
 */
export function formatAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
