import { useEffect, useState } from "react";
import { TrendingUp, PlayCircle, Clock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function ProgressPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, completed: 0, hours: 0, minutes: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("watch_history")
      .select("progress_seconds, completed, watched_at, videos(title)")
      .eq("user_id", user.id)
      .order("watched_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as any[];
        const totalSec = rows.reduce((s, r) => s + (r.progress_seconds || 0), 0);
        setStats({
          total: rows.length,
          completed: rows.filter(r => r.completed).length,
          hours: Math.floor(totalSec / 3600),
          minutes: Math.floor((totalSec % 3600) / 60),
        });
        setRecent(rows.slice(0, 10));
      });
  }, [user]);

  return (
    <div className="container max-w-4xl py-10 space-y-10">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Analytics</p>
        <h1 className="font-display text-4xl font-bold tracking-tighter flex items-center gap-3">
          Your progress <TrendingUp className="w-6 h-6 text-primary" />
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile icon={PlayCircle} label="Started" value={stats.total} />
        <Tile icon={CheckCircle2} label="Completed" value={stats.completed} />
        <Tile icon={Clock} label="Hours" value={stats.hours} />
        <Tile icon={Clock} label="Minutes" value={stats.minutes} />
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="text-foreground-muted text-sm">No activity yet. Start watching to see your progress here.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((r, i) => (
              <div key={i} className="rounded-xl p-4 bg-background-elevated border border-border flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{r.videos?.title ?? "Video"}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">{new Date(r.watched_at).toLocaleString()}</p>
                </div>
                {r.completed && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-2xl p-5 bg-background-elevated border border-border">
      <Icon className="w-5 h-5 text-primary mb-3" />
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="text-xs text-foreground-muted mt-1">{label}</p>
    </div>
  );
}
