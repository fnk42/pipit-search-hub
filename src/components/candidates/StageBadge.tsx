import { cn } from "@/lib/utils";

type Tone = "neutral" | "sky" | "sage" | "indigo" | "amber" | "clay-1" | "clay-2" | "clay-3" | "clay-4";

const STAGE_TONE: Record<string, Tone> = {
  "Sourced": "neutral",
  "For Sean - Please reach out": "neutral",
  "Reached Out": "sky",
  "Reached Out-Referral": "sky",
  "Responded/Scheduled for Screening": "sage",
  "Profile Screened by Sam": "sage",
  "Profile Screened by Stephanie": "sage",
  "Initial Screening (Sam/Stephanie)": "indigo",
  "Final Screening (Sean)": "indigo",
  "Client Interviews": "amber",
  "Offer": "amber",
  "Placed": "amber",
  "Rejected by Candidate": "clay-1",
  "Rejected by Transformari": "clay-2",
  "Rejected by Client": "clay-3",
  "Rejected by GPR (Felix)": "clay-4",
};

const TONE_CLASS: Record<Tone, string> = {
  "neutral": "bg-muted text-muted-foreground border-border",
  "sky":     "bg-[var(--metric-sky-bg)] text-[var(--metric-sky)] border-[var(--metric-sky)]/20",
  "sage":    "bg-[var(--metric-sage-bg)] text-[var(--metric-sage)] border-[var(--metric-sage)]/20",
  "indigo":  "bg-[var(--metric-indigo-bg)] text-[var(--metric-indigo)] border-[var(--metric-indigo)]/20",
  "amber":   "bg-[var(--metric-amber-bg)] text-[var(--metric-amber)] border-[var(--metric-amber)]/25",
  "clay-1":  "bg-[oklch(0.96_0.022_25)] text-[oklch(0.50_0.13_25)] border-[oklch(0.50_0.13_25)]/20",
  "clay-2":  "bg-[oklch(0.96_0.030_35)] text-[oklch(0.55_0.13_35)] border-[oklch(0.55_0.13_35)]/25",
  "clay-3":  "bg-[oklch(0.96_0.022_15)] text-[oklch(0.52_0.13_15)] border-[oklch(0.52_0.13_15)]/20",
  "clay-4":  "bg-[oklch(0.95_0.025_5)] text-[oklch(0.50_0.14_5)] border-[oklch(0.50_0.14_5)]/20",
};

export function StageBadge({ stage, className }: { stage: string; className?: string }) {
  const tone = STAGE_TONE[stage] ?? "neutral";
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap border",
      TONE_CLASS[tone],
      className,
    )}>
      {stage}
    </span>
  );
}
