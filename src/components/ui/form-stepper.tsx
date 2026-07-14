import * as React from"react";
import { Check } from"lucide-react";
import { cn } from"@/lib/utils";

/**
 * FormStepper - premium glassmorphism stepper for multi-step forms.
 * Renders the step indicator only. Parent controls active step + content.
 */
export interface FormStep {
 id: string;
 label: string;
 description?: string;
}

interface FormStepperProps {
 steps: FormStep[];
 current: number;
 onStepClick?: (index: number) => void;
 className?: string;
}

export const FormStepper: React.FC<FormStepperProps> = ({ steps, current, onStepClick, className }) => {
 return (
 <nav aria-label="Progression du formulaire"className={cn("w-full", className)}>
 <ol className="flex items-center gap-2 sm:gap-4">
 {steps.map((step, index) => {
 const isComplete = index < current;
 const isActive = index === current;
 const clickable = !!onStepClick && index <= current;
 return (
 <li key={step.id} className="flex-1 min-w-0">
 <button
 type="button" disabled={!clickable}
 onClick={() => clickable && onStepClick?.(index)}
 aria-current={isActive ?"step": undefined}
 className={cn(
"group w-full text-left rounded-lg px-2 py-1.5 transition-all",
 clickable &&"hover:bg-accent/40 cursor-pointer",
 !clickable &&"cursor-default",
 )}
 >
 <div className="flex items-center gap-2.5">
 <span
 className={cn(
"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold border transition-all",
 isComplete &&"bg-primary text-white border-transparent shadow-sm",
 isActive &&
"bg-background border-primary text-primary ring-4 ring-primary/15",
 !isActive && !isComplete &&"bg-muted/60 border-border text-muted-foreground",
 )}
 >
 {isComplete ? <Check className="h-3.5 w-3.5"/> : index + 1}
 </span>
 <div className="min-w-0 hidden sm:block">
 <div
 className={cn(
"text-sm font-medium truncate",
 isActive ?"text-foreground":"text-muted-foreground",
 )}
 >
 {step.label}
 </div>
 {step.description && (
 <div className="text-[11px] text-muted-foreground/80 truncate">{step.description}</div>
 )}
 </div>
 </div>
 </button>
 {index < steps.length - 1 && (
 <div
 aria-hidden="true" className={cn(
"mt-1 h-0.5 rounded-full transition-colors",
 isComplete ?"bg-gradient-primary-deep":"bg-border/70",
 )}
 />
 )}
 </li>
 );
 })}
 </ol>
 </nav>
 );
};
