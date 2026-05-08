import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CandidateForm } from "./CandidateForm";
import { useServerFn } from "@tanstack/react-start";
import { createCandidate } from "@/lib/candidates.functions";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function AddCandidateDialog() {
  const [open, setOpen] = useState(false);
  const create = useServerFn(createCandidate);
  const navigate = useNavigate();
  const qc = useQueryClient();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-1" /> Add candidate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add candidate</DialogTitle></DialogHeader>
        <CandidateForm
          submitLabel="Create"
          onSubmit={async (v) => {
            try {
              const { id } = await create({ data: v as never });
              toast.success("Candidate added");
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["candidates"] });
              navigate({ to: "/candidates/$id", params: { id } });
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
