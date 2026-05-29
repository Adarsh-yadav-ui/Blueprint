import { Polar } from "@convex-dev/polar";
import { components } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const polar = new Polar(components.polar, {
  organizationToken: process.env.POLAR_ORGANIZATION_TOKEN!,
  server: "sandbox",
  // For prod
  // products: {
  //   free: "ea8c8784-f94b-49b7-b3c1-ec244a243ee9",
  //   indie: "3e3c8542-f18b-4588-803c-a3253d0f65de",
  //   pro: "4bcabfff-d036-43c4-8ad9-2f091f49b69d",
  // },
  products: {
    free: "d50c443d-8d07-4aee-855c-f8cb4a42046f",
    indie: "07584e5f-8c3f-4099-9e86-31dd7dc133de",
    pro: "8152d6a7-0b56-4fe3-b39a-98333a6fcfb7",
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

// Polar ka built-in API export karo — CheckoutLink aur CustomerPortalLink ke liye
export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  generateCustomerPortalUrl,
  generateCheckoutLink,
} = polar.api();
// Manual sync — products Polar se Convex mein sync karo
export const syncProducts = action({
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
  },
});


export const polar_instance = polar;
