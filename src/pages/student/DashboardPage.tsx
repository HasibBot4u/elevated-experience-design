import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PlayCircle, Bell, Flame, BookMarked, ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { supabase } from "@/integrations/supabase/client";
import type { Announcement } from "@/types/nexus";

interface ContinueRow { video_id: string; progress_percent: number; progress_seconds: number; watched_at: string; }

export default function DashboardPage() {
  const { profile } = useAuth();
  const { catalog, isLoading } = useCatalog();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [continueRows, setContinueRows] = useState<ContinueRow[]>([]);
  const [stats, setStats] = useState({ completed: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (!profile) return;
    supabase.from("announcements").select("*")
      .eq("is_active", true).eq("show_on_dashboard", true)
      .order("created_at", { ascending: false }).limit(3)
      .then(({ data }) => setAnnouncements((data as Announcement[]) ?? []));

    supabase.from("watch_history")
      .select("video_id, progress_percent, progress_seconds, watched_at, completed")
      .eq("user_id", profile.id)
      .order("watched_at", { ascending: false }).limit(20)
      .then(({ data }) => {
        const rows = (data ?? []) as any[];
        setContinueRows(rows.filter(r => !r.completed && r.progress_percent < 95).slice(0, 8));
        const totalSec = rows.reduce((s, r) => s + (r.progress_seconds || 0), 0);
        setStats({
          completed: rows.filter(r => r.completed).length,
          hours: Math.floor(totalSec / 3600),
          minutes: Math.floor((totalSec % 3600) / 60),
        });
      });
  }, [profile]);

  // Map continue rows to videos in catalog
  const continueVideos = useMemo(() => {
    if (!catalog) return [];
    const videoMap = new Map<string, { video: any; subject: any; chapter: any }>();
    catalog.subjects.forEach(s => s.cycles.forEach(c => c.chapters.forEach(ch =>
      ch.videos.forEach(v => videoMap.set(v.id, { video: v, subject: s, chapter: ch }))
    )));
    return continueRows.map(r => ({ ...videoMap.get(r.video_id), progress: r.progress_percent })).filter(x => x.video);
  }, [catalog, continueRows]);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  return (
    <div className="container py-8 space-y-12">
      {/* Hero greeting */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Today</p>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter">
          {greeting}, <span className="text-gradient">{profile?.display_name?.split(" ")[0] ?? "student"}</span>.
        </h1>
        <p className="mt-2 text-foreground-dim">Pick up where you left off.</p>
      </motion.section>

      {/* Stats trio */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatTile icon={PlayCircle} label="Videos completed" value={stats.completed} />
        <StatTile icon={Flame} label="Watch time" value={`${stats.hours}h ${stats.minutes}m`} />
        <StatTile icon={BookMarked} label="Subjects" value={catalog?.subjects.length ?? 0} className="col-span-2 md:col-span-1" />
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-accent" /> Announcements</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {announcements.map(a => (
              <div key={a.id} className="rounded-2xl p-5 bg-background-elevated border border-border">
                <p className={`text-[10px] uppercase tracking-wider font-semibold mb-2 ${
                  a.type === "urgent" ? "text-destructive" : a.type === "warning" ? "text-warning" : a.type === "success" ? "text-success" : "text-info"
                }`}>{a.type}</p>
                <p className="font-semibold mb-1">{a.title}</p>
                {a.body && <p className="text-sm text-foreground-dim line-clamp-2">{a.body}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Continue watching rail */}
      {continueVideos.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Continue watching</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
            {continueVideos.map((c, i) => (
              <Link key={c.video.id} to={`/watch/${c.video.id}`} className="flex-shrink-0 w-72 group">
                <div className="poster-card aspect-video bg-gradient-card border border-border relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-foreground/80 group-hover:text-primary group-hover:scale-110 transition-all" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-background/60">
                    <div className="h-full bg-primary" style={{ width: `${c.progress}%` }} />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-foreground-muted">{c.subject.name} · {c.chapter.name}</p>
                  <p className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{c.video.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Subjects rail */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Browse by subject</h2>
          <Link to="/courses" className="text-sm text-foreground-muted hover:text-foreground inline-flex items-center gap-1">
            All courses <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[0,1,2].map(i => <div key={i} className="aspect-video rounded-2xl bg-background-elevated animate-pulse" />)}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {catalog?.subjects.map((s, i) => (
              <motion.div key={s.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <Link to={`/subject/${s.slug}`}
                  className="poster-card group block aspect-[16/10] p-6 bg-gradient-card border border-border hover:border-primary/40 relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 blur-2xl"
                    style={{ background: s.color ?? "hsl(var(--primary))" }} />
                  <div className="relative flex flex-col h-full justify-between">
                    <div>
                      <span className="text-3xl">{s.icon}</span>
                      <h3 className="font-display text-2xl font-bold mt-3">{s.name}</h3>
                      {s.name_bn && <p className="font-bangla text-sm text-foreground-muted">{s.name_bn}</p>}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground-muted">{s.cycles.length} cycle{s.cycles.length !== 1 ? "s" : ""}</span>
                      <Sparkles className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, className = "" }: { icon: any; label: string; value: any; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 bg-background-elevated border border-border ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-foreground-muted">{label}</p>
          <p className="font-display text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
