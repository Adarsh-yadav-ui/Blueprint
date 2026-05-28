import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ──────────────────────────────────────────
// Helper — current user Convex se fetch karo
// Har function mein yeh use karo — clerkId se user dhundho
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
// CREATE STUDIO
// Naya studio banao + owner ko studioMembers mein add karo
// slug automatically name se generate hoga
// ──────────────────────────────────────────
export const createStudio = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Slug generate karo — "My Studio" → "my-studio"
    const slug = args.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check karo slug already exist toh nahi karta
    const existing = await ctx.db
      .query("studios")
      .withIndex("bySlug", (q: any) => q.eq("slug", slug))
      .unique();

    if (existing) throw new Error("Studio name already taken");

    // Studio banao
    const studioId = await ctx.db.insert("studios", {
      name: args.name,
      slug,
      ownerId: user._id,
      plan: "free",
      seatCount: 1,
      description: args.description,
    });

    // Owner ko automatically studioMembers mein add karo
    await ctx.db.insert("studioMembers", {
      studioId,
      userId: user._id,
      role: "owner",
    });

    return studioId;
  },
});

// ──────────────────────────────────────────
// GET MY STUDIOS
// Current user ke saare studios fetch karo
// studioMembers join table se dhundho
// ──────────────────────────────────────────
export const getMyStudios = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const memberships = await ctx.db
      .query("studioMembers")
      .withIndex("byUserId", (q: any) => q.eq("userId", user._id))
      .collect();

    // Sirf studios fetch karo — filter nulls aur type assert karo
    const studios = await Promise.all(
      memberships.map((m: any) => ctx.db.get(m.studioId)),
    );

    return studios.filter(Boolean) as Array<{
      _id: any;
      _creationTime: number;
      name: string;
      slug: string;
      ownerId: any;
      plan: "free" | "indie" | "pro";
      seatCount: number;
      description?: string;
      logo?: string;
      polarSubscriptionId?: string;
      polarCustomerId?: string;
    }>;
  },
});

// ──────────────────────────────────────────
// GET STUDIO BY SLUG
// URL se studio fetch karo
// IMPORTANT — member check karo — non-member ko access nahi
// ──────────────────────────────────────────
export const getStudioBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const studio = await ctx.db
      .query("studios")
      .withIndex("bySlug", (q: any) => q.eq("slug", args.slug))
      .unique();

    if (!studio) throw new Error("Studio not found");

    // Member hai ya nahi check karo — TENANT ISOLATION
    const membership = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", studio._id).eq("userId", user._id),
      )
      .unique();

    if (!membership) throw new Error("Access denied");

    return { ...studio, role: membership.role };
  },
});

// ──────────────────────────────────────────
// GET STUDIO MEMBERS
// Studio ke saare members fetch karo
// ──────────────────────────────────────────
export const getStudioMembers = query({
  args: { studioId: v.id("studios") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Pehle check karo current user is studio ka member hai
    const membership = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId_userId", (q: any) =>
        q.eq("studioId", args.studioId).eq("userId", user._id),
      )
      .unique();

    if (!membership) throw new Error("Access denied");

    // Saare members fetch karo
    const members = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId", (q: any) => q.eq("studioId", args.studioId))
      .collect();

    // Har member ke liye user details fetch karo
    const membersWithUsers = await Promise.all(
      members.map(async (m: any) => {
        const memberUser = await ctx.db.get(m.userId);
        return { ...m, user: memberUser };
      }),
    );

    return membersWithUsers;
  },
});

// ──────────────────────────────────────────
// DELETE STUDIO
// Sirf owner delete kar sakta hai
// ──────────────────────────────────────────
export const deleteStudio = mutation({
  args: { studioId: v.id("studios") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const studio = await ctx.db.get(args.studioId);
    if (!studio) throw new Error("Studio not found");

    // Sirf owner delete kar sakta hai
    if (studio.ownerId !== user._id)
      throw new Error("Only owner can delete studio");

    // Studio delete karo
    await ctx.db.delete(args.studioId);

    // Saare members bhi delete karo
    const members = await ctx.db
      .query("studioMembers")
      .withIndex("byStudioId", (q: any) => q.eq("studioId", args.studioId))
      .collect();

    await Promise.all(members.map((m: any) => ctx.db.delete(m._id)));

    return true;
  },
});
