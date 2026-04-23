import { Outlet, useLocation } from "react-router-dom";
import { StudentTopbar } from "./StudentTopbar";
import { StudentBottomNav } from "./StudentBottomNav";

export function StudentLayout() {
  const { pathname } = useLocation();
  const isPlayer = pathname.startsWith("/watch/");
  return (
    <div className={`min-h-screen bg-background ${isPlayer ? "" : "pb-20 md:pb-0"}`}>
      {!isPlayer && <StudentTopbar />}
      <Outlet />
      {!isPlayer && <StudentBottomNav />}
    </div>
  );
}
