"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-main" />
      </div>
    );
  }

  if (isSignedIn) {
    return null;
  }
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <Unauthenticated>
        <p className="text-sm text-zinc-500">You are not signed in</p>
        <SignInButton mode="modal" />
      </Unauthenticated>

      <Authenticated>
        <p className="text-sm text-zinc-500">You are signed in ✅</p>
        <UserButton />
      </Authenticated>
    </div>
  );
}
