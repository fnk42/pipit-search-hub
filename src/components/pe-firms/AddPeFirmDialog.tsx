import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { createPeFirm } from "@/lib/pe-firms.functions";
import { PE_STATUSES } from "@/lib/csv-schemas";
import { toast } from "sonner";

export function AddPeFirmDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", status: "Target", aum_b: "", hq: "", location: "", layer: "", next_layer_tag: "", aum_source: "", website: "", notes: "",
  });
  const qc = useQueryClient();
  const fn = useServerFn(createPeFirm);
  const mut = useMutation({
    mutationFn: async () => {
      const aum_b = form.aum_b.trim() ? Number(form.aum_b.replace(/[$,_\s]/g, "")) : undefined;
      return fn({
        data: {
          name: form.name.trim(),
          status: form.status as never,
          aum_b: Number.isFinite(aum_b) ? (aum_b as number) : undefined,
          hq: form.hq.trim() || undefined,
          location: form.location.trim() || undefined,
          layer: form.layer.trim() || undefined,
          next_layer_tag: form.next_layer_tag.trim() || undefined,
          aum_source: form.aum_source.trim() || undefined,
          website: form.website.trim() || undefined,
          notes: form.notes.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pe-firms"] });
      toast.success("Firm added");
      setOpen(false);
      setForm({ name: "", status: "Target", aum_b: "", hq: "", location: "", layer: "", next_layer_tag: "", aum_source: "", website: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-1.5" /> Add firm
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add PE firm</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); if (form.name.trim()) mut.mutate(); }}
          className="space-y-3"
        >
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="AUM ($B)">
              <Input inputMode="decimal" value={form.aum_b} onChange={(e) => setForm({ ...form, aum_b: e.target.value })} placeholder="e.g. 12.5" />
            </Field>
            <Field label="HQ">
              <Input value={form.hq} onChange={(e) => setForm({ ...form, hq: e.target.value })} />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label="Layer">
              <Input value={form.layer} onChange={(e) => setForm({ ...form, layer: e.target.value })} />
            </Field>
            <Field label="Next Layer Tag">
              <Input value={form.next_layer_tag} onChange={(e) => setForm({ ...form, next_layer_tag: e.target.value })} />
            </Field>
          </div>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Source of AUM Figure">
            <Input value={form.aum_source} onChange={(e) => setForm({ ...form, aum_source: e.target.value })} />
          </Field>
          <Field label="Notes">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.name.trim() || mut.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {mut.isPending ? "Adding…" : "Add firm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
