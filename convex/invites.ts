import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ──────────────────────────────────────────
// Helper — current user fetch karo
// ──────────────────────────────────────────
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("byClerkUserId", (q: any) =>
      q.eq("clerkUserId", identity.subject),
    )
    .unique();

  if (!user) throw new Error("User not found");
  return user;
}

// ──────────────────────────────────────────
// GENERATE INVITE CODE
// Sirf owner ya editor generate kar sakta hai
// 7 din mein expire hoga
// ──────────────────────────────────────────
export const generateInviteCode = mutation({
  args: {
    studioId: v.id("studios"),
    role: v.union(v.literal("editor"), v.literal("viewer"), v.literal("guest")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Member hai aur owner/editor hai check karo
    const membership = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", args.studioId).eq("userId", user._id),
      )
      .unique();

    if (!membership) throw new Error("Access denied");
    if (!["owner", "editor"].includes(membership.role)) {
      throw new Error("Only owner or editor can generate invite");
    }

    // Random 8 character code generate karo
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    // 7 din baad expire hoga
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("invites", {
      studioId: args.studioId,
      code,
      role: args.role,
      expiresAt,
    });

    return code;
  },
});

// ──────────────────────────────────────────
// GET INVITE BY CODE
// Public query — auth nahi chahiye
// Invite valid hai ya nahi check karo
// ──────────────────────────────────────────
export const getInviteByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("byCode", (q: any) => q.eq("code", args.code))
      .unique();

    if (!invite) return { status: "invalid" as const };
    if (invite.expiresAt < Date.now()) return { status: "expired" as const };
    if (invite.usedBy)
      return {
        status: "used" as const,
        studioId: invite.studioId,
      };

    const studio = await ctx.db.get(invite.studioId);
    return { status: "valid" as const, ...invite, studio };
  },
});

// ──────────────────────────────────────────
// JOIN BY CODE
// User invite code se studio join kare
// Already member hai toh error
// ──────────────────────────────────────────
export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const invite = await ctx.db
      .query("invites")
      .withIndex("byCode", (q: any) => q.eq("code", args.code))
      .unique();

    if (!invite) throw new Error("Invalid invite code");
    if (invite.expiresAt < Date.now()) throw new Error("Invite expired");
    if (invite.usedBy) throw new Error("Invite already used");

    // Already member hai check karo
    const existing = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", invite.studioId).eq("userId", user._id),
      )
      .unique();

    if (existing) throw new Error("Already a member");

    // Member add karo
    await ctx.db.insert("studioMembers", {
      studioId: invite.studioId,
      userId: user._id,
      role: invite.role,
    });

    // Invite mark karo as used
    await ctx.db.patch(invite._id, { usedBy: user._id });

    // Studio ka seat count update karo
    const studio = await ctx.db.get(invite.studioId);
    if (studio) {
      await ctx.db.patch(invite.studioId, {
        seatCount: studio.seatCount + 1,
      });
    }

    return invite.studioId;
  },
});

// ──────────────────────────────────────────
// GET STUDIO INVITES
// Studio ke saare active invites fetch karo
// Sirf owner/editor dekh sakta hai
// ──────────────────────────────────────────
export const getStudioInvites = query({
  args: { studioId: v.id("studios") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const membership = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", args.studioId).eq("userId", user._id),
      )
      .unique();

    if (!membership) throw new Error("Access denied");
    if (!["owner", "editor"].includes(membership.role)) {
      throw new Error("Only owner or editor can view invites");
    }

    const invites = await ctx.db
      .query("invites")
      .withIndex("byStudioId", (q: any) => q.eq("studioId", args.studioId))
      .collect();

    // Sirf active invites return karo
    return invites.filter((i) => !i.usedBy && i.expiresAt > Date.now());
  },
});

// ──────────────────────────────────────────
// REVOKE INVITE
// Invite delete karo — sirf owner/editor
// ──────────────────────────────────────────
export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    const membership = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", invite.studioId).eq("userId", user._id),
      )
      .unique();

    if (!membership) throw new Error("Access denied");
    if (!["owner", "editor"].includes(membership.role)) {
      throw new Error("Only owner or editor can revoke invites");
    }

    await ctx.db.delete(args.inviteId);
    return true;
  },
});
