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
import { EditableText, EditableSelect } from "./EditableCell";
import { updateCandidate, deleteCandidate } from "@/lib/candidates.functions";
import {
  PIPELINE_STAGES, LOCATION_BUCKETS,
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
  screen_out_reason?: string | null;
};

const REJ = new Set<string>(REJECTED_STAGES);

const FIT_CLASS: Record<CandidateFit, string> = {
  "Target Fit": "bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]",
  "Too Junior": "bg-[#F2F4F7] text-[#344054] border-[#EAECF0]",
  "Too Senior": "bg-[#F2F4F7] text-[#344054] border-[#EAECF0]",
  "Off-function": "bg-[#F2F4F7] text-[#344054] border-[#EAECF0]",
  "Unassessed": "bg-[#F2F4F7] text-[#344054] border-[#EAECF0]",
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
      <div className="rounded-lg border border-dashed border-[#EAECF0] bg-white p-10 text-center">
        <p className="text-sm text-[#475467]">No candidates match these filters.</p>
      </div>
    );
  }

  const allSelected = isRecruiter && selected && rows.length > 0 && selected.size === rows.length;

  const FitChip = ({ value }: { value: CandidateFit }) => (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${FIT_CLASS[value]}`}>
      {value === "Target Fit" && <Star className="h-3 w-3 fill-current" />}
      {value}
    </span>
  );

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {rows.map((c) => (
          <div key={c.id} className="rounded-lg border border-[#EAECF0] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {c.linkedin_url ? (
                  <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="font-medium text-sm text-[#101828] truncate flex items-center gap-1.5 hover:text-[#1570EF]">
                    <span className="truncate">{c.name}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-[#667085]" />
                  </a>
                ) : (
                  <Link to="/candidates/$id" params={{ id: c.id }} className="font-medium text-sm text-[#101828] truncate flex items-center gap-1.5 hover:text-[#1570EF]">
                    <span className="truncate">{c.name}</span>
                  </Link>
                )}
                <span className="text-xs text-[#475467] truncate block">
                  {c.current_firm ?? "—"}
                </span>
                <div className="mt-1.5"><FitChip value={c.fit} /></div>
              </div>
              <StageBadge stage={c.pipeline_stage} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table — Untitled UI */}
      <div className="hidden sm:block rounded-lg border border-[#EAECF0] bg-white overflow-hidden">
        <Table className="w-full table-fixed">
          <colgroup>
            {isRecruiter && <col style={{ width: 44 }} />}
            <col style={{ minWidth: 200 }} />
            <col style={{ minWidth: 180 }} />
            <col style={{ minWidth: 200 }} />
            <col style={{ minWidth: 120 }} />
            <col style={{ minWidth: 120 }} />
            {isRecruiter && <col style={{ minWidth: 220 }} />}
            {isRecruiter && <col style={{ width: 60 }} />}
            {isRecruiter && <col style={{ width: 44 }} />}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-[#F9FAFB] border-b border-[#EAECF0] hover:bg-[#F9FAFB]">
              {isRecruiter && (
                <TableHead className="px-3 py-3">
                  <Checkbox checked={allSelected} onCheckedChange={() => onToggleAll?.()} aria-label="Select all" className="border-[#D0D5DD]" />
                </TableHead>
              )}
              <Th>Name</Th>
              <Th>Company</Th>
              <Th>Stage</Th>
              <Th>Fit</Th>
              <Th>Location</Th>
              {isRecruiter && <Th>Screen out reason</Th>}
              {isRecruiter && <Th className="text-right">Visible</Th>}
              {isRecruiter && <Th></Th>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const isRej = REJ.has(c.pipeline_stage);
              return (
                <TableRow key={c.id} className="h-[52px] border-b border-[#EAECF0] hover:bg-[#F9FAFB]">
                  {isRecruiter && (
                    <TableCell className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected?.has(c.id) ?? false}
                        onCheckedChange={() => onToggleRow?.(c.id)}
                        aria-label={`Select ${c.name}`}
                        className="border-[#D0D5DD]"
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-3 py-3 align-middle text-sm font-medium text-[#101828]">
                    {c.linkedin_url ? (
                      <a href={c.linkedin_url} target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1.5 hover:text-[#1570EF]" title={c.name}>
                        <span className="truncate">{c.name}</span>
                        <ExternalLink className="h-4 w-4 text-[#667085] shrink-0" />
                      </a>
                    ) : (
                      <Link to="/candidates/$id" params={{ id: c.id }}
                            className="hover:text-[#1570EF]" title={c.name}>
                        {c.name}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-middle text-sm text-[#475467]">
                    {isRecruiter ? (
                      <EditableText value={c.current_firm} onSave={(v) => patch(c.id, { current_firm: v })} placeholder="—" />
                    ) : (c.current_firm ?? "—")}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-middle">
                    {isRecruiter ? (
                      <EditableSelect
                        value={c.pipeline_stage}
                        options={PIPELINE_STAGES}
                        onSave={(v) => patch(c.id, { pipeline_stage: v, ...(v && !REJ.has(v) ? { screen_out_reason: null } : {}) })}
                        display={(v) => <StageBadge stage={String(v)} />}
                      />
                    ) : <StageBadge stage={c.pipeline_stage} />}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-middle">
                    {isRecruiter ? (
                      <EditableSelect
                        value={c.fit}
                        options={CANDIDATE_FITS}
                        onSave={(v) => patch(c.id, { fit: v })}
                        display={(v) => <FitChip value={v as CandidateFit} />}
                      />
                    ) : <FitChip value={c.fit} />}
                  </TableCell>
                  <TableCell className="px-3 py-3 align-middle text-sm text-[#475467]">
                    {isRecruiter ? (
                      <EditableSelect
                        value={c.location_bucket} options={LOCATION_BUCKETS} allowEmpty
                        onSave={(v) => patch(c.id, { location_bucket: v })}
                      />
                    ) : (c.location_bucket ?? "—")}
                  </TableCell>
                  {isRecruiter && (
                    <TableCell className="px-3 py-3 align-middle text-sm text-[#475467]">
                      <div className="truncate" title={c.screen_out_reason ?? ""}>
                        <EditableSelect
                          value={c.screen_out_reason} options={SCREEN_OUT_REASONS} allowEmpty
                          disabled={!isRej}
                          placeholder={isRej ? "—" : "n/a"}
                          onSave={(v) => patch(c.id, { screen_out_reason: v })}
                        />
                      </div>
                    </TableCell>
                  )}
                  {isRecruiter && (
                    <TableCell className="px-3 py-3 align-middle text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingId(c.id); toggleVis.mutate(c, { onSettled: () => setPendingId(null) }); }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[#F2F4F7] text-[#667085] hover:text-[#101828]"
                        aria-label="Toggle client visibility"
                        disabled={pendingId === c.id}
                      >
                        {c.client_visible ? <Eye className="h-4 w-4 text-[#1570EF]" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </TableCell>
                  )}
                  {isRecruiter && (
                    <TableCell className="px-3 py-3 align-middle text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#667085] hover:bg-[#FEF3F2] hover:text-[#B42318]"
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

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <TableHead
      className={`px-3 py-3 h-auto text-[11px] font-medium uppercase tracking-[0.05em] text-[#475467] ${className ?? ""}`}
    >
      {children}
    </TableHead>
  );
}
