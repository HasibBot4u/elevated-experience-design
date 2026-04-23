import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export function ProtectedRoute({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const { user, isAdmin, isLoading, profile } = useAuth();
  const loc = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  if (profile?.is_blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="glass-strong rounded-2xl p-8 max-w-sm text-center">
          <h2 className="font-display text-xl font-bold text-destructive mb-2">Account suspended</h2>
          <p className="text-foreground-dim text-sm">Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
