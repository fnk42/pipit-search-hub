import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Star, ExternalLink, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StageBadge } from "./StageBadge";
import { EditableText, EditableSelect, EditableDate } from "./EditableCell";
import { updateCandidate, deleteCandidate } from "@/lib/candidates.functions";
import {
  PIPELINE_STAGES, LOCATION_BUCKETS, OWNERS, SOURCED_BY_OPTIONS,
  SCREEN_OUT_REASONS, REJECTED_STAGES, CANDIDATE_FITS, type CandidateFit,
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
  fit: CandidateFit;
  linkedin_url?: string | null;
  owner?: string | null;
  sourced_by?: string | null;
  screen_out_reason?: string | null;
  date_sourced?: string | null;
};

const REJ = new Set<string>(REJECTED_STAGES);

const FIT_CLASS: Record<CandidateFit, string> = {
  "Target Fit": "bg-[var(--metric-amber)]/15 text-[var(--metric-amber)] border-[var(--metric-amber)]/30",
  "Too Junior": "bg-muted text-muted-foreground border-border",
  "Too Senior": "bg-muted text-muted-foreground border-border",
  "Off-function": "bg-muted text-muted-foreground border-border",
  "Unassessed": "bg-background text-muted-foreground border-dashed border-border",
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
  const deleteFn = useServerFn(deleteCandidate);
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
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Candidate | null>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate deleted");
      setConfirmDelete(null);
    },
    onError: () => toast.error("Couldn't delete — please refresh and try again."),
  });

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">No candidates match these filters.</p>
      </div>
    );
  }

  const allSelected = isRecruiter && selected && rows.length > 0 && selected.size === rows.length;

  const FitChip = ({ value }: { value: CandidateFit }) => (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${FIT_CLASS[value]}`}>
      {value}
    </span>
  );

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
                    {c.fit === "Target Fit" && <Star className="h-3.5 w-3.5 fill-[var(--metric-amber)] text-[var(--metric-amber)] shrink-0" />}
                    <span className="truncate">{c.name}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                ) : (
                  <Link to="/candidates/$id" params={{ id: c.id }} className="font-medium text-sm text-foreground truncate flex items-center gap-1.5 hover:text-accent">
                    {c.fit === "Target Fit" && <Star className="h-3.5 w-3.5 fill-[var(--metric-amber)] text-[var(--metric-amber)] shrink-0" />}
                    <span className="truncate">{c.name}</span>
                  </Link>
                )}
                <Link to="/candidates/$id" params={{ id: c.id }} className="text-xs text-muted-foreground truncate block hover:text-foreground">
                  {c.current_title}{c.current_firm ? ` · ${c.current_firm}` : ""}
                </Link>
                <div className="mt-1.5"><FitChip value={c.fit} /></div>
              </div>
              <StageBadge stage={c.pipeline_stage} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table — sticky name col, compact, top scrollbar */}
      <div className="hidden sm:block rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
        <ScrollSyncContainer>
          <Table className="text-sm [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-1.5">
            <TableHeader>
              <TableRow>
                {isRecruiter && (
                  <TableHead className="w-10 sticky left-0 bg-card z-20">
                    <Checkbox checked={allSelected} onCheckedChange={() => onToggleAll?.()} aria-label="Select all" />
                  </TableHead>
                )}
                <TableHead className={`w-[280px] ${isRecruiter ? "sticky left-10 bg-card z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]" : "sticky left-0 bg-card z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]"}`}>Name · Title / Firm</TableHead>
                <TableHead className="w-[170px]">Stage</TableHead>
                <TableHead className="w-[120px]">Fit</TableHead>
                <TableHead className="w-[110px]">Location</TableHead>
                {isRecruiter && <TableHead className="w-[100px]">Owner</TableHead>}
                {isRecruiter && <TableHead className="w-[110px]">Sourced by</TableHead>}
                {isRecruiter && <TableHead className="w-[160px]">Screen out reason</TableHead>}
                <TableHead className="w-[96px]">Sourced</TableHead>
                {isRecruiter && <TableHead className="w-[60px] text-right">Visible</TableHead>}
                {isRecruiter && <TableHead className="w-[44px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const isRej = REJ.has(c.pipeline_stage);
                return (
                  <TableRow key={c.id}>
                    {isRecruiter && (
                      <TableCell className="sticky left-0 bg-card z-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected?.has(c.id) ?? false}
                          onCheckedChange={() => onToggleRow?.(c.id)}
                          aria-label={`Select ${c.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className={`font-medium align-middle w-[180px] max-w-[180px] ${isRecruiter ? "sticky left-10 bg-card z-10" : "sticky left-0 bg-card z-10"}`}>
                      <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                        {c.fit === "Target Fit" && <Star className="h-3 w-3 fill-[var(--metric-amber)] text-[var(--metric-amber)] shrink-0" />}
                        {c.linkedin_url ? (
                          <a href={c.linkedin_url} target="_blank" rel="noreferrer"
                             className="hover:text-accent inline-flex items-center gap-1 truncate" title={c.name}>
                            <span className="truncate">{c.name}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                          </a>
                        ) : (
                          <Link to="/candidates/$id" params={{ id: c.id }}
                                className="hover:text-accent truncate" title={c.name}>
                            {c.name}
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground w-[200px] max-w-[200px]">
                      <div className="truncate" title={`${c.current_title ?? ""}${c.current_firm ? ` · ${c.current_firm}` : ""}`}>
                        {isRecruiter ? (
                          <span className="inline-flex items-center gap-1 max-w-full">
                            <EditableText value={c.current_title} onSave={(v) => patch(c.id, { current_title: v })} placeholder="title" className="text-xs truncate" />
                            <span>·</span>
                            <EditableText value={c.current_firm} onSave={(v) => patch(c.id, { current_firm: v })} placeholder="firm" className="text-xs truncate" />
                          </span>
                        ) : (
                          <>{(c.current_title ?? "—")}{c.current_firm ? ` · ${c.current_firm}` : ""}</>
                        )}
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
                    <TableCell>
                      {isRecruiter ? (
                        <EditableSelect
                          value={c.fit}
                          options={CANDIDATE_FITS}
                          onSave={(v) => patch(c.id, { fit: v })}
                          display={(v) => <FitChip value={v as CandidateFit} />}
                        />
                      ) : <FitChip value={c.fit} />}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {isRecruiter ? (
                        <EditableSelect
                          value={c.location_bucket} options={LOCATION_BUCKETS} allowEmpty
                          onSave={(v) => patch(c.id, { location_bucket: v })}
                        />
                      ) : (c.location_bucket ?? "—")}
                    </TableCell>
                    {isRecruiter && (
                      <TableCell className="text-xs text-muted-foreground">
                        <EditableSelect value={c.owner} options={OWNERS} allowEmpty onSave={(v) => patch(c.id, { owner: v })} />
                      </TableCell>
                    )}
                    {isRecruiter && (
                      <TableCell className="text-xs text-muted-foreground">
                        <EditableSelect value={c.sourced_by ?? "GPR Team"} options={SOURCED_BY_OPTIONS} onSave={(v) => patch(c.id, { sourced_by: v ?? "GPR Team" })} />
                      </TableCell>
                    )}
                    {isRecruiter && (
                      <TableCell className="text-xs text-muted-foreground">
                        <EditableSelect
                          value={c.screen_out_reason} options={SCREEN_OUT_REASONS} allowEmpty
                          disabled={!isRej}
                          placeholder={isRej ? "—" : "n/a"}
                          onSave={(v) => patch(c.id, { screen_out_reason: v })}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {isRecruiter ? (
                        <EditableDate value={c.date_sourced} onSave={(v) => patch(c.id, { date_sourced: v })} />
                      ) : (c.date_sourced ?? "—")}
                    </TableCell>
                    {isRecruiter && (
                      <TableCell className="text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setPendingId(c.id); toggleVis.mutate(c, { onSettled: () => setPendingId(null) }); }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                          aria-label="Toggle client visibility"
                          disabled={pendingId === c.id}
                        >
                          {c.client_visible ? <Eye className="h-4 w-4 text-accent" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                      </TableCell>
                    )}
                    {isRecruiter && (
                      <TableCell className="text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollSyncContainer>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete ? <><span className="font-medium text-foreground">{confirmDelete.name}</span> will be permanently removed. This can't be undone.</> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={(e) => { e.preventDefault(); if (confirmDelete) deleteMut.mutate(confirmDelete.id); }}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Top + bottom horizontal scrollbars, kept in sync. */
function ScrollSyncContainer({ children }: { children: React.ReactNode }) {
  const topRef = (el: HTMLDivElement | null) => {
    if (!el) return;
    const main = el.nextElementSibling as HTMLDivElement | null;
    if (!main || (el as HTMLDivElement & { _wired?: boolean })._wired) return;
    (el as HTMLDivElement & { _wired?: boolean })._wired = true;
    const inner = el.firstElementChild as HTMLDivElement;
    const sync = (from: HTMLElement, to: HTMLElement) => {
      let lock = false;
      from.addEventListener("scroll", () => {
        if (lock) { lock = false; return; }
        lock = true;
        to.scrollLeft = from.scrollLeft;
      });
    };
    sync(el, main);
    sync(main, el);
    const ro = new ResizeObserver(() => { inner.style.width = `${main.scrollWidth}px`; });
    ro.observe(main);
    inner.style.width = `${main.scrollWidth}px`;
  };
  return (
    <>
      <div ref={topRef} className="overflow-x-auto h-3"><div className="h-px" /></div>
      <div className="overflow-x-auto">{children}</div>
    </>
  );
}
