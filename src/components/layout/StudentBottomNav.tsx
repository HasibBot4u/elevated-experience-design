import { NavLink } from "react-router-dom";
import { Home, BookOpen, Radio, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/courses", icon: BookOpen, label: "Courses" },
  { to: "/live", icon: Radio, label: "Live" },
  { to: "/profile", icon: User, label: "Profile" },
];

export function StudentBottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden glass-strong border-t border-border/50">
      <div className="grid grid-cols-4 h-16">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn(
            "flex flex-col items-center justify-center gap-0.5 transition-colors",
            isActive ? "text-primary" : "text-foreground-muted"
          )}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
