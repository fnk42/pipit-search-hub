import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Star, ExternalLink, FileText } from "lucide-react";
import { StageBadge } from "./StageBadge";
import { updateCandidate, setShortlist } from "@/lib/candidates.functions";
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
  shortlisted: boolean;
  linkedin_url?: string | null;
};

export function CandidatesTable({
  rows, role, selected, onToggleRow, onToggleAll,
}: {
  rows: Candidate[];
  role: "recruiter" | "client";
  selected?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
}) {
  const qc = useQueryClient();
  const updateFn = useServerFn(updateCandidate);
  const shortlistFn = useServerFn(setShortlist);
  const isRecruiter = role === "recruiter";

  const toggleVis = useMutation({
    mutationFn: async (c: Candidate) =>
      updateFn({ data: { id: c.id, patch: { client_visible: !c.client_visible } } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidates"] }); toast.success("Visibility updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleStar = useMutation({
    mutationFn: async (c: Candidate) =>
      shortlistFn({ data: { ids: [c.id], shortlisted: !c.shortlisted } }),
    onSuccess: (_r, c) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success(c.shortlisted ? "Removed from shortlist" : "Added to shortlist");
    },
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

  const allSelected = isRecruiter && selected && rows.length > 0 && selected.size === rows.length;

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {rows.map((c) => (
          <div key={c.id} className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {c.linkedin_url ? (
                  <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="font-medium text-sm text-foreground truncate flex items-center gap-1.5 hover:text-primary">
                    {c.shortlisted && <Star className="h-3.5 w-3.5 fill-accent text-accent shrink-0" />}
                    <span className="truncate">{c.name}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                ) : (
                  <Link to="/candidates/$id" params={{ id: c.id }} className="font-medium text-sm text-foreground truncate flex items-center gap-1.5 hover:text-primary">
                    {c.shortlisted && <Star className="h-3.5 w-3.5 fill-accent text-accent shrink-0" />}
                    <span className="truncate">{c.name}</span>
                  </Link>
                )}
                <Link to="/candidates/$id" params={{ id: c.id }} className="text-xs text-muted-foreground truncate block hover:text-foreground">
                  {c.current_title}{c.current_firm ? ` · ${c.current_firm}` : ""}
                </Link>
              </div>
              <StageBadge stage={c.pipeline_stage} />
            </div>
            {c.next_action && <div className="text-xs text-muted-foreground mt-2">Next: {c.next_action}</div>}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg border border-border bg-card overflow-x-auto shadow-[var(--shadow-card)]">
        <Table>
          <TableHeader>
            <TableRow>
              {isRecruiter && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onToggleAll?.()}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {isRecruiter && <TableHead className="w-10"></TableHead>}
              <TableHead>Name</TableHead>
              <TableHead>Firm</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Last contact</TableHead>
              <TableHead>Next action</TableHead>
              {isRecruiter && <TableHead className="text-right">Visible</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} className="cursor-pointer">
                {isRecruiter && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected?.has(c.id) ?? false}
                      onCheckedChange={() => onToggleRow?.(c.id)}
                      aria-label={`Select ${c.name}`}
                    />
                  </TableCell>
                )}
                {isRecruiter && (
                  <TableCell>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingId(c.id); toggleStar.mutate(c, { onSettled: () => setPendingId(null) }); }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                      aria-label={c.shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                      disabled={pendingId === c.id}
                    >
                      <Star className={`h-4 w-4 ${c.shortlisted ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                    </button>
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  <Link to="/candidates/$id" params={{ id: c.id }} className="hover:text-primary">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-foreground">{c.current_firm ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.current_title ?? "—"}</TableCell>
                <TableCell><StageBadge stage={c.pipeline_stage} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.location_bucket ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.last_contact_date ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[18ch] truncate">{c.next_action ?? "—"}</TableCell>
                {isRecruiter && (
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
