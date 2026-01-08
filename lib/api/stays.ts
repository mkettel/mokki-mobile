import { supabase } from "@/lib/supabase/client";
import type {
  Database,
  Stay,
  StayWithProfile,
  StayWithGuestFees,
  Profile,
  Expense,
  ExpenseSplit,
  HouseSettings,
} from "@/types/database";

// Default guest fee constant - can be overridden per house in settings
export const GUEST_FEE_PER_NIGHT = 50;

// Extended type for stays with expense info
export type StayWithExpense = Stay & {
  profiles: Profile;
  coBooker?: Profile | null;
  linkedExpense?: {
    id: string;
    amount: number;
    split?: {
      id: string;
      settled: boolean;
      settled_at: string | null;
    };
  } | null;
  bedSignup?: {
    id: string;
    bedName: string;
    bedType: string;
    roomName: string;
    isPremium: boolean;
    coClaimer?: Profile | null;
  } | null;
};

/**
 * Get all stays for a house
 */
export async function getHouseStays(houseId: string): Promise<{
  stays: StayWithExpense[];
  error: Error | null;
}> {
  try {
    // Fetch stays with profiles and co-booker
    const { data: stays, error: staysError } = await supabase
      .from("stays")
      .select(`
        *,
        profiles (*),
        co_booker:profiles!stays_co_booker_id_fkey (*)
      `)
      .eq("house_id", houseId)
      .order("check_in", { ascending: true });

    if (staysError) {
      return { stays: [], error: staysError };
    }

    // Fetch linked expenses separately for stays that have them
    const expenseIds = (stays || [])
      .map(s => s.linked_expense_id)
      .filter((id): id is string => !!id);

    let expenseMap: Record<string, { id: string; amount: number; split?: { id: string; settled: boolean; settled_at: string | null } }> = {};

    if (expenseIds.length > 0) {
      const { data: expenses } = await supabase
        .from("expenses")
        .select(`
          id,
          amount,
          expense_splits (
            id,
            user_id,
            settled,
            settled_at
          )
        `)
        .in("id", expenseIds);

      if (expenses) {
        for (const expense of expenses) {
          expenseMap[expense.id] = {
            id: expense.id,
            amount: expense.amount,
            split: expense.expense_splits?.[0] ? {
              id: expense.expense_splits[0].id,
              settled: expense.expense_splits[0].settled,
              settled_at: expense.expense_splits[0].settled_at,
            } : undefined,
          };
        }
      }
    }

    // Fetch bed signups for stays that have them
    const bedSignupIds = (stays || [])
      .map(s => s.bed_signup_id)
      .filter((id): id is string => !!id);

    let bedSignupMap: Record<string, { id: string; bedName: string; bedType: string; roomName: string; isPremium: boolean; coClaimer?: Profile | null }> = {};

    if (bedSignupIds.length > 0) {
      const { data: bedSignups } = await supabase
        .from("bed_signups")
        .select(`
          id,
          co_claimer:profiles!bed_signups_co_claimer_id_fkey (*),
          beds (
            id,
            name,
            bed_type,
            is_premium,
            rooms (
              id,
              name
            )
          )
        `)
        .in("id", bedSignupIds);

      if (bedSignups) {
        for (const signup of bedSignups) {
          const bed = signup.beds as any;
          const room = bed?.rooms as any;
          if (bed && room) {
            bedSignupMap[signup.id] = {
              id: signup.id,
              bedName: bed.name,
              bedType: bed.bed_type,
              roomName: room.name,
              isPremium: bed.is_premium,
              coClaimer: signup.co_claimer as Profile | null,
            };
          }
        }
      }
    }

    // Transform data
    const transformedStays: StayWithExpense[] = (stays || []).map(stay => ({
      ...stay,
      profiles: stay.profiles as Profile,
      coBooker: (stay as any).co_booker as Profile | null,
      linkedExpense: stay.linked_expense_id ? expenseMap[stay.linked_expense_id] : null,
      bedSignup: stay.bed_signup_id ? bedSignupMap[stay.bed_signup_id] : null,
    }));

    return { stays: transformedStays, error: null };
  } catch (error) {
    console.error("Error fetching house stays:", error);
    return { stays: [], error: error as Error };
  }
}

