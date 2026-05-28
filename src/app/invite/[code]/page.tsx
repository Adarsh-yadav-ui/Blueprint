"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const invite = useQuery(api.invites.getInviteByCode, { code });
  const getMyStudios = useQuery(api.studios.getMyStudios);
  const joinByCode = useMutation(api.invites.joinByCode);
  const [loading, setLoading] = useState(false);

  // Already member hai toh redirect karo
  useEffect(() => {
    if (!invite || invite.status !== "valid" || !getMyStudios) return;

    const alreadyMember = getMyStudios.some((s) => s._id === invite.studioId);
    if (alreadyMember) {
      toast.info("You are already a member of this studio");
      router.push(`/dashboard/studio/${invite.studio?.slug}`);
    }
  }, [invite, getMyStudios, router]);

  // Used invite — already member hoga — useEffect redirect kar dega
  useEffect(() => {
    if (!invite || invite.status !== "used" || !getMyStudios) return;
    const alreadyMember = getMyStudios.some((s) => s._id === invite.studioId);
    if (alreadyMember) {
      router.push(`/dashboard`);
    }
  }, [invite, getMyStudios, router]);

  async function handleJoin() {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    try {
      setLoading(true);
      await joinByCode({ code });
      toast.success("Joined studio!");
      if (invite?.status === "valid") {
        router.push(`/dashboard/studio/${invite.studio?.slug}`);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Clerk loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Invite loading
  if (invite === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading invite...</p>
      </div>
    );
  }

  // Invalid
  if (invite.status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 border-2 border-border rounded-base p-8 bg-secondary-background shadow-shadow">
          <h1 className="text-xl font-heading">Invalid invite</h1>
          <p className="text-sm text-muted-foreground">
            This invite link is invalid.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Expired
  if (invite.status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 border-2 border-border rounded-base p-8 bg-secondary-background shadow-shadow">
          <h1 className="text-xl font-heading">Invite expired</h1>
          <p className="text-sm text-muted-foreground">
            This invite link has expired.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Used — redirecting
  if (invite.status === "used") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  // Valid invite
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 border-2 border-border rounded-base p-8 bg-secondary-background shadow-shadow w-full max-w-md">
        {/* Studio icon */}
        <div className="w-16 h-16 rounded-base border-2 border-border bg-main flex items-center justify-center font-heading text-main-foreground text-2xl">
          {invite.studio?.name.charAt(0).toUpperCase()}
        </div>

        {/* Studio info */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-heading">{invite.studio?.name}</h1>
          {invite.studio?.description && (
            <p className="text-sm text-muted-foreground">
              {invite.studio.description}
            </p>
          )}
        </div>

        {/* Role info */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">You will join as</span>
          <span className="px-2 py-0.5 rounded-base border border-border font-heading capitalize">
            {invite.role}
          </span>
        </div>

        {/* Not signed in warning */}
        {!isSignedIn && (
          <p className="text-xs text-muted-foreground text-center">
            You need to sign in before joining this studio
          </p>
        )}

        {/* Join button */}
        <Button className="w-full" onClick={handleJoin} disabled={loading}>
          {loading
            ? "Joining..."
            : !isSignedIn
              ? "Sign in to join"
              : `Join ${invite.studio?.name}`}
        </Button>

        {/* Expiry info */}
        <p className="text-xs text-muted-foreground">
          Invite expires{" "}
          {new Date(invite.expiresAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
