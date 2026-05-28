"use client";

import { UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const createStudio = useMutation(api.studios.createStudio);
  const studios = useQuery(api.studios.getMyStudios);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const router = useRouter();

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Studio name is required");
      return;
    }

    try {
      setLoading(true);
      await createStudio({ name, description });
      toast.success("Studio created!");
      setName("");
      setDescription("");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading">My Studios</h1>
        <div className="flex items-center gap-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Create Studio</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Create a new studio</DialogTitle>
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-heading">Studio name</label>
                  <Input
                    placeholder="My Indie Studio"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-heading">
                    Description{" "}
                    <span className="font-base text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <Textarea
                    placeholder="What are you building?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating..." : "Create studio"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <UserButton />
        </div>
      </div>

      {/* Studios list */}
      {studios === undefined ? (
        // Loading state
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-2 p-4 rounded-base border-2 border-border bg-secondary-background"
            >
              {/* Icon + Name */}
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-base" />
                <Skeleton className="h-5 w-32" />
              </div>

              {/* Description */}
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-2">
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : studios.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed border-border rounded-base">
          <p className="text-lg font-heading">No studios yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first studio to get started
          </p>
          <Button onClick={() => setOpen(true)}>Create Studio</Button>
        </div>
      ) : (
        // Studios grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {studios?.map((studio) => (
            <div
              key={studio._id}
              onClick={() => router.push(`/dashboard/studio/${studio.slug}`)}
              className="flex flex-col gap-2 p-4 rounded-base border-2 border-border bg-secondary-background shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none transition-all cursor-pointer"
            >
              {/* Studio icon + name */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-base border-2 border-border bg-main flex items-center justify-center font-heading text-main-foreground text-lg">
                  {studio.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="font-heading text-lg">{studio.name}</h2>
              </div>

              {/* Description */}
              {studio.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {studio.description}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-2">
                <span className="text-xs font-base px-2 py-0.5 rounded-base border border-border capitalize">
                  {studio.plan}
                </span>
                <span className="text-xs text-muted-foreground">
                  {studio.seatCount} {studio.seatCount === 1 ? "seat" : "seats"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
