"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { CheckoutLink } from "@convex-dev/polar/react";
import { api } from "@convex/_generated/api";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";

export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const studioQuery = useQuery(api.studios.getStudioBySlug, { slug });
  const { user, isLoaded } = useUser();

  // Loading hone tak render mat karo
  if (!isLoaded || studioQuery === undefined) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  // Studio nahi mila
  if (studioQuery === null) {
    return <div className="p-6 text-sm text-muted-foreground">Studio not found</div>;
  }

  // User nahi mila
  if (!user) {
    return <div className="p-6 text-sm text-muted-foreground">Not authenticated</div>;
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <UserButton />

      <p className="text-sm text-muted-foreground">
        Studio — {studioQuery.name} ({studioQuery._id})
      </p>

      <CheckoutLink
        polarApi={api.billing}
        productIds={["07584e5f-8c3f-4099-9e86-31dd7dc133de"]}
        embed={false}
        metadata={{
          userId: user.id,
          studioId: studioQuery._id,
        }}
      >
        Upgrade to Indie
      </CheckoutLink>

      <CheckoutLink
        polarApi={api.billing}
        productIds={["8152d6a7-0b56-4fe3-b39a-98333a6fcfb7"]}
        embed={false}
        metadata={{
          userId: user.id,
          studioId: studioQuery._id,
        }}
      >
        Upgrade to Pro
      </CheckoutLink>
    </div>
  );
}