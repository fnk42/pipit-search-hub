import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

type Common = {
  value: string | null | undefined;
  onSave: (next: string | null) => void | Promise<void>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  display?: (v: string | null | undefined) => React.ReactNode;
};

export function EditableText({ value, onSave, className, placeholder, disabled, display, multiline }: Common & { multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value ?? ""); }, [value]);

  const commit = async () => {
    setEditing(false);
    const next = draft.trim();
    const cur = (value ?? "").trim();
    if (next === cur) return;
    await onSave(next === "" ? null : next);
  };
  const cancel = () => { setDraft(value ?? ""); setEditing(false); };

  if (editing && !disabled) {
    if (multiline) {
      return (
        <Textarea
          ref={ref as never}
          value={draft}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
          }}
          className="h-auto min-h-[60px] text-sm"
        />
      );
    }
    return (
      <Input
        ref={ref as never}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") cancel();
        }}
        className="h-7 text-sm py-0"
      />
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) setEditing(true); }}
      className={cn(
        "group inline-flex items-center gap-1 max-w-full text-left rounded px-1 -mx-1 py-0.5",
        !disabled && "hover:bg-muted/60",
        className,
      )}
    >
      <span className="truncate">{display ? display(value) : (value || <span className="text-muted-foreground">{placeholder ?? "—"}</span>)}</span>
      {!disabled && <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />}
    </button>
  );
}

export function EditableSelect({
  value, onSave, options, placeholder, disabled, allowEmpty, display, className,
}: Common & { options: readonly string[]; allowEmpty?: boolean }) {
  const [editing, setEditing] = useState(false);
  const NONE = "__none__";
  if (editing && !disabled) {
    return (
      <Select
        defaultValue={value || (allowEmpty ? NONE : undefined)}
        onValueChange={async (v) => {
          setEditing(false);
          const next = v === NONE ? null : v;
          if ((next ?? "") !== (value ?? "")) await onSave(next);
        }}
        open
        onOpenChange={(o) => { if (!o) setEditing(false); }}
      >
        <SelectTrigger className="h-7 text-sm py-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value={NONE}>—</SelectItem>}
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) setEditing(true); }}
      className={cn(
        "group inline-flex items-center gap-1 max-w-full text-left rounded px-1 -mx-1 py-0.5",
        !disabled && "hover:bg-muted/60",
        className,
      )}
    >
      <span className="truncate">{display ? display(value) : (value || <span className="text-muted-foreground">{placeholder ?? "—"}</span>)}</span>
      {!disabled && <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />}
    </button>
  );
}

export function EditableDate({ value, onSave, disabled, className }: Common) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => { setDraft(value ?? ""); }, [value]);
  const commit = async () => {
    setEditing(false);
    if ((draft || "") !== (value || "")) await onSave(draft || null);
  };
  if (editing && !disabled) {
    return (
      <Input
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
        }}
        autoFocus
        className="h-7 text-sm py-0"
      />
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) setEditing(true); }}
      className={cn(
        "group inline-flex items-center gap-1 text-left rounded px-1 -mx-1 py-0.5",
        !disabled && "hover:bg-muted/60",
        className,
      )}
    >
      <span>{value || <span className="text-muted-foreground">—</span>}</span>
    </button>
  );
}
