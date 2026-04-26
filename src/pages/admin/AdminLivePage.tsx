import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { LiveClass } from "@/types/nexus";

const sb = supabase as any;

export default function AdminLivePage() {
  const [list, setList] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from("live_classes").select("*").order("start_time", { ascending: false });
    setList((data ?? []) as unknown as LiveClass[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const title = prompt("Title?"); if (!title) return;
    const when = prompt("Start time (YYYY-MM-DD HH:mm)?", new Date().toISOString().slice(0, 16).replace("T", " "));
    if (!when) return;
    const url = prompt("Join URL?") || null;
    const { error } = await sb.from("live_classes").insert({ title, start_time: new Date(when).toISOString(), join_url: url, is_active: true });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Scheduled" }); load(); }
  };
  const remove = async (id: string) => { if (!confirm("Cancel this class?")) return; await sb.from("live_classes").delete().eq("id", id); load(); };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Live classes</h1>
          <p className="text-foreground-dim text-sm mt-1">Schedule streams and meetings.</p>
        </div>
        <button onClick={create} className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium">
          <Plus className="w-4 h-4" /> Schedule
        </button>
      </header>
      <div className="grid gap-3">
        {list.map(l => (
          <div key={l.id} className="rounded-2xl border border-white/5 bg-surface p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Radio className="w-5 h-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold">{l.title}</p>
              <p className="text-xs text-foreground-muted mt-1">{new Date(l.start_time).toLocaleString()}</p>
              {l.join_url && <a href={l.join_url} target="_blank" className="text-xs text-primary hover:underline">Join link</a>}
            </div>
            <button onClick={() => remove(l.id)} className="px-3 py-1.5 rounded-full text-xs bg-white/5 text-destructive hover:bg-destructive/15"><Trash2 className="w-3 h-3 inline" /></button>
          </div>
        ))}
        {list.length === 0 && <p className="text-center text-foreground-muted py-10">Nothing scheduled</p>}
      </div>
    </div>
  );
}