/**
 * Get a single stay by ID
 */
export async function getStay(stayId: string): Promise<{
  stay: StayWithExpense | null;
  error: Error | null;
}> {
  try {
    const { data: stay, error } = await supabase
      .from("stays")
      .select(`
        *,
        profiles (*),
        co_booker:profiles!stays_co_booker_id_fkey (*)
      `)
      .eq("id", stayId)
      .single();

    if (error) {
      return { stay: null, error };
    }

    // Fetch linked expense if exists
    let linkedExpense = null;
    if (stay.linked_expense_id) {
      const { data: expense } = await supabase
        .from("expenses")
        .select(`
          id,
          amount,
          expense_splits (
            id,
            user_id,
            settled,
            settled_at
          )
        `)
        .eq("id", stay.linked_expense_id)
        .single();

      if (expense) {
        linkedExpense = {
          id: expense.id,
          amount: expense.amount,
          split: expense.expense_splits?.[0] ? {
            id: expense.expense_splits[0].id,
            settled: expense.expense_splits[0].settled,
            settled_at: expense.expense_splits[0].settled_at,
          } : undefined,
        };
      }
    }

    return {
      stay: {
        ...stay,
        profiles: stay.profiles as Profile,
        coBooker: (stay as any).co_booker as Profile | null,
        linkedExpense,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error fetching stay:", error);
    return { stay: null, error: error as Error };
  }
}

/**
 * Get upcoming stays for a house (check_out >= today)
 */
export async function getUpcomingStays(
  houseId: string,
  limit: number = 5
): Promise<{
  stays: StayWithExpense[];
  error: Error | null;
}> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: stays, error } = await supabase
      .from("stays")
      .select(`
        *,
        profiles (*)
      `)
      .eq("house_id", houseId)
      .gte("check_out", today)
      .order("check_in", { ascending: true })
      .limit(limit);

    if (error) {
      return { stays: [], error };
    }

    const transformedStays: StayWithExpense[] = (stays || []).map(stay => ({
      ...stay,
      profiles: stay.profiles as Profile,
      linkedExpense: null, // Simplified for upcoming stays preview
    }));

    return { stays: transformedStays, error: null };
  } catch (error) {
    console.error("Error fetching upcoming stays:", error);
    return { stays: [], error: error as Error };
  }
}

/**
 * Create a new stay
 */
