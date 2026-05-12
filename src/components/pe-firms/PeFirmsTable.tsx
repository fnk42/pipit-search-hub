import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";
import { EditableText, EditableSelect } from "@/components/candidates/EditableCell";
import { updatePeFirm, deletePeFirm } from "@/lib/pe-firms.functions";
import { PE_STATUSES } from "@/lib/csv-schemas";
import { toast } from "sonner";

type Firm = {
  id: string;
  name: string;
  status: string;
  aum_b: number | null;
  hq: string | null;
  location: string | null;
  layer: string | null;
  next_layer_tag: string | null;
  aum_source: string | null;
  website: string | null;
};

function normalizeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  const t = u.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function PeFirmsTable({ rows }: { rows: Firm[] }) {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const updateFn = useServerFn(updatePeFirm);
  const deleteFn = useServerFn(deletePeFirm);

  const patch = async (id: string, patch: Record<string, unknown>) => {
    try {
      await updateFn({ data: { id, patch: patch as never } });
      qc.invalidateQueries({ queryKey: ["pe-firms"] });
    } catch (e) { toast.error((e as Error).message); }
  };

  const delMut = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pe-firms"] }); toast.success("Firm removed"); },
    onError: (e: Error) => toast.error(e.message),
  });



  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(s) ||
      (r.hq ?? "").toLowerCase().includes(s) ||
      (r.location ?? "").toLowerCase().includes(s) ||
      (r.layer ?? "").toLowerCase().includes(s),
    );
  }, [rows, q]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search firm, HQ, location, layer…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <p className="text-xs text-muted-foreground">{filtered.length} of {rows.length} firms</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No firms match.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto shadow-[var(--shadow-card)]">
            <Table className="text-xs [&_th]:h-8 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1.5">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Name</TableHead>
                  <TableHead className="w-[80px]">AUM ($B)</TableHead>
                  <TableHead className="w-[120px]">HQ</TableHead>
                  <TableHead className="w-[120px]">Location</TableHead>
                  <TableHead className="w-[110px]">Layer</TableHead>
                  <TableHead className="w-[120px]">Next Layer Tag</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[160px]">Source of AUM</TableHead>
                  <TableHead className="w-[140px]">Website</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => {
                  const href = normalizeUrl(f.website);
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {href ? (
                            <a href={href} target="_blank" rel="noreferrer" className="hover:text-accent inline-flex items-center gap-1">
                              {f.name}
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </a>
                          ) : (
                            <EditableText value={f.name} onSave={(v) => patch(f.id, { name: v ?? f.name })} />
                          )}
                        </div>
                        {href && (
                          <EditableText value={f.name} onSave={(v) => patch(f.id, { name: v ?? f.name })} className="text-[10px] text-muted-foreground" placeholder="edit name" />
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <EditableText
                          value={f.aum_b == null ? "" : String(f.aum_b)}
                          onSave={(v) => {
                            if (!v) return patch(f.id, { aum_b: null });
                            const n = Number(v.replace(/[$,_\s]/g, ""));
                            patch(f.id, { aum_b: Number.isFinite(n) ? n : null });
                          }}
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell><EditableText value={f.hq} onSave={(v) => patch(f.id, { hq: v })} placeholder="—" /></TableCell>
                      <TableCell><EditableText value={f.location} onSave={(v) => patch(f.id, { location: v })} placeholder="—" /></TableCell>
                      <TableCell><EditableText value={f.layer} onSave={(v) => patch(f.id, { layer: v })} placeholder="—" /></TableCell>
                      <TableCell><EditableText value={f.next_layer_tag} onSave={(v) => patch(f.id, { next_layer_tag: v })} placeholder="—" /></TableCell>
                      <TableCell><EditableSelect value={f.status} options={PE_STATUSES} onSave={(v) => patch(f.id, { status: v ?? "Target" })} /></TableCell>
                      <TableCell className="max-w-[160px] truncate"><EditableText value={f.aum_source} onSave={(v) => patch(f.id, { aum_source: v })} placeholder="—" /></TableCell>
                      <TableCell className="max-w-[140px] truncate"><EditableText value={f.website} onSave={(v) => patch(f.id, { website: v })} placeholder="—" /></TableCell>
                      <TableCell>
                        <Button
                          size="icon" variant="ghost"
                          onClick={() => { if (confirm(`Remove ${f.name}?`)) delMut.mutate(f.id); }}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </div>
      )}
    </div>
  );
}
