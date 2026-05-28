"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useParams } from "next/navigation";

export default function StudioPage() {
  const { slug } = useParams<{ slug: string }>();
  const studio = useQuery(api.studios.getStudioBySlug, { slug });

  if (studio === undefined) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (studio === null) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Studio not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-base border-2 border-border bg-main flex items-center justify-center font-heading text-main-foreground text-xl">
          {studio.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-heading">{studio.name}</h1>
          {studio.description && (
            <p className="text-sm text-muted-foreground">{studio.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-base px-2 py-0.5 rounded-base border border-border capitalize">
          {studio.plan}
        </span>
        <span className="text-xs text-muted-foreground">
          {studio.seatCount} {studio.seatCount === 1 ? "seat" : "seats"}
        </span>
        <span className="text-xs text-muted-foreground capitalize">
          Your role — {studio.role}
        </span>
      </div>
    </div>
  );
}