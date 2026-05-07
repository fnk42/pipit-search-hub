import { Card } from "@/components/ui/card";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
          Workspace
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold text-primary tracking-tight">{title}</h1>
      </div>
      <Card className="p-10 text-center shadow-[var(--shadow-soft)]">
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      </Card>
    </div>
  );
}