export async function createStay(
  houseId: string,
  userId: string,
  data: {
    checkIn: string;
    checkOut: string;
    notes?: string;
    guestCount?: number;
    guestNightlyRate?: number;
    bedSignupId?: string;
    coBookerId?: string;
  }
): Promise<{
  stay: Stay | null;
  error: Error | null;
}> {
  try {
    const { checkIn, checkOut, notes, guestCount = 0, guestNightlyRate = GUEST_FEE_PER_NIGHT, bedSignupId, coBookerId } = data;

    // Validate dates
    if (new Date(checkOut) < new Date(checkIn)) {
      return { stay: null, error: new Error("Check-out must be after check-in") };
    }

    let linkedExpenseId: string | null = null;

    // If guests and rate > 0, create linked expense
    if (guestCount > 0 && guestNightlyRate > 0) {
      const nights = Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
      );
      const amount = guestCount * nights * guestNightlyRate;

      // Get house settings to find guestFeeRecipient
      const { data: house } = await supabase
        .from("houses")
        .select("settings")
        .eq("id", houseId)
        .single();

      const houseSettings = house?.settings as HouseSettings | undefined;
      let recipientId = houseSettings?.guestFeeRecipient;

      // Fallback to first admin if no recipient set
      if (!recipientId) {
        const { data: adminMember } = await supabase
          .from("house_members")
          .select("user_id")
          .eq("house_id", houseId)
          .eq("role", "admin")
          .order("joined_at", { ascending: true })
          .limit(1)
          .single();
        recipientId = adminMember?.user_id ?? undefined;
      }

      if (recipientId) {
        // Create expense
        const { data: expense, error: expenseError } = await supabase
          .from("expenses")
          .insert({
            house_id: houseId,
            paid_by: recipientId,
            created_by: userId,
            title: "Guest Fee",
            amount,
            description: `Guest fees: ${guestCount} guest(s) × ${nights} night(s)`,
            category: "guest_fees",
            date: checkIn,
          })
          .select()
          .single();

        if (expenseError) {
          console.error("Error creating guest fee expense:", expenseError);
        }

        if (expense && !expenseError) {
          linkedExpenseId = expense.id;

          // Create expense split for the stay creator
          const { error: splitError } = await supabase.from("expense_splits").insert({
            expense_id: expense.id,
            user_id: userId,
            amount,
            settled: false,
          });
          if (splitError) {
            console.error("Error creating expense split:", splitError);
          }
        }
      }
    }

    // Create the stay
    const { data: stay, error } = await supabase
      .from("stays")
      .insert({
        house_id: houseId,
        user_id: userId,
        check_in: checkIn,
        check_out: checkOut,
        notes: notes || null,
        guest_count: guestCount,
        linked_expense_id: linkedExpenseId,
        bed_signup_id: bedSignupId || null,
        co_booker_id: coBookerId || null,
      })
      .select()
      .single();

    if (error) {
      // If stay creation failed and we created an expense, clean it up
      if (linkedExpenseId) {
        await supabase.from("expenses").delete().eq("id", linkedExpenseId);
      }
      return { stay: null, error };
    }

    // If stay has a bed signup and a co-booker, update the bed signup with co-claimer
    if (stay && bedSignupId && coBookerId) {
      const { error: updateError } = await supabase
        .from("bed_signups")
        .update({ co_claimer_id: coBookerId })
        .eq("id", bedSignupId);

      if (updateError) {
        console.error("Error setting co-claimer on bed signup:", updateError);
      }
    }

    return { stay, error: null };
  } catch (error) {
    console.error("Error creating stay:", error);
    return { stay: null, error: error as Error };
  }
}

/**
 * Update an existing stay
 */
