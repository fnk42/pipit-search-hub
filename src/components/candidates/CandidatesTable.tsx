import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Star, ExternalLink } from "lucide-react";
import { StageBadge } from "./StageBadge";
import { EditableText, EditableSelect, EditableDate } from "./EditableCell";
import { updateCandidate, setShortlist } from "@/lib/candidates.functions";
import {
  PIPELINE_STAGES, LOCATION_BUCKETS, OWNERS, SOURCED_BY_OPTIONS,
  SCREEN_OUT_REASONS, REJECTED_STAGES,
} from "@/lib/csv-schemas";
import { toast } from "sonner";

type Candidate = {
  id: string;
  name: string;
  current_firm: string | null;
  current_title: string | null;
  pipeline_stage: string;
  location_bucket: string | null;
  client_visible: boolean;
  shortlisted: boolean;
  linkedin_url?: string | null;
  owner?: string | null;
  sourced_by?: string | null;
  screen_out_reason?: string | null;
  date_sourced?: string | null;
};

const REJ = new Set<string>(REJECTED_STAGES);

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

  const patch = async (id: string, patch: Record<string, unknown>) => {
    try {
      await updateFn({ data: { id, patch: patch as never } });
      qc.invalidateQueries({ queryKey: ["candidates"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

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
                  <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="font-medium text-sm text-foreground truncate flex items-center gap-1.5 hover:text-accent">
                    {c.shortlisted && <Star className="h-3.5 w-3.5 fill-[var(--metric-amber)] text-[var(--metric-amber)] shrink-0" />}
                    <span className="truncate">{c.name}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                ) : (
                  <Link to="/candidates/$id" params={{ id: c.id }} className="font-medium text-sm text-foreground truncate flex items-center gap-1.5 hover:text-accent">
                    {c.shortlisted && <Star className="h-3.5 w-3.5 fill-[var(--metric-amber)] text-[var(--metric-amber)] shrink-0" />}
                    <span className="truncate">{c.name}</span>
                  </Link>
                )}
                <Link to="/candidates/$id" params={{ id: c.id }} className="text-xs text-muted-foreground truncate block hover:text-foreground">
                  {c.current_title}{c.current_firm ? ` · ${c.current_firm}` : ""}
                </Link>
              </div>
              <StageBadge stage={c.pipeline_stage} />
            </div>
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
                  <Checkbox checked={allSelected} onCheckedChange={() => onToggleAll?.()} aria-label="Select all" />
                </TableHead>
              )}
              {isRecruiter && <TableHead className="w-10"></TableHead>}
              <TableHead className="min-w-[260px]">Name</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Location</TableHead>
              {isRecruiter && <TableHead>Owner</TableHead>}
              {isRecruiter && <TableHead>Sourced by</TableHead>}
              {isRecruiter && <TableHead>Screen out reason</TableHead>}
              <TableHead>Sourced</TableHead>
              {isRecruiter && <TableHead className="text-right">Visible</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const isRej = REJ.has(c.pipeline_stage);
              return (
                <TableRow key={c.id}>
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
                        <Star className={`h-4 w-4 ${c.shortlisted ? "fill-[var(--metric-amber)] text-[var(--metric-amber)]" : "text-muted-foreground"}`} />
                      </button>
                    </TableCell>
                  )}
                  <TableCell className="font-medium min-w-[260px] align-top">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {c.linkedin_url ? (
                          <a
                            href={c.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-accent inline-flex items-center gap-1 text-sm"
                          >
                            {c.name}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        ) : (
                          <span className="text-sm">{c.name}</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        {isRecruiter ? (
                          <>
                            <EditableText
                              value={c.current_title}
                              onSave={(v) => patch(c.id, { current_title: v })}
                              placeholder="title"
                              className="text-xs"
                            />
                            <span>·</span>
                            <EditableText
                              value={c.current_firm}
                              onSave={(v) => patch(c.id, { current_firm: v })}
                              placeholder="company"
                              className="text-xs"
                            />
                          </>
                        ) : (
                          <span className="truncate">
                            {(c.current_title ?? "—")}{c.current_firm ? ` · ${c.current_firm}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isRecruiter ? (
                      <EditableSelect
                        value={c.pipeline_stage}
                        options={PIPELINE_STAGES}
                        onSave={(v) => patch(c.id, { pipeline_stage: v, ...(v && !REJ.has(v) ? { screen_out_reason: null } : {}) })}
                        display={(v) => <StageBadge stage={String(v)} />}
                      />
                    ) : <StageBadge stage={c.pipeline_stage} />}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {isRecruiter ? (
                      <EditableSelect
                        value={c.location_bucket} options={LOCATION_BUCKETS} allowEmpty
                        onSave={(v) => patch(c.id, { location_bucket: v })}
                      />
                    ) : (c.location_bucket ?? "—")}
                  </TableCell>
                  {isRecruiter && (
                    <TableCell className="text-sm text-muted-foreground">
                      <EditableSelect
                        value={c.owner} options={OWNERS} allowEmpty
                        onSave={(v) => patch(c.id, { owner: v })}
                      />
                    </TableCell>
                  )}
                  {isRecruiter && (
                    <TableCell className="text-sm text-muted-foreground">
                      <EditableSelect
                        value={c.sourced_by ?? "GPR Team"} options={SOURCED_BY_OPTIONS}
                        onSave={(v) => patch(c.id, { sourced_by: v ?? "GPR Team" })}
                      />
                    </TableCell>
                  )}
                  {isRecruiter && (
                    <TableCell className="text-sm text-muted-foreground max-w-[20ch]">
                      <EditableSelect
                        value={c.screen_out_reason} options={SCREEN_OUT_REASONS} allowEmpty
                        disabled={!isRej}
                        placeholder={isRej ? "—" : "n/a"}
                        onSave={(v) => patch(c.id, { screen_out_reason: v })}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {isRecruiter ? (
                      <EditableDate value={c.date_sourced} onSave={(v) => patch(c.id, { date_sourced: v })} />
                    ) : (c.date_sourced ?? "—")}
                  </TableCell>
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
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
