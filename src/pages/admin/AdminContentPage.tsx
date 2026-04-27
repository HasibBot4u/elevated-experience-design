import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ChevronRight, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubjectRow { id: string; name: string; name_bn: string | null; slug: string; icon: string | null; color: string | null; display_order: number; is_active: boolean; }
interface CycleRow { id: string; subject_id: string; name: string; name_bn: string | null; display_order: number; is_active: boolean; }
interface ChapterRow { id: string; cycle_id: string; name: string; name_bn: string | null; description: string | null; requires_enrollment: boolean; display_order: number; is_active: boolean; }
interface VideoRow {
  id: string; chapter_id: string; title: string; title_bn: string | null;
  source_type: string; telegram_channel_id: string | null; telegram_message_id: number | null;
  youtube_video_id: string | null; drive_file_id: string | null;
  duration: string | null; thumbnail_url: string | null; size_mb: number | null;
  display_order: number; is_active: boolean;
}

const sb = supabase as any;
const DEFAULT_BACKEND = "https://nexusedu-backend-0bjq.onrender.com";

const warmupBackend = () => {
  const url = (import.meta.env.VITE_API_BASE_URL || DEFAULT_BACKEND).replace(/\/+$/, "");
  fetch(url + "/api/warmup", { method: "POST" }).catch(() => {});
};

export default function AdminContentPage() {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeCycle, setActiveCycle] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [s, c, ch, v] = await Promise.all([
      sb.from("subjects").select("*").order("display_order"),
      sb.from("cycles").select("*").order("display_order"),
      sb.from("chapters").select("*").order("display_order"),
      sb.from("videos").select("*").order("display_order"),
    ]);
    setSubjects((s.data ?? []) as SubjectRow[]);
    setCycles((c.data ?? []) as CycleRow[]);
    setChapters((ch.data ?? []) as ChapterRow[]);
    setVideos((v.data ?? []) as VideoRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const ok = (msg: string) => { toast({ title: msg }); load(); };
  const fail = (e: any) => toast({ title: "Failed", description: e?.message ?? String(e), variant: "destructive" });

  const addSubject = async () => {
    const name = prompt("Subject name?"); if (!name) return;
    const name_bn = prompt("Bengali name? (optional)") ?? null;
    const slug = name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const icon = prompt("Icon (emoji)?", "📚") ?? "📚";
    const color = prompt("Hex color?", "#FF2E55") ?? "#FF2E55";
    const { error } = await sb.from("subjects").insert({ name, name_bn, slug, icon, color, display_order: subjects.length, is_active: true });
    if (error) return fail(error); ok("Subject added");
  };
  const addCycle = async () => {
    if (!activeSubject) return;
    const name = prompt("Cycle name?"); if (!name) return;
    const name_bn = prompt("Bengali name?") ?? null;
    const list = cycles.filter(c => c.subject_id === activeSubject);
    const { error } = await sb.from("cycles").insert({ name, name_bn, subject_id: activeSubject, display_order: list.length, is_active: true });
    if (error) return fail(error); ok("Cycle added");
  };
  const addChapter = async () => {
    if (!activeCycle) return;
    const name = prompt("Chapter name?"); if (!name) return;
    const name_bn = prompt("Bengali name?") ?? null;
    const description = prompt("Description?") ?? null;
    const requires = confirm("Require enrollment code for this chapter?");
    const list = chapters.filter(c => c.cycle_id === activeCycle);
    const { error } = await sb.from("chapters").insert({ name, name_bn, description, cycle_id: activeCycle, requires_enrollment: requires, display_order: list.length, is_active: true });
    if (error) return fail(error);
    warmupBackend(); ok("Chapter added");
  };
  const addVideo = async () => {
    if (!activeChapter) return;
    const title = prompt("Video title?"); if (!title) return;
    const title_bn = prompt("Bengali title?") ?? null;
    const source_type = (prompt("Source: telegram / youtube / drive", "telegram") || "telegram").trim();
    const list = videos.filter(v => v.chapter_id === activeChapter);
    const payload: any = { title, title_bn, chapter_id: activeChapter, source_type, display_order: list.length, is_active: true };

    if (source_type === "telegram") {
      payload.telegram_channel_id = prompt("Telegram channel ID?") || null;
      const msg = prompt("Telegram message ID? (number)") || "";
      payload.telegram_message_id = msg ? parseInt(msg) : null;
    } else if (source_type === "youtube") {
      const url = prompt("YouTube video URL or ID?") || "";
      payload.youtube_video_id = url.match(/[a-zA-Z0-9_-]{11}/)?.[0] ?? url;
    } else if (source_type === "drive") {
      payload.drive_file_id = prompt("Google Drive file ID?") || null;
    }
    payload.duration = prompt("Duration (HH:MM:SS or MM:SS)?", "00:00") || "00:00";
    const size = prompt("Size MB? (optional)") || "";
    if (size) payload.size_mb = parseInt(size);
    payload.thumbnail_url = prompt("Thumbnail URL?") || null;

    const { error } = await sb.from("videos").insert(payload);
    if (error) return fail(error);
    warmupBackend(); ok("Video added");
  };

  const removeRow = async (table: "subjects" | "cycles" | "chapters" | "videos", id: string) => {
    if (!confirm("Delete permanently?")) return;
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) return fail(error);
    if (table === "videos" || table === "chapters") warmupBackend();
    ok("Deleted");
  };
  const renameRow = async (table: "subjects" | "cycles" | "chapters" | "videos", id: string, current: string) => {
    const name = prompt("New name?", current); if (!name || name === current) return;
    const payload: any = table === "videos" ? { title: name } : { name };
    const { error } = await sb.from(table).update(payload).eq("id", id);
    if (error) return fail(error);
    if (table === "videos" || table === "chapters") warmupBackend();
    ok("Renamed");
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
              label={`${s.icon ?? "📚"} ${s.name}`} hasChildren />
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
