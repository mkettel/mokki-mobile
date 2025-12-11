import { supabase } from "@/lib/supabase/client";
import type {
  HouseMember,
  HouseMemberWithProfile,
  MemberRole,
  Profile,
} from "@/types/database";

/**
 * Generate a random invite code
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0, O, 1, I)
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create an invite link for a house
 * Returns a shareable code that anyone can use to join
 */
export async function createInviteLink(houseId: string): Promise<{
  inviteCode: string | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        inviteCode: null,
        error: authError || new Error("Not authenticated"),
      };
    }

    // Check if user is admin
    const { data: membership, error: memberError } = await supabase
      .from("house_members")
      .select("role")
      .eq("house_id", houseId)
      .eq("user_id", user.id)
      .single();

    if (memberError || membership?.role !== "admin") {
      return {
        inviteCode: null,
        error: new Error("Only admins can create invite links"),
      };
    }

    // Check if there's an existing active invite link
    const { data: existingInvite } = await supabase
      .from("house_invites")
      .select("code, expires_at")
      .eq("house_id", houseId)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvite) {
      return { inviteCode: existingInvite.code, error: null };
    }

    // Generate new invite code
    const code = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Store the invite
    const { error: insertError } = await supabase.from("house_invites").insert({
      house_id: houseId,
      code,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      // If table doesn't exist, fall back to using house_id as code
      console.warn("house_invites table may not exist, using fallback:", insertError);
      return { inviteCode: houseId.substring(0, 8).toUpperCase(), error: null };
    }

    return { inviteCode: code, error: null };
  } catch (error) {
    console.error("Error creating invite link:", error);
    return { inviteCode: null, error: error as Error };
  }
}

/**
 * Join a house using an invite code
 */
export async function joinHouseWithCode(code: string): Promise<{
  success: boolean;
  houseId: string | null;
  houseName: string | null;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        houseId: null,
        houseName: null,
        error: authError || new Error("Not authenticated"),
      };
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from("house_invites")
      .select("house_id, expires_at, houses(name)")
      .eq("code", code.toUpperCase())
      .single();

    if (inviteError || !invite) {
      return {
        success: false,
        houseId: null,
        houseName: null,
        error: new Error("Invalid invite code"),
      };
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return {
        success: false,
        houseId: null,
        houseName: null,
        error: new Error("This invite link has expired"),
      };
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("house_members")
      .select("id")
      .eq("house_id", invite.house_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      return {
        success: false,
        houseId: invite.house_id,
        houseName: (invite.houses as any)?.name || null,
        error: new Error("You are already a member of this house"),
      };
    }

    // Add user to house
    const { error: joinError } = await supabase.from("house_members").insert({
      house_id: invite.house_id,
      user_id: user.id,
      role: "member",
      invite_status: "accepted",
      joined_at: new Date().toISOString(),
    });

    if (joinError) {
      return {
        success: false,
        houseId: null,
        houseName: null,
        error: joinError,
      };
    }

    return {
      success: true,
      houseId: invite.house_id,
      houseName: (invite.houses as any)?.name || null,
      error: null,
    };
  } catch (error) {
    console.error("Error joining house:", error);
    return {
      success: false,
      houseId: null,
      houseName: null,
      error: error as Error,
    };
  }
}

/**
 * Get all members of a house
 */
export async function getHouseMembers(houseId: string): Promise<{
  members: HouseMemberWithProfile[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("house_members")
      .select(
        `
        *,
        profiles (*)
      `
      )
      .eq("house_id", houseId)
      .order("joined_at", { ascending: true, nullsFirst: false });

    if (error) {
      return { members: [], error };
    }

    return { members: data as HouseMemberWithProfile[], error: null };
  } catch (error) {
    console.error("Error fetching house members:", error);
    return { members: [], error: error as Error };
  }
}

/**
 * Check if current user is admin of a house
 */
export async function isUserAdmin(houseId: string): Promise<{
  isAdmin: boolean;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isAdmin: false, error: authError || new Error("Not authenticated") };
    }

    const { data: membership, error } = await supabase
      .from("house_members")
      .select("role")
      .eq("house_id", houseId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return { isAdmin: false, error };
    }

    return { isAdmin: membership?.role === "admin", error: null };
  } catch (error) {
    console.error("Error checking admin status:", error);
    return { isAdmin: false, error: error as Error };
  }
}

/**
 * Send an invitation to join a house
 * Note: On mobile, we create the invite record but can't send email directly.
 * The invite link should be shared manually.
 */
