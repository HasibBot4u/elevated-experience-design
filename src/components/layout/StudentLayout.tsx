import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "./StudentSidebar";
import { StudentTopbar } from "./StudentTopbar";
import { StudentBottomNav } from "./StudentBottomNav";
import { BackendStatus } from "@/components/shared/BackendStatus";

export function StudentLayout() {
  const { pathname } = useLocation();
  const isPlayer = pathname.startsWith("/watch/");

  if (isPlayer) {
    // Full-bleed cinematic player — no shell chrome.
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop sidebar (icon-collapsible). Hidden on mobile via shadcn primitive. */}
        <StudentSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop sub-header w/ trigger + backend health */}
          <div className="hidden md:flex items-center gap-3 h-12 px-4 border-b border-border/40 bg-background/80 backdrop-blur sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex-1" />
            <BackendStatus />
          </div>

          {/* Mobile keeps the existing topbar (logo + search + bell + avatar) */}
          <div className="md:hidden">
            <StudentTopbar />
          </div>

          <main className="flex-1 pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>

        <StudentBottomNav />
      </div>
    </SidebarProvider>
  );
}
