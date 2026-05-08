import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvImporter } from "@/components/import/CsvImporter";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/import")({
  component: ImportPage,
});

function ImportPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (role === "client") navigate({ to: "/dashboard" });
  }, [role, navigate]);

  if (role !== "recruiter") return null;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Import data</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload a CSV, map the columns, validate, and import.</p>
      </div>
      <Tabs defaultValue="candidates">
        <TabsList>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="pe_firms">PE Firms</TabsTrigger>
        </TabsList>
        <TabsContent value="candidates" className="mt-4">
          <Card><CardHeader><CardTitle className="text-base">Import candidates</CardTitle></CardHeader>
            <CardContent><CsvImporter kind="candidates" /></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pe_firms" className="mt-4">
          <Card><CardHeader><CardTitle className="text-base">Import PE firms</CardTitle></CardHeader>
            <CardContent><CsvImporter kind="pe_firms" /></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