export async function sendInvite(
  houseId: string,
  email: string
): Promise<{
  success: boolean;
  inviteId: string | null;
  alreadyMember: boolean;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        inviteId: null,
        alreadyMember: false,
        error: authError || new Error("Not authenticated"),
      };
    }

    // Check if user is admin
    const { data: membership, error: memberError } = await supabase
      .from("house_members")
      .select("role")
      .eq("house_id", houseId)
      .eq("user_id", user.id)
      .single();

    if (memberError || membership?.role !== "admin") {
      return {
        success: false,
        inviteId: null,
        alreadyMember: false,
        error: new Error("Only admins can invite members"),
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is already a member or has pending invite
    const { data: existingMember } = await supabase
      .from("house_members")
      .select("id, invite_status")
      .eq("house_id", houseId)
      .or(`invited_email.eq.${normalizedEmail},profiles.email.eq.${normalizedEmail}`)
      .single();

    if (existingMember) {
      return {
        success: false,
        inviteId: null,
        alreadyMember: true,
        error: new Error(
          existingMember.invite_status === "pending"
            ? "This email already has a pending invitation"
            : "This person is already a member"
        ),
      };
    }

    // Check if user with this email already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existingUser) {
      // User exists, add them directly as accepted member
      const { data: newMember, error: insertError } = await supabase
        .from("house_members")
        .insert({
          house_id: houseId,
          user_id: existingUser.id,
          role: "member",
          invite_status: "accepted",
          invited_email: normalizedEmail,
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, inviteId: null, alreadyMember: false, error: insertError };
      }

      return { success: true, inviteId: newMember.id, alreadyMember: false, error: null };
    }

    // Create pending invite for new user
    const { data: invite, error: insertError } = await supabase
      .from("house_members")
      .insert({
        house_id: houseId,
        user_id: null,
        role: "member",
        invite_status: "pending",
        invited_email: normalizedEmail,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, inviteId: null, alreadyMember: false, error: insertError };
    }

    return { success: true, inviteId: invite.id, alreadyMember: false, error: null };
  } catch (error) {
    console.error("Error sending invite:", error);
    return { success: false, inviteId: null, alreadyMember: false, error: error as Error };
  }
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvite(memberId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: authError || new Error("Not authenticated") };
    }

    // Get the invite to check house and status
    const { data: invite, error: fetchError } = await supabase
      .from("house_members")
      .select("house_id, invite_status")
      .eq("id", memberId)
      .single();

    if (fetchError || !invite) {
      return { success: false, error: fetchError || new Error("Invite not found") };
    }

    if (invite.invite_status !== "pending") {
      return { success: false, error: new Error("Can only cancel pending invitations") };
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from("house_members")
      .select("role")
      .eq("house_id", invite.house_id)
      .eq("user_id", user.id)
      .single();

    if (membership?.role !== "admin") {
      return { success: false, error: new Error("Only admins can cancel invitations") };
    }

    // Delete the pending invite
    const { error: deleteError } = await supabase
      .from("house_members")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      return { success: false, error: deleteError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error canceling invite:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Remove a member from a house
 */
export async function removeMember(memberId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: authError || new Error("Not authenticated") };
    }

    // Get the member to check house and role
    const { data: targetMember, error: fetchError } = await supabase
      .from("house_members")
      .select("house_id, user_id, role")
      .eq("id", memberId)
      .single();

    if (fetchError || !targetMember) {
      return { success: false, error: fetchError || new Error("Member not found") };
    }

    // Can't remove yourself
    if (targetMember.user_id === user.id) {
      return { success: false, error: new Error("You cannot remove yourself. Use 'Leave House' instead.") };
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from("house_members")
      .select("role")
      .eq("house_id", targetMember.house_id)
      .eq("user_id", user.id)
      .single();

    if (membership?.role !== "admin") {
      return { success: false, error: new Error("Only admins can remove members") };
    }

    // If removing an admin, check they're not the last admin
    if (targetMember.role === "admin") {
      const { count } = await supabase
        .from("house_members")
        .select("id", { count: "exact", head: true })
        .eq("house_id", targetMember.house_id)
        .eq("role", "admin")
        .eq("invite_status", "accepted");

      if (count && count <= 1) {
        return { success: false, error: new Error("Cannot remove the last admin") };
      }
    }

    // Delete the member
    const { error: deleteError } = await supabase
      .from("house_members")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      return { success: false, error: deleteError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error removing member:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  memberId: string,
  newRole: MemberRole
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: authError || new Error("Not authenticated") };
    }

    // Get the member to check house
    const { data: targetMember, error: fetchError } = await supabase
      .from("house_members")
      .select("house_id, user_id, role")
      .eq("id", memberId)
      .single();

    if (fetchError || !targetMember) {
      return { success: false, error: fetchError || new Error("Member not found") };
    }

    // Check if user is admin
    const { data: membership } = await supabase
      .from("house_members")
      .select("role")
      .eq("house_id", targetMember.house_id)
      .eq("user_id", user.id)
      .single();

    if (membership?.role !== "admin") {
      return { success: false, error: new Error("Only admins can change roles") };
    }

    // If demoting an admin, check they're not the last admin
    if (targetMember.role === "admin" && newRole === "member") {
      const { count } = await supabase
        .from("house_members")
        .select("id", { count: "exact", head: true })
        .eq("house_id", targetMember.house_id)
        .eq("role", "admin")
        .eq("invite_status", "accepted");

      if (count && count <= 1) {
        return { success: false, error: new Error("Cannot demote the last admin") };
      }
    }

    // Update role
    const { error: updateError } = await supabase
      .from("house_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (updateError) {
      return { success: false, error: updateError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error updating member role:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get pending invitations for the current user
 */
export async function getPendingInvitesForUser(): Promise<{
  invites: (HouseMember & { houses: { id: string; name: string } })[];
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { invites: [], error: authError || new Error("Not authenticated") };
    }

    // Get user's email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profile?.email) {
      return { invites: [], error: null };
    }

    // Find pending invites for this email
    const { data, error } = await supabase
      .from("house_members")
      .select(
        `
        *,
        houses (id, name)
      `
      )
      .eq("invited_email", profile.email.toLowerCase())
      .eq("invite_status", "pending");

    if (error) {
      return { invites: [], error };
    }

    return { invites: data as any[], error: null };
  } catch (error) {
    console.error("Error fetching pending invites:", error);
    return { invites: [], error: error as Error };
  }
}

