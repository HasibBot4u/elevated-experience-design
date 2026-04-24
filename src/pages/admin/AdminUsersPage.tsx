import { useEffect, useState } from "react";
import { Loader2, Shield, ShieldOff, Ban, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Profile, AppRole } from "@/types/nexus";

interface Row extends Profile { roles: AppRole[]; }

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role);
      map.set(r.user_id, arr);
    });
    setRows(((profiles ?? []) as Profile[]).map(p => ({ ...p, roles: map.get(p.id) ?? [] })));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleAdmin = async (r: Row) => {
    const isAdmin = r.roles.includes("admin");
    if (isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", r.id).eq("role", "admin");
    } else {
      await supabase.from("user_roles").insert({ user_id: r.id, role: "admin" });
    }
    toast({ title: isAdmin ? "Admin removed" : "Admin granted" });
    load();
  };
  const toggleBlock = async (r: Row) => {
    await supabase.from("profiles").update({ is_blocked: !r.is_blocked }).eq("id", r.id);
    toast({ title: r.is_blocked ? "User unblocked" : "User blocked" });
    load();
  };

  const filtered = rows.filter(r =>
    !q || (r.email ?? "").toLowerCase().includes(q.toLowerCase()) || (r.display_name ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Users</h1>
          <p className="text-foreground-dim mt-1 text-sm">{rows.length} total accounts</p>
        </div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email…"
          className="h-10 px-4 rounded-full bg-surface border border-white/10 text-sm w-72 max-w-full focus:outline-none focus:border-primary/50" />
      </header>
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-foreground-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <p className="font-medium">{r.display_name ?? "—"}</p>
                      <p className="text-xs text-foreground-muted">{r.email}</p>
                    </td>
                    <td className="p-4">
                      {r.roles.includes("admin") ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/15 text-primary">Admin</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/5 text-foreground-dim">User</span>
                      )}
                    </td>
                    <td className="p-4">
                      {r.is_blocked ? (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive"><Ban className="w-3 h-3" /> Blocked</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3 h-3" /> Active</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button onClick={() => toggleAdmin(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs">
                        {r.roles.includes("admin") ? <><ShieldOff className="w-3 h-3" /> Demote</> : <><Shield className="w-3 h-3" /> Promote</>}
                      </button>
                      <button onClick={() => toggleBlock(r)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 hover:bg-destructive/20 text-xs">
                        {r.is_blocked ? "Unblock" : "Block"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="p-10 text-center text-foreground-muted text-sm">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
