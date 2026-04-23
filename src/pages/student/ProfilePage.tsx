import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

export default function ProfilePage() {
  const { profile, user, isAdmin, refresh } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: name, phone }).eq("id", user.id);
    setBusy(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    await refresh();
    toast({ title: "Profile updated" });
  };

  const initial = profile?.display_name?.charAt(0).toUpperCase() ?? "U";
  return (
    <div className="container max-w-2xl py-10 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Account</p>
        <h1 className="font-display text-4xl font-bold tracking-tighter">Your profile</h1>
      </div>

      <div className="rounded-2xl p-7 bg-background-elevated border border-border flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-3xl font-bold shadow-glow">{initial}</div>
        <div>
          <p className="font-display text-xl font-semibold">{profile?.display_name ?? "Student"}</p>
          <p className="text-sm text-foreground-muted">{profile?.email}</p>
          {isAdmin && <span className="inline-flex items-center gap-1 mt-2 text-xs text-accent"><ShieldCheck className="w-3.5 h-3.5" /> Administrator</span>}
        </div>
      </div>

      <div className="rounded-2xl p-7 bg-background-elevated border border-border space-y-4">
        <div className="space-y-2"><Label>Display name</Label><Input value={name} onChange={e => setName(e.target.value)} className="h-11" /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="h-11" placeholder="+880…" /></div>
        <Button onClick={save} disabled={busy} className="rounded-full bg-primary hover:bg-primary-glow font-semibold shadow-glow">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
