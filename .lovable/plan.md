# Fix: Stage (and other inline-select) edits don't persist

## Problem
Clicking the pencil on Stage opens a dropdown, but picking a new value never sticks — the row reverts to the original stage. Same latent bug affects Fit, Location, and Screen-out-reason (all use the same component).

## Root cause
In `src/components/candidates/EditableCell.tsx`, `EditableSelect` forces the Radix `Select` open and listens to `onOpenChange` to close itself:

```ts
onValueChange={async (v) => { setEditing(false); ...; await onSave(next); }}
open
onOpenChange={(o) => { if (!o) setEditing(false); }}
```

When the user picks an item, Radix fires `onOpenChange(false)` which calls `setEditing(false)`. That unmounts the `<Select>` immediately, and the `await onSave(next)` inside `onValueChange` is racing against the unmount — the network call gets dropped before it reaches the server function. Result: UI re-renders with stale `value` prop and the change appears to have never happened.

## Fix (single file)
`src/components/candidates/EditableCell.tsx` — rewrite only the editing branch of `EditableSelect`:

1. Make the Select **controlled**: `value={value ?? (allowEmpty ? NONE : "")}` (drop `defaultValue`).
2. In `onValueChange`: `await onSave(next)` FIRST, then `setEditing(false)`.
3. Add a `savingRef` so `onOpenChange(false)` doesn't pre-empt the save:
   ```ts
   const savingRef = useRef(false);
   onValueChange={async (v) => {
     savingRef.current = true;
     const next = v === NONE ? null : v;
     if ((next ?? "") !== (value ?? "")) await onSave(next);
     savingRef.current = false;
     setEditing(false);
   }}
   onOpenChange={(o) => { if (!o && !savingRef.current) setEditing(false); }}
   ```

No changes to `CandidatesTable.tsx`, server functions, schema, badge colours, or layout.

## Success criteria
- Click a stage badge → dropdown opens directly below.
- Pick a different stage → dropdown closes, badge re-renders with new value + correct colour.
- Reload → new value is still there (persisted).
- Escape or click-outside → dropdown closes, no save.
- Fit, Location, Screen-out-reason inline edits all persist the same way.
- No console/toast errors, no double-save.
