import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Announcement } from "@/types/nexus";

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Announcement[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const title = prompt("Title?"); if (!title) return;
    const body = prompt("Body?") || "";
    const type = (prompt("Type: info / warning / success / urgent", "info") || "info").trim();
    const { error } = await supabase.from("announcements").insert({ title, body, type });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Posted" }); load(); }
  };
  const toggle = async (a: Announcement) => { await supabase.from("announcements").update({ is_active: !a.is_active }).eq("id", a.id); load(); };
  const remove = async (id: string) => { if (!confirm("Delete?")) return; await supabase.from("announcements").delete().eq("id", id); load(); };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Announcements</h1>
          <p className="text-foreground-dim text-sm mt-1">Broadcast messages to all users.</p>
        </div>
        <button onClick={create} className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium">
          <Plus className="w-4 h-4" /> New
        </button>
      </header>
      <div className="grid gap-3">
        {list.map(a => (
          <div key={a.id} className="rounded-2xl border border-white/5 bg-surface p-5 flex items-start gap-4">
            <span className={`mt-1 w-2 h-2 rounded-full ${a.type === "urgent" ? "bg-destructive" : a.type === "warning" ? "bg-warning" : a.type === "success" ? "bg-success" : "bg-primary"}`} />
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold">{a.title}</p>
              {a.body && <p className="text-sm text-foreground-dim mt-1">{a.body}</p>}
              <p className="text-xs text-foreground-muted mt-2">{new Date(a.created_at).toLocaleString()} · {a.type}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => toggle(a)} className={`px-3 py-1.5 rounded-full text-xs ${a.is_active ? "bg-success/15 text-success" : "bg-white/5 text-foreground-dim"}`}>
                {a.is_active ? "Active" : "Hidden"}
              </button>
              <button onClick={() => remove(a.id)} className="px-3 py-1.5 rounded-full text-xs bg-white/5 text-destructive hover:bg-destructive/15"><Trash2 className="w-3 h-3 inline" /></button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-center text-foreground-muted py-10">No announcements</p>}
      </div>
    </div>
  );
}
