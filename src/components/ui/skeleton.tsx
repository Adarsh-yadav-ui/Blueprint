import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-base border-2 border-border", className)}
      style={{
        background:
          "linear-gradient(90deg, var(--secondary-background) 25%, var(--background) 50%, var(--secondary-background) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
      {...props}
    />
  );
}

export { Skeleton };
