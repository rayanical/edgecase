import * as React from "react";
import { cn } from "../../../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, ...props }, ref) => {
  return (
    <input
      className={cn(
        "flex h-8 w-full rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";
export { Input };
