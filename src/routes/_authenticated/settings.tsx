import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { getAppSettings, updateSearchStartDate } from "@/lib/app-settings.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getAppSettings);
  const updateFn = useServerFn(updateSearchStartDate);

  const { data, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => getFn(),
  });

  const [date, setDate] = useState<Date | undefined>(undefined);
  const current = data?.search_start_date ? parseISO(data.search_start_date) : undefined;
  const selected = date ?? current;

  const mut = useMutation({
    mutationFn: async (d: Date) =>
      updateFn({ data: { search_start_date: format(d, "yyyy-MM-dd") } }),
    onSuccess: () => {
      toast.success("Search start date updated");
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setDate(undefined);
    },
    onError: () => toast.error("Couldn't save — please try again."),
  });

  const dirty = !!date && (!current || date.getTime() !== current.getTime());

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Settings</p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-primary tracking-tight">Engagement settings</h1>
      </div>

      <Card className="p-6 shadow-[var(--shadow-soft)] space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-primary">Search start date</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Anchors the "Days active" counter on the dashboard. Set this to the day the search kicked off.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={isLoading}
                className={cn("w-[260px] justify-start text-left font-normal", !selected && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selected ? format(selected, "MMMM d, yyyy") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={() => date && mut.mutate(date)}
            disabled={!dirty || mut.isPending}
          >
            {mut.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
