import { useEffect, useState } from "react";
import { Loader2, Save, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettingsPage() {
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("system_settings").select("*").eq("key", "maintenance").maybeSingle();
      const v = (data?.value as any) ?? {};
      setMaintenance(!!v.enabled);
      setMessage(v.message ?? "");
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("system_settings").upsert({
      key: "maintenance",
      value: { enabled: maintenance, message },
      updated_at: new Date().toISOString(),
    } as any, { onConflict: "key" });
    setSaving(false);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "Settings saved" });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-3xl font-bold">System settings</h1>
        <p className="text-foreground-dim text-sm mt-1">Global toggles for the entire platform.</p>
      </header>
      <div className="rounded-2xl border border-white/5 bg-surface p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display font-semibold flex items-center gap-2"><Power className="w-4 h-4 text-warning" /> Maintenance mode</p>
            <p className="text-sm text-foreground-dim mt-1">Block non-admin users from accessing the app.</p>
          </div>
          <button onClick={() => setMaintenance(v => !v)} className={`relative w-12 h-7 rounded-full transition-colors ${maintenance ? "bg-primary" : "bg-white/10"}`}>
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${maintenance ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-foreground-muted">Maintenance message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
            placeholder="We'll be back shortly…"
            className="w-full p-3 rounded-xl bg-background border border-white/10 text-sm focus:outline-none focus:border-primary/50" />
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary-glow text-sm font-medium disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
        </button>
      </div>
    </div>
  );
}
