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
} from "@/types/database";

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
          profiles (*)
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
          profiles (*)
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

    // Convert to UserBalance array
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
      .filter((b) => b.owes !== 0 || b.owed !== 0)
      .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));

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
  }
): Promise<{
  expense: Expense | null;
  error: Error | null;
}> {
  try {
    const { title, amount, description, category, date, splits } = data;

    // Validate splits sum to total (with tolerance for floating point)
    const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitsTotal - amount) > 0.01) {
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
export async function settleExpenseSplit(splitId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from("expense_splits")
      .update({
        settled: true,
        settled_at: new Date().toISOString(),
      })
      .eq("id", splitId);

    if (error) {
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
