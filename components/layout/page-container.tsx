import { cn } from "@/lib/utils";
import { mobileLayout } from "@/lib/mobile-design";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
  /** Full-bleed (inbox, kanban) — negates horizontal padding */
  bleed?: boolean;
};

export function PageContainer({
  children,
  className,
  bleed = false,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl",
        mobileLayout.pagePy,
        mobileLayout.pagePbFab,
        !bleed && mobileLayout.pagePx,
        bleed && "px-0",
        className
      )}
    >
      {children}
    </div>
  );
}
