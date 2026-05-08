import { format } from "date-fns";

type Item = {
  id: string;
  created_at: string;
  action: string;
  payload: Record<string, string | number | boolean | null>;
  user_name: string | null;
};

export function ActivityTimeline({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>;
  }
  return (
    <ol className="relative border-l border-border ml-2 space-y-4 py-2">
      {items.map((i) => {
        const p = i.payload ?? {};
        let desc = i.action;
        if (i.action === "stage_change") desc = `Moved from ${p.from} to ${p.to}`;
        else if (i.action === "candidate_created") desc = "Added to pipeline";
        return (
          <li key={i.id} className="ml-4">
            <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
            <p className="text-sm text-foreground">{desc}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(i.created_at), "MMM d, yyyy · h:mm a")}
              {i.user_name && ` · ${i.user_name}`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
