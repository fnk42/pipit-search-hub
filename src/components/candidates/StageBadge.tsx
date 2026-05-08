import { cn } from "@/lib/utils";

const ACTIVE = new Set(["Sourced", "Contacted", "Engaged", "Screening", "Client Interview", "Offer"]);

export function StageBadge({ stage, className }: { stage: string; className?: string }) {
  let style = "bg-muted text-muted-foreground border border-border";
  if (stage === "Placed") style = "bg-accent text-accent-foreground";
  else if (stage === "Declined" || stage === "Passed") style = "bg-muted text-muted-foreground border border-border line-through decoration-1";
  else if (ACTIVE.has(stage)) style = "bg-primary/10 text-primary border border-primary/20";

  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap", style, className)}>
      {stage}
    </span>
  );
}
