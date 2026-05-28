// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ──────────────────────────────────────────
  // USERS
  // Clerk webhook se sync hota hai automatically
  // clerkUserId se har jagah user identify karte hain
  // ──────────────────────────────────────────
  users: defineTable({
    email: v.string(),
    clerkUserId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byClerkUserId", ["clerkUserId"])
    .index("byEmail", ["email"])
    .index("byUsername", ["username"]),

  // ──────────────────────────────────────────
  // STUDIOS
  // Har studio ek isolated tenant hai — Studio A ka data Studio B ko kabhi nahi dikhna chahiye
  // plan — billing tier (free, indie, pro)
  // seatCount — Polar ko batata hai kitne seats hain currently
  // polarSubscriptionId — Polar se sync ke liye
  // ──────────────────────────────────────────
  studios: defineTable({
    name: v.string(),
    slug: v.string(), // URL mein use hoga — /studio/my-studio
    ownerId: v.id("users"), // Studio banane wala
    plan: v.union(v.literal("free"), v.literal("indie"), v.literal("pro")),
    seatCount: v.number(), // Current active members count
    polarSubscriptionId: v.optional(v.string()), // Polar subscription track karne ke liye
    polarCustomerId: v.optional(v.string()), // Polar customer ID
    logo: v.optional(v.string()), // Studio ka logo URL
    description: v.optional(v.string()), // Studio ka description
  })
    .index("bySlug", ["slug"])
    .index("byOwnerId", ["ownerId"]),

  // ──────────────────────────────────────────
  // STUDIO MEMBERS
  // Join table — kaun kaun kis studio mein hai
  // Har query mein studioId + userId dono check karo — yahi multi-tenancy enforce karta hai
  // role — owner sabse zyada access, guest sabse kam
  // ──────────────────────────────────────────
  studioMembers: defineTable({
    studioId: v.id("studios"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"), // Sab kuch kar sakta hai
      v.literal("editor"), // Documents edit kar sakta hai
      v.literal("viewer"), // Sirf dekh sakta hai
      v.literal("guest"), // Limited access
    ),
  })
    .index("byStudioId", ["studioId"])
    .index("byUserId", ["userId"])
    .index("byStudioId_userId", ["studioId", "userId"]), // Specific member dhundne ke liye

  // ──────────────────────────────────────────
  // DOCUMENTS
  // Har document ek studio ka hai — studioId mandatory
  // templateType — game-specific templates
  // parentId — nested documents ke liye (folder structure)
  // isArchived — delete nahi karte, archive karte hain
  // ──────────────────────────────────────────
  documents: defineTable({
    studioId: v.id("studios"), // Tenant isolation ke liye — KABHI MAT BHOOLNA
    title: v.string(),
    templateType: v.union(
      v.literal("character_sheet"), // Character ka poora profile
      v.literal("quest_log"), // Mission ka breakdown
      v.literal("world_map"), // Game world ka documentation
      v.literal("dialogue_tree"), // Conversation flowchart
      v.literal("faction_doc"), // Groups/organizations ka profile
      v.literal("item_sheet"), // Weapons/items ka stats
      v.literal("lore_entry"), // Game history aur mythology
      v.literal("blank"), // Empty document
    ),
    parentId: v.optional(v.id("documents")), // Nested document ke liye parent
    createdBy: v.id("users"),
    isPinned: v.boolean(), // Dashboard pe pin karne ke liye
    isArchived: v.boolean(), // Soft delete
    coverImage: v.optional(v.string()), // Document ka cover image
    icon: v.optional(v.string()), // Document ka emoji/icon
  })
    .index("byStudioId", ["studioId"])
    .index("byStudioId_parentId", ["studioId", "parentId"]) // Nested docs fetch karne ke liye
    .index("byCreatedBy", ["createdBy"]),

  // ──────────────────────────────────────────
  // BLOCKS
  // Document ke andar ka actual content
  // studioId yahan bhi hai — direct query ke liye zaroori hai
  // order — blocks ka sequence maintain karta hai
  // meta — extra data store karne ke liye (image URL, property key, etc)
  // ──────────────────────────────────────────
  blocks: defineTable({
    studioId: v.id("studios"), // Redundant lagta hai but index ke liye zaroori
    documentId: v.id("documents"), // Kis document ka block hai
    type: v.union(
      v.literal("text"),
      v.literal("heading1"),
      v.literal("heading2"),
      v.literal("heading3"),
      v.literal("image"),
      v.literal("divider"),
      v.literal("bulletList"),
      v.literal("numberedList"),
      v.literal("quote"),
      v.literal("callout"),
      v.literal("property"), // Key-value pairs — Character Sheet mein Age: 23 jaisa
    ),
    content: v.string(), // Block ka actual text content
    order: v.number(), // Block ka position document mein
    meta: v.optional(v.string()), // JSON string — extra data (image URL, property key)
  })
    .index("byDocumentId", ["documentId"])
    .index("byStudioId", ["studioId"]),

  // ──────────────────────────────────────────
  // VERSIONS
  // Har save pe document ka full snapshot
  // blocks — JSON string mein poore blocks store hote hain
  // label — "Final draft", "Before review" jaisi named versions
  // ──────────────────────────────────────────
  versions: defineTable({
    studioId: v.id("studios"),
    documentId: v.id("documents"),
    blocks: v.string(), // JSON stringify — blocks ka poora snapshot
    createdBy: v.id("users"),
    label: v.optional(v.string()), // Optional named version
  })
    .index("byDocumentId", ["documentId"])
    .index("byStudioId", ["studioId"]),

  // ──────────────────────────────────────────
  // ASSETS
  // Concept art, reference images, mood boards
  // storageId — Convex Storage ka ID
  // linkedDocumentId — asset ko document se link karne ke liye
  // ──────────────────────────────────────────
  assets: defineTable({
    studioId: v.id("studios"),
    storageId: v.string(), // Convex Storage ID
    name: v.string(), // Asset ka display name
    tags: v.array(v.string()), // Search aur filter ke liye
    linkedDocumentId: v.optional(v.id("documents")), // Linked document
    uploadedBy: v.id("users"),
  }).index("byStudioId", ["studioId"]),

  // ──────────────────────────────────────────
  // INVITES
  // Studio join karne ke liye invite links
  // code — unique random string — /invite/abc123
  // expiresAt — timestamp — invite expire ho jaata hai
  // usedBy — invite use ho gaya toh user ID store karo
  // ──────────────────────────────────────────
  invites: defineTable({
    studioId: v.id("studios"),
    code: v.string(), // Unique invite code
    role: v.union(v.literal("editor"), v.literal("viewer"), v.literal("guest")),
    expiresAt: v.number(), // Unix timestamp
    usedBy: v.optional(v.id("users")), // Kaun join kiya
  })
    .index("byCode", ["code"])
    .index("byStudioId", ["studioId"]),

  // ──────────────────────────────────────────
  // NOTIFICATIONS
  // In-app notifications
  // type — kaunsa event trigger hua
  // link — notification click karne pe kahan jaana hai
  // isRead — read/unread state
  // ──────────────────────────────────────────
  notifications: defineTable({
    userId: v.id("users"), // Kis user ko notification hai
    studioId: v.id("studios"),
    type: v.union(
      v.literal("comment"), // Kisi ne comment kiya
      v.literal("mention"), // Kisi ne @mention kiya
      v.literal("member_joined"), // Naya member join kiya
      v.literal("payment_failed"), // Payment fail hui
      v.literal("seat_added"), // Naya seat add hua
    ),
    message: v.string(),
    isRead: v.boolean(),
    link: v.optional(v.string()), // Click pe redirect URL
  })
    .index("byUserId", ["userId"])
    .index("byStudioId", ["studioId"]),
});
