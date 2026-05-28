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
      q.eq("clerkUserId", identity.subject)
    )
    .unique();

  if (!user) throw new Error("User not found");
  return user;
}

// ──────────────────────────────────────────
// REMOVE MEMBER
// Sirf owner remove kar sakta hai
// Owner khud ko remove nahi kar sakta
// ──────────────────────────────────────────
export const removeMember = mutation({
  args: {
    studioId: v.id("studios"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Current user ka membership check karo
    const currentMembership = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", args.studioId).eq("userId", user._id)
      )
      .unique();

    if (!currentMembership) throw new Error("Access denied");
    if (currentMembership.role !== "owner") {
      throw new Error("Only owner can remove members");
    }

    // Owner khud ko remove nahi kar sakta
    if (args.userId === user._id) {
      throw new Error("Owner cannot remove themselves");
    }

    // Target member fetch karo
    const targetMembership = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", args.studioId).eq("userId", args.userId)
      )
      .unique();

    if (!targetMembership) throw new Error("Member not found");

    // Member remove karo
    await ctx.db.delete(targetMembership._id);

    // Seat count update karo
    const studio = await ctx.db.get(args.studioId);
    if (studio) {
      await ctx.db.patch(args.studioId, {
        seatCount: Math.max(1, studio.seatCount - 1),
      });
    }

    return true;
  },
});

// ──────────────────────────────────────────
// CHANGE ROLE
// Sirf owner role change kar sakta hai
// Owner apna role change nahi kar sakta
// ──────────────────────────────────────────
export const changeRole = mutation({
  args: {
    studioId: v.id("studios"),
    userId: v.id("users"),
    role: v.union(
      v.literal("editor"),
      v.literal("viewer"),
      v.literal("guest")
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Current user owner hai check karo
    const currentMembership = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", args.studioId).eq("userId", user._id)
      )
      .unique();

    if (!currentMembership) throw new Error("Access denied");
    if (currentMembership.role !== "owner") {
      throw new Error("Only owner can change roles");
    }

    // Owner apna role change nahi kar sakta
    if (args.userId === user._id) {
      throw new Error("Owner cannot change their own role");
    }

    // Target member fetch karo
    const targetMembership = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", args.studioId).eq("userId", args.userId)
      )
      .unique();

    if (!targetMembership) throw new Error("Member not found");

    // Role update karo
    await ctx.db.patch(targetMembership._id, { role: args.role });

    return true;
  },
});

// ──────────────────────────────────────────
// LEAVE STUDIO
// Member khud studio chhod sakta hai
// Owner leave nahi kar sakta — pehle ownership transfer karo
// ──────────────────────────────────────────
export const leaveStudio = mutation({
  args: {
    studioId: v.id("studios"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const membership = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", args.studioId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Not a member");

    // Owner leave nahi kar sakta
    if (membership.role === "owner") {
      throw new Error("Owner cannot leave — transfer ownership first");
    }

    // Member remove karo
    await ctx.db.delete(membership._id);

    // Seat count update karo
    const studio = await ctx.db.get(args.studioId);
    if (studio) {
      await ctx.db.patch(args.studioId, {
        seatCount: Math.max(1, studio.seatCount - 1),
      });
    }

    return true;
  },
});