import { cn } from "@/lib/utils";

type Tone = "neutral" | "blue" | "green" | "amber" | "red";

const STAGE_TONE: Record<string, Tone> = {
  "Sourced": "neutral",
  "For Sean - Please reach out": "neutral",
  "Reached Out": "blue",
  "Reached Out-Referral": "blue",
  "Responded/Scheduled for Screening": "blue",
  "Profile Screened by Sam": "blue",
  "Profile Screened by Stephanie": "blue",
  "Initial Screening (Sam/Stephanie)": "blue",
  "Final Screening (Sean)": "blue",
  "Client Interviews": "amber",
  "Offer": "amber",
  "Placed": "green",
  "Rejected by Candidate": "amber",
  "Rejected by Transformari": "red",
  "Rejected by Client": "red",
  "Rejected by GPR (Felix)": "red",
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-[#F2F4F7] text-[#344054] border-[#EAECF0]",
  blue:    "bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]",
  green:   "bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]",
  amber:   "bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]",
  red:     "bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]",
};

export function StageBadge({ stage, className }: { stage: string; className?: string }) {
  const tone = STAGE_TONE[stage] ?? "neutral";
  return (
    <span className={cn(
      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
      TONE_CLASS[tone],
      className,
    )}>
      {stage}
    </span>
  );
}
