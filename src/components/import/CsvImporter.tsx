import { useCallback, useMemo, useState } from "react";
import Papa from "papaparse";
import { useDropzone } from "react-dropzone";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { CANDIDATE_FIELDS, PE_FIELDS, CANDIDATE_HEADER_ALIASES, PE_HEADER_ALIASES, candidateRowSchema, peFirmRowSchema } from "@/lib/csv-schemas";
import { importCandidates, importPeFirms } from "@/lib/import.functions";
import { toast } from "sonner";

type Kind = "candidates" | "pe_firms";
const SKIP = "__skip__";

export function CsvImporter({ kind }: { kind: Kind }) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const fields = kind === "candidates" ? CANDIDATE_FIELDS : PE_FIELDS;
  const aliases = kind === "candidates" ? CANDIDATE_HEADER_ALIASES : PE_HEADER_ALIASES;
  const schema = kind === "candidates" ? candidateRowSchema : peFirmRowSchema;
  const importCands = useServerFn(importCandidates);
  const importPe = useServerFn(importPeFirms);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("File too large (max 2MB)"); return; }
    setFile(f);
    Papa.parse<Record<string, string>>(f, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const hs = res.meta.fields ?? [];
        setHeaders(hs);
        setRows(res.data);
        // auto-map: alias table first, then loose fuzzy fallback
        const auto: Record<string, string> = {};
        const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
        hs.forEach((h) => {
          const nh = normalize(h);
          // 1) exact alias hit
          const aliasKey = Object.entries(aliases).find(([, list]) => list.some((a) => normalize(a) === nh))?.[0];
          if (aliasKey) { auto[h] = aliasKey; return; }
          // 2) fuzzy: header normalized matches field key or label (either direction)
          const compact = nh.replace(/\s/g, "");
          const match = fields.find((f) => {
            const k = f.key.replace(/_/g, "");
            const l = f.label.toLowerCase().replace(/[^a-z0-9]/g, "");
            return k === compact || l === compact || k.includes(compact) || compact.includes(k);
          });
          if (match) auto[h] = match.key;
        });
        setMapping(auto);
      },
    });
  }, [fields, aliases]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false, accept: { "text/csv": [".csv"] },
  });

  const mappedRows = useMemo(() => rows.map((r) => {
    const out: Record<string, string> = {};
    Object.entries(mapping).forEach(([h, key]) => { if (key && key !== SKIP) out[key] = r[h]; });
    return out;
  }), [rows, mapping]);

  const validation = useMemo(() => {
    const errors: { idx: number; msg: string }[] = [];
    let valid = 0;
    mappedRows.forEach((r, idx) => {
      const res = schema.safeParse(r);
      if (res.success) valid++;
      else errors.push({ idx, msg: res.error.issues.map((i) => `${i.path.join(".") || "row"} ${i.message}`).join("; ") });
    });
    return { valid, errors };
  }, [mappedRows, schema]);

  const importMut = useMutation({
    mutationFn: async () => {
      const fn = kind === "candidates" ? importCands : importPe;
      return fn({ data: { rows: mappedRows as never } });
    },
    onSuccess: (res) => {
      toast.success(`Imported ${res.inserted} of ${rows.length}. ${res.errors.length ? `${res.errors.length} error(s).` : ""}`);
      if (res.errors.length === 0) reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = () => { setFile(null); setHeaders([]); setRows([]); setMapping({}); };

  if (!file) {
    return (
      <div {...getRootProps()} className={`rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition ${isDragActive ? "border-accent bg-accent/5" : "border-border hover:border-primary/40"}`}>
        <input {...getInputProps()} />
        <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">Drop a CSV here or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">Up to 2 MB. UTF-8 encoded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
        <div className="flex items-center gap-3 min-w-0">
          <FileSpreadsheet className="h-5 w-5 text-accent shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{file.name}</div>
            <div className="text-xs text-muted-foreground">{rows.length} rows · {headers.length} columns</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={reset}><X className="h-4 w-4" /></Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Map columns</h3>
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>CSV column</TableHead><TableHead>Sample</TableHead><TableHead>Maps to</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {headers.map((h) => (
                <TableRow key={h}>
                  <TableCell className="font-medium">{h}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[20ch] truncate">{rows[0]?.[h] ?? "—"}</TableCell>
                  <TableCell>
                    <Select value={mapping[h] || SKIP} onValueChange={(v) => setMapping({ ...mapping, [h]: v })}>
                      <SelectTrigger className="h-9 w-[220px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP}>— Skip —</SelectItem>
                        {fields.map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label}{"required" in f && f.required ? " *" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Validation</h3>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1 text-accent" />{validation.valid} valid</Badge>
            {validation.errors.length > 0 && (
              <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{validation.errors.length} errors</Badge>
            )}
          </div>
        </div>
        {validation.errors.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 max-h-48 overflow-y-auto">
            <ul className="text-xs space-y-1 text-destructive">
              {validation.errors.slice(0, 20).map((e) => <li key={e.idx}>Row {e.idx + 1}: {e.msg}</li>)}
              {validation.errors.length > 20 && <li>…and {validation.errors.length - 20} more.</li>}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={reset}>Cancel</Button>
        <Button
          disabled={importMut.isPending || validation.valid === 0}
          onClick={() => importMut.mutate()}
          className="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {importMut.isPending ? "Importing…" : `Import ${validation.valid} rows`}
        </Button>
      </div>
    </div>
  );
}
