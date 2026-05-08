import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff } from "lucide-react";
import { StageBadge } from "./StageBadge";
import { updateCandidate } from "@/lib/candidates.functions";
import { toast } from "sonner";

type Candidate = {
  id: string;
  name: string;
  current_firm: string | null;
  current_title: string | null;
  pipeline_stage: string;
  location_bucket: string | null;
  last_contact_date: string | null;
  next_action: string | null;
  client_visible: boolean;
};

export function CandidatesTable({ rows, role }: { rows: Candidate[]; role: "recruiter" | "client" }) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateCandidate);
  const toggleVis = useMutation({
    mutationFn: async (c: Candidate) =>
      updateFn({ data: { id: c.id, patch: { client_visible: !c.client_visible } } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidates"] }); toast.success("Visibility updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">No candidates match these filters.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {rows.map((c) => (
          <Link key={c.id} to="/candidates/$id" params={{ id: c.id }} className="block rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm text-foreground truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">{c.current_title}{c.current_firm ? ` · ${c.current_firm}` : ""}</div>
              </div>
              <StageBadge stage={c.pipeline_stage} />
            </div>
            {c.next_action && <div className="text-xs text-muted-foreground mt-2">Next: {c.next_action}</div>}
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg border border-border bg-card overflow-x-auto shadow-[var(--shadow-card)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Firm</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last contact</TableHead>
              <TableHead>Next action</TableHead>
              {role === "recruiter" && <TableHead className="text-right">Visible</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link to="/candidates/$id" params={{ id: c.id }} className="hover:text-primary">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{c.current_firm ?? "—"}</div>
                  <div className="text-xs">{c.current_title}</div>
                </TableCell>
                <TableCell><StageBadge stage={c.pipeline_stage} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.location_bucket ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.last_contact_date ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[18ch] truncate">{c.next_action ?? "—"}</TableCell>
                {role === "recruiter" && (
                  <TableCell className="text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingId(c.id); toggleVis.mutate(c, { onSettled: () => setPendingId(null) }); }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                      aria-label="Toggle client visibility"
                      disabled={pendingId === c.id}
                    >
                      {c.client_visible ? <Eye className="h-4 w-4 text-accent" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
