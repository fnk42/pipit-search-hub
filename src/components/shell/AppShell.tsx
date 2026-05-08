import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Activity,
  Settings,
  LogOut,
  Upload,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth, ENGAGEMENT_TITLE, type AppRole } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard };

const recruiterNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Candidates", url: "/candidates", icon: Users },
  { title: "Import", url: "/import", icon: Upload },
  { title: "PE Firms", url: "/pe-firms", icon: Building2 },
  { title: "Weekly Report", url: "/weekly-report", icon: FileText },
  { title: "Activity Log", url: "/activity-log", icon: Activity },
  { title: "Settings", url: "/settings", icon: Settings },
];

const clientNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Candidates", url: "/candidates", icon: Users },
  { title: "Weekly Report", url: "/weekly-report", icon: FileText },
];

export function AppShell({ children, role }: { children: ReactNode; role: AppRole }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar role={role} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 px-4 sm:px-8 py-6 sm:py-10">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppSidebar({ role }: { role: AppRole }) {
  const items = role === "recruiter" ? recruiterNav : clientNav;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
          Golden Pipit
        </div>
        <div className="text-sm font-semibold text-sidebar-foreground mt-1">
          IR Search
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="relative data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-sidebar-primary" />
                        )}
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function TopBar() {
  const { user, role, signOut } = useAuth();
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();
  const roleLabel = role === "recruiter" ? "Recruiter" : "Client";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 h-14">
        <SidebarTrigger className="text-foreground" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-primary tracking-tight whitespace-nowrap">
            Golden Pipit Recruiting
          </span>
        </div>
        <div className="hidden md:flex flex-1 justify-center min-w-0">
          <span className="text-xs sm:text-sm text-muted-foreground truncate">
            {ENGAGEMENT_TITLE}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center rounded-full bg-accent/90 text-accent-foreground px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
            {roleLabel}
          </span>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            aria-label="Sign out"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="md:hidden px-4 pb-3 -mt-1 text-xs text-muted-foreground truncate">
        {ENGAGEMENT_TITLE}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-4 sm:px-8 py-4 text-center text-[11px] text-muted-foreground">
      Prepared by Golden Pipit Recruiting · View Park Towers, Nairobi · Confidential
    </footer>
  );
}
