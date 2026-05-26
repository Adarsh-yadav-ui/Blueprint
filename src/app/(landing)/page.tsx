"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";

export default function Home() {
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
