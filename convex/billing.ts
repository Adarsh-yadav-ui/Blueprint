import { Polar } from "@convex-dev/polar";
import { components } from "./_generated/api";
import { action } from "./_generated/server";

export const polar = new Polar(components.polar, {
  organizationToken: "polar_oat_xxx",
  server: "production",
  products: {
    free: "ea8c8784-f94b-49b7-b3c1-ec244a243ee9",
    indie: "3e3c8542-f18b-4588-803c-a3253d0f65de",
    pro: "4bcabfff-d036-43c4-8ad9-2f091f49b69d",
  },
  getUserInfo: async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return {
      userId: identity.subject,
      email: identity.email!,
    };
  },
});

export const syncProducts = action({
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});