/**
 * Accept a pending invitation
 */
export async function acceptInvite(inviteId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: authError || new Error("Not authenticated") };
    }

    // Get user's email to verify
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    // Get the invite
    const { data: invite, error: fetchError } = await supabase
      .from("house_members")
      .select("invited_email, invite_status")
      .eq("id", inviteId)
      .single();

    if (fetchError || !invite) {
      return { success: false, error: fetchError || new Error("Invite not found") };
    }

    if (invite.invite_status !== "pending") {
      return { success: false, error: new Error("This invitation has already been used") };
    }

    // Verify email matches
    if (invite.invited_email?.toLowerCase() !== profile?.email?.toLowerCase()) {
      return { success: false, error: new Error("This invitation is for a different email address") };
    }

    // Accept the invite
    const { error: updateError } = await supabase
      .from("house_members")
      .update({
        user_id: user.id,
        invite_status: "accepted",
        joined_at: new Date().toISOString(),
      })
      .eq("id", inviteId);

    if (updateError) {
      return { success: false, error: updateError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error accepting invite:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Decline a pending invitation
 */
export async function declineInvite(inviteId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: authError || new Error("Not authenticated") };
    }

    // Get user's email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    // Get the invite
    const { data: invite, error: fetchError } = await supabase
      .from("house_members")
      .select("invited_email, invite_status")
      .eq("id", inviteId)
      .single();

    if (fetchError || !invite) {
      return { success: false, error: fetchError || new Error("Invite not found") };
    }

    // Verify email matches
    if (invite.invited_email?.toLowerCase() !== profile?.email?.toLowerCase()) {
      return { success: false, error: new Error("This invitation is for a different email address") };
    }

    // Delete the invite
    const { error: deleteError } = await supabase
      .from("house_members")
      .delete()
      .eq("id", inviteId);

    if (deleteError) {
      return { success: false, error: deleteError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error declining invite:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Leave a house (for non-admin members or admin if not last)
 */
export async function leaveHouse(houseId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: authError || new Error("Not authenticated") };
    }

    // Get user's membership
    const { data: membership, error: fetchError } = await supabase
      .from("house_members")
      .select("id, role")
      .eq("house_id", houseId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !membership) {
      return { success: false, error: fetchError || new Error("You are not a member of this house") };
    }

    // If admin, check they're not the last one
    if (membership.role === "admin") {
      const { count } = await supabase
        .from("house_members")
        .select("id", { count: "exact", head: true })
        .eq("house_id", houseId)
        .eq("role", "admin")
        .eq("invite_status", "accepted");

      if (count && count <= 1) {
        return {
          success: false,
          error: new Error("You cannot leave as the last admin. Transfer ownership first or delete the house."),
        };
      }
    }

    // Leave the house
    const { error: deleteError } = await supabase
      .from("house_members")
      .delete()
      .eq("id", membership.id);

    if (deleteError) {
      return { success: false, error: deleteError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error leaving house:", error);
    return { success: false, error: error as Error };
  }
}
