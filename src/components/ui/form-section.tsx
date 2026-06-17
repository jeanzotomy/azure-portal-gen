import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * FormSection - glassmorphism card to group related form fields.
 * Used to refactor long forms into clear, accessible sections.
 */
interface FormSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Right-aligned content in the section header (e.g. badge, action). */
  action?: React.ReactNode;
}

export const FormSection = React.forwardRef<HTMLElement, FormSectionProps>(
  ({ className, title, description, icon, action, children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          "relative rounded-xl border border-border/60 bg-card/60 backdrop-blur-md shadow-sm",
          "transition-colors hover:border-primary/30",
          "p-5 sm:p-6 space-y-5",
          className,
        )}
        {...props}
      >
        {(title || description || icon || action) && (
          <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-border/50">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {icon && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#007aa3] text-white shadow-sm">
                  {icon}
                </div>
              )}
              <div className="space-y-1 min-w-0">
                {title && <h3 className="text-base font-semibold tracking-tight text-foreground leading-tight">{title}</h3>}
                {description && <p className="text-sm text-muted-foreground leading-snug">{description}</p>}
              </div>
            </div>
            {action && <div className="shrink-0 sm:ml-auto">{action}</div>}
          </header>
        )}
        <div className="space-y-4">{children}</div>
      </section>
    );
  },
);
FormSection.displayName = "FormSection";

/**
 * FormGrid - responsive 1/2 column grid for paired fields inside a section.
 */
export const FormGrid: React.FC<React.HTMLAttributes<HTMLDivElement> & { columns?: 1 | 2 | 3 }> = ({
  className,
  columns = 2,
  ...props
}) => {
  const colsClass = columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return <div className={cn("grid grid-cols-1 gap-4", colsClass, className)} {...props} />;
};
