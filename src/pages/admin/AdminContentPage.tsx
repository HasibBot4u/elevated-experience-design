import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ChevronRight, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Subject, Cycle, Chapter, Video } from "@/types/nexus";

export default function AdminContentPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeCycle, setActiveCycle] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [s, c, ch, v] = await Promise.all([
      supabase.from("subjects").select("*").order("display_order"),
      supabase.from("cycles").select("*").order("display_order"),
      supabase.from("chapters").select("*").order("display_order"),
      supabase.from("videos").select("*").order("display_order"),
    ]);
    setSubjects((s.data ?? []) as Subject[]);
    setCycles((c.data ?? []) as Cycle[]);
    setChapters((ch.data ?? []) as Chapter[]);
    setVideos((v.data ?? []) as Video[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addSubject = async () => {
    const name = prompt("Subject name?"); if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("subjects").insert({ name, slug, display_order: subjects.length });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Subject added" }); load(); }
  };
  const addCycle = async () => {
    if (!activeSubject) return;
    const name = prompt("Cycle name?"); if (!name) return;
    const list = cycles.filter(c => c.subject_id === activeSubject);
    const { error } = await supabase.from("cycles").insert({ name, subject_id: activeSubject, display_order: list.length });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Cycle added" }); load(); }
  };
  const addChapter = async () => {
    if (!activeCycle) return;
    const name = prompt("Chapter name?"); if (!name) return;
    const requires = confirm("Require enrollment code for this chapter?");
    const list = chapters.filter(c => c.cycle_id === activeCycle);
    const { error } = await supabase.from("chapters").insert({ name, cycle_id: activeCycle, requires_enrollment: requires, display_order: list.length });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Chapter added" }); load(); }
  };
  const addVideo = async () => {
    if (!activeChapter) return;
    const title = prompt("Video title?"); if (!title) return;
    const source_type = (prompt("Source: youtube / drive / telegram", "youtube") || "youtube").trim();
    const url = prompt("Source URL or ID?") || "";
    const list = videos.filter(v => v.chapter_id === activeChapter);
    const payload: any = { title, chapter_id: activeChapter, source_type, source_url: url, display_order: list.length };
    if (source_type === "youtube") payload.youtube_video_id = url.match(/[a-zA-Z0-9_-]{11}/)?.[0] ?? url;
    if (source_type === "drive") payload.drive_file_id = url;
    const { error } = await supabase.from("videos").insert(payload);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Video added" }); load(); }
  };
  const removeRow = async (table: "subjects" | "cycles" | "chapters" | "videos", id: string) => {
    if (!confirm("Delete this item permanently?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };
  const renameRow = async (table: "subjects" | "cycles" | "chapters" | "videos", id: string, current: string) => {
    const name = prompt("New name?", current); if (!name || name === current) return;
    const field = table === "videos" ? "title" : "name";
    const { error } = await supabase.from(table).update({ [field]: name }).eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Renamed" }); load(); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const Col = ({ title, onAdd, children }: any) => (
    <div className="rounded-2xl border border-white/5 bg-surface flex flex-col min-h-[60vh]">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider text-foreground-muted">{title}</h3>
        {onAdd && <button onClick={onAdd} className="p-1.5 rounded-full bg-primary/15 text-primary hover:bg-primary/25"><Plus className="w-3.5 h-3.5" /></button>}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">{children}</div>
    </div>
  );
  const Item = ({ active, onClick, label, onRename, onDelete, hasChildren }: any) => (
    <div className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm ${active ? "bg-primary/15 text-primary" : "hover:bg-white/5"}`}>
      <button onClick={onClick} className="flex-1 text-left truncate">{label}</button>
      <button onClick={onRename} className="opacity-0 group-hover:opacity-100 p-1 hover:text-foreground"><Pencil className="w-3 h-3" /></button>
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
      {hasChildren && <ChevronRight className="w-3 h-3 opacity-50" />}
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Content library</h1>
        <p className="text-foreground-dim text-sm mt-1">Subject → Cycle → Chapter → Video</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Col title="Subjects" onAdd={addSubject}>
          {subjects.map(s => (
            <Item key={s.id} active={activeSubject === s.id}
              onClick={() => { setActiveSubject(s.id); setActiveCycle(null); setActiveChapter(null); }}
              onRename={() => renameRow("subjects", s.id, s.name)}
              onDelete={() => removeRow("subjects", s.id)}
              label={s.name} hasChildren />
          ))}
        </Col>
        <Col title="Cycles" onAdd={activeSubject ? addCycle : undefined}>
          {cycles.filter(c => c.subject_id === activeSubject).map(c => (
            <Item key={c.id} active={activeCycle === c.id}
              onClick={() => { setActiveCycle(c.id); setActiveChapter(null); }}
              onRename={() => renameRow("cycles", c.id, c.name)}
              onDelete={() => removeRow("cycles", c.id)}
              label={c.name} hasChildren />
          ))}
          {!activeSubject && <p className="text-xs text-foreground-muted p-3">Select a subject</p>}
        </Col>
        <Col title="Chapters" onAdd={activeCycle ? addChapter : undefined}>
          {chapters.filter(c => c.cycle_id === activeCycle).map(c => (
            <Item key={c.id} active={activeChapter === c.id}
              onClick={() => setActiveChapter(c.id)}
              onRename={() => renameRow("chapters", c.id, c.name)}
              onDelete={() => removeRow("chapters", c.id)}
              label={`${c.name}${c.requires_enrollment ? " 🔒" : ""}`} hasChildren />
          ))}
          {!activeCycle && <p className="text-xs text-foreground-muted p-3">Select a cycle</p>}
        </Col>
        <Col title="Videos" onAdd={activeChapter ? addVideo : undefined}>
          {videos.filter(v => v.chapter_id === activeChapter).map(v => (
            <Item key={v.id} active={false}
              onClick={() => {}}
              onRename={() => renameRow("videos", v.id, v.title)}
              onDelete={() => removeRow("videos", v.id)}
              label={`${v.title} · ${v.source_type}`} />
          ))}
          {!activeChapter && <p className="text-xs text-foreground-muted p-3">Select a chapter</p>}
        </Col>
      </div>
    </div>
  );
}
