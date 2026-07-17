import { cn } from "@/lib/utils";

interface AuthBackgroundProps {
  className?: string;
}

export function AuthBackground({ className }: AuthBackgroundProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-navy via-navy-light to-navy",
        className
      )}
      aria-hidden="true"
    >
      {/* Subtle dot grid overlay */}
      <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle,hsl(var(--cyan))_1px,transparent_1px)] bg-[length:24px_24px]" />

      {/* Animated gradient orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px] animate-orb-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-cyan/15 blur-[140px] animate-orb-2" />
      <div className="absolute top-[40%] left-[60%] w-[30vw] h-[30vw] rounded-full bg-teal/10 blur-[100px] animate-orb-3" />

      {/* Soft vignette to keep focus on the card */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--navy))_80%)] opacity-60" />
    </div>
  );
}
