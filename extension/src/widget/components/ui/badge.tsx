import * as React from "react";
import { cn } from "../../../lib/utils";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
