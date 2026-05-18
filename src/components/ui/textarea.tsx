import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-lg border border-input/70 bg-background/60 backdrop-blur-sm px-3.5 py-2.5 text-sm shadow-sm ring-offset-background transition-all duration-200",
        "placeholder:text-muted-foreground/70",
        "hover:border-primary/40 hover:bg-background/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:border-primary/50 focus-visible:bg-background",
        "aria-[invalid=true]:border-destructive/70 aria-[invalid=true]:ring-destructive/30 aria-[invalid=true]:focus-visible:ring-destructive/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