export async function updateStay(
  stayId: string,
  userId: string,
  data: {
    checkIn: string;
    checkOut: string;
    notes?: string;
    guestCount?: number;
    guestNightlyRate?: number;
    bedSignupId?: string;
    coBookerId?: string | null;
  }
): Promise<{
  stay: Stay | null;
  error: Error | null;
}> {
  try {
    const { checkIn, checkOut, notes, guestCount = 0, guestNightlyRate = GUEST_FEE_PER_NIGHT, bedSignupId, coBookerId } = data;

    // Validate dates
    if (new Date(checkOut) < new Date(checkIn)) {
      return { stay: null, error: new Error("Check-out must be after check-in") };
    }

    // Get existing stay
    const { data: existingStay } = await supabase
      .from("stays")
      .select("*, linked_expense_id, house_id")
      .eq("id", stayId)
      .single();

    if (!existingStay) {
      return { stay: null, error: new Error("Stay not found") };
    }

    const hadGuests = (existingStay.guest_count || 0) > 0 && existingStay.linked_expense_id;
    const hasGuests = guestCount > 0 && guestNightlyRate > 0;
    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    const newAmount = guestCount * nights * guestNightlyRate;

    let linkedExpenseId = existingStay.linked_expense_id;

    // Handle guest fee expense changes
    if (!hadGuests && hasGuests) {
      // Case 1: No guests before, has guests now - create expense
      // Get house settings to find guestFeeRecipient
      const { data: house } = await supabase
        .from("houses")
        .select("settings")
        .eq("id", existingStay.house_id)
        .single();

      const houseSettings = house?.settings as HouseSettings | undefined;
      let recipientId = houseSettings?.guestFeeRecipient;

      // Fallback to first admin if no recipient set
      if (!recipientId) {
        const { data: adminMember } = await supabase
          .from("house_members")
          .select("user_id")
          .eq("house_id", existingStay.house_id)
          .eq("role", "admin")
          .order("joined_at", { ascending: true })
          .limit(1)
          .single();
        recipientId = adminMember?.user_id ?? undefined;
      }

      if (recipientId) {
        const { data: expense } = await supabase
          .from("expenses")
          .insert({
            house_id: existingStay.house_id,
            paid_by: recipientId,
            created_by: userId,
            title: "Guest Fee",
            amount: newAmount,
            description: `Guest fees: ${guestCount} guest(s) × ${nights} night(s)`,
            category: "guest_fees",
            date: checkIn,
          })
          .select()
          .single();

        if (expense) {
          linkedExpenseId = expense.id;
          await supabase.from("expense_splits").insert({
            expense_id: expense.id,
            user_id: userId,
            amount: newAmount,
            settled: false,
          });
        }
      }
    } else if (hadGuests && !hasGuests) {
      // Case 2: Had guests before, no guests now - delete expense
      if (linkedExpenseId) {
        await supabase.from("expenses").delete().eq("id", linkedExpenseId);
        linkedExpenseId = null;
      }
    } else if (hadGuests && hasGuests && linkedExpenseId) {
      // Case 3: Still has guests - update expense amount
      await supabase
        .from("expenses")
        .update({
          amount: newAmount,
          description: `Guest fees: ${guestCount} guest(s) × ${nights} night(s)`,
          date: checkIn,
        })
        .eq("id", linkedExpenseId);

      // Update the split amount
      await supabase
        .from("expense_splits")
        .update({ amount: newAmount })
        .eq("expense_id", linkedExpenseId);
    }

    // Build update object
    const updateData: Record<string, any> = {
      check_in: checkIn,
      check_out: checkOut,
      notes: notes || null,
      guest_count: guestCount,
      linked_expense_id: linkedExpenseId,
    };

    if (bedSignupId !== undefined) {
      updateData.bed_signup_id = bedSignupId || null;
    }

    if (coBookerId !== undefined) {
      updateData.co_booker_id = coBookerId;
    }

    // Update the stay
    const { data: stay, error } = await supabase
      .from("stays")
      .update(updateData)
      .eq("id", stayId)
      .select()
      .single();

    if (error) {
      return { stay: null, error };
    }

    // Sync co-claimer on bed signup if stay has one
    const finalBedSignupId = bedSignupId !== undefined ? bedSignupId : existingStay.bed_signup_id;
    if (finalBedSignupId && coBookerId !== undefined) {
      const { error: updateError } = await supabase
        .from("bed_signups")
        .update({ co_claimer_id: coBookerId })
        .eq("id", finalBedSignupId);

      if (updateError) {
        console.error("Error syncing co-claimer on bed signup:", updateError);
      }
    }

    return { stay, error: null };
  } catch (error) {
    console.error("Error updating stay:", error);
    return { stay: null, error: error as Error };
  }
}

/**
 * Delete a stay
 */
export async function deleteStay(stayId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Get the stay first to check for linked expense and bed signup
    const { data: stay } = await supabase
      .from("stays")
      .select("linked_expense_id, bed_signup_id")
      .eq("id", stayId)
      .single();

    // Delete linked expense if exists (cascades to splits)
    if (stay?.linked_expense_id) {
      await supabase.from("expenses").delete().eq("id", stay.linked_expense_id);
    }

    // Delete bed signup if exists (releases the bed claim)
    if (stay?.bed_signup_id) {
      await supabase.from("bed_signups").delete().eq("id", stay.bed_signup_id);
    }

    // Delete the stay
    const { error } = await supabase
      .from("stays")
      .delete()
      .eq("id", stayId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting stay:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Settle a guest fee (mark as paid)
 */
export async function settleGuestFee(splitId: string): Promise<{
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
    console.error("Error settling guest fee:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Unsettle a guest fee (mark as unpaid)
 */
export async function unsettleGuestFee(splitId: string): Promise<{
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
    console.error("Error unsettling guest fee:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get house events for calendar
 */
export async function getHouseEvents(houseId: string): Promise<{
  events: Array<{
    id: string;
    name: string;
    event_date: string;
    end_date: string | null;
  }>;
  error: Error | null;
}> {
  try {
    const { data: events, error } = await supabase
      .from("events")
      .select("id, name, event_date, end_date")
      .eq("house_id", houseId)
      .order("event_date", { ascending: true });

    if (error) {
      return { events: [], error };
    }

    return { events: events || [], error: null };
  } catch (error) {
    console.error("Error fetching house events:", error);
    return { events: [], error: error as Error };
  }
}
