import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useCatalog } from "@/contexts/CatalogContext";
import { Input } from "@/components/ui/input";

export default function SearchPage() {
  const { catalog } = useCatalog();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    if (!catalog || q.trim().length < 2) return [];
    const needle = q.toLowerCase();
    const hits: { id: string; title: string; subject: string; chapter: string }[] = [];
    catalog.subjects.forEach(s => s.cycles.forEach(c => c.chapters.forEach(ch =>
      ch.videos.forEach(v => {
        if (v.title.toLowerCase().includes(needle) || (v.title_bn ?? "").toLowerCase().includes(needle)) {
          hits.push({ id: v.id, title: v.title, subject: s.name, chapter: ch.name });
        }
      })
    )));
    return hits.slice(0, 50);
  }, [catalog, q]);

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">Find</p>
        <h1 className="font-display text-4xl font-bold tracking-tighter mb-6">Search lessons</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search videos…" className="pl-12 h-14 text-lg" />
        </div>
      </div>

      {q.length >= 2 && (
        <p className="text-xs text-foreground-muted">{results.length} result{results.length !== 1 ? "s" : ""}</p>
      )}

      <div className="space-y-2">
        {results.map(r => (
          <Link key={r.id} to={`/watch/${r.id}`} className="block p-4 rounded-xl bg-background-elevated border border-border hover:border-primary/40 transition-colors">
            <p className="font-medium">{r.title}</p>
            <p className="text-xs text-foreground-muted mt-1">{r.subject} · {r.chapter}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
