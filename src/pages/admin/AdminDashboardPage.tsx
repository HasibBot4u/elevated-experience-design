import { useEffect, useState } from "react";
import { Users, BookOpen, PlayCircle, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stats { users: number; videos: number; chapters: number; codes: number; }

export default function AdminDashboardPage() {
  const [s, setS] = useState<Stats>({ users: 0, videos: 0, chapters: 0, codes: 0 });
  useEffect(() => {
    (async () => {
      const [u, v, ch, c] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("videos").select("id", { count: "exact", head: true }),
        supabase.from("chapters").select("id", { count: "exact", head: true }),
        supabase.from("enrollment_codes").select("id", { count: "exact", head: true }),
      ]);
      setS({ users: u.count ?? 0, videos: v.count ?? 0, chapters: ch.count ?? 0, codes: c.count ?? 0 });
    })();
  }, []);
  const tiles = [
    { label: "Users", value: s.users, icon: Users, color: "from-primary to-primary-glow" },
    { label: "Videos", value: s.videos, icon: PlayCircle, color: "from-accent to-accent/70" },
    { label: "Chapters", value: s.chapters, icon: BookOpen, color: "from-success to-success/70" },
    { label: "Enrollment codes", value: s.codes, icon: KeyRound, color: "from-warning to-warning/70" },
  ];
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-primary mb-2">Admin Console</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold">Mission control</h1>
        <p className="text-foreground-dim mt-1">Live system snapshot at a glance.</p>
      </header>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map(t => (
          <div key={t.label} className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface p-5 group hover:border-primary/30 transition-all">
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${t.color} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} />
            <t.icon className="w-5 h-5 text-foreground-dim relative" />
            <p className="text-3xl font-display font-bold mt-3 relative">{t.value}</p>
            <p className="text-xs text-foreground-muted mt-1 relative">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
