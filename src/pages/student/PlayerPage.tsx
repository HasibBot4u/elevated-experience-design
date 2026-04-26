import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, RotateCw, StickyNote, ChevronDown, ChevronUp } from "lucide-react";
import { useCatalog } from "@/contexts/CatalogContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || "https://nexusedu-backend-0bjq.onrender.com";

type SourceKind = "youtube" | "drive" | "telegram";

function getVideoSource(video: any): { type: SourceKind; url: string } {
  if (video.source_type === "youtube" && (video.youtube_video_id || video.youtube_id)) {
    const id = video.youtube_video_id ?? video.youtube_id;
    return { type: "youtube", url: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` };
  }
  if (video.source_type === "drive" && video.drive_file_id) {
    return { type: "drive", url: `https://drive.google.com/file/d/${video.drive_file_id}/preview` };
  }
  if (video.source_url) {
    return { type: "telegram", url: video.source_url };
  }
  return { type: "telegram", url: `${API_BASE}/api/video/${video.id}` };
}

export default function PlayerPage() {
  const { videoId } = useParams();
  const { catalog, isLoading } = useCatalog();
  const { user } = useAuth();
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [errored, setErrored] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  let video: any, chapter: any;
  catalog?.subjects.forEach(s => s.cycles.forEach(c => c.chapters.forEach(ch =>
    ch.videos.forEach(v => { if (v.id === videoId) { video = v; chapter = ch; } })
  )));

  const source = video ? getVideoSource(video) : null;

  // Wake telegram backend up on mount
  useEffect(() => {
    if (source?.type === "telegram") {
      fetch(`${API_BASE}/api/health`).catch(() => {});
    }
  }, [source?.type]);

  // Load existing watch progress + notes
  useEffect(() => {
    if (!user || !video) return;
    (supabase as any).from("watch_history")
      .select("progress_seconds")
      .eq("user_id", user.id)
      .eq("video_id", video.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.progress_seconds && videoRef.current) {
          try { videoRef.current.currentTime = data.progress_seconds; } catch {}
        }
      });

    (supabase as any).from("video_notes")
      .select("content")
      .eq("user_id", user.id)
      .eq("video_id", video.id)
      .maybeSingle()
      .then(({ data }: any) => { if (data?.content) setNotes(data.content); });
  }, [user, video]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !user || !video) return;
    const currentTime = Math.floor(videoRef.current.currentTime);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const duration = Math.floor(videoRef.current?.duration || 0);
      const completed = duration > 0 && currentTime / duration >= 0.9;
      const percent = duration > 0 ? Math.min(100, Math.floor((currentTime / duration) * 100)) : 0;
      await (supabase as any).from("watch_history").upsert({
        user_id: user.id,
        video_id: video.id,
        progress_seconds: currentTime,
        progress_percent: percent,
        completed,
        updated_at: new Date().toISOString(),
        watched_at: new Date().toISOString(),
      }, { onConflict: "user_id,video_id" });
    }, 5000);
  }, [user, video]);

  const handleVideoEnded = useCallback(async () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    if (!user || !video) return;
    await (supabase as any).from("watch_history").upsert({
      user_id: user.id,
      video_id: video.id,
      progress_seconds: Math.floor(videoRef.current?.duration || 0),
      progress_percent: 100,
      completed: true,
      updated_at: new Date().toISOString(),
      watched_at: new Date().toISOString(),
    }, { onConflict: "user_id,video_id" });
  }, [user, video]);

  const retryPlayback = useCallback(() => {
    setErrored(false);
    setCountdown(30);
    if (videoRef.current) {
      try { videoRef.current.load(); videoRef.current.play().catch(() => {}); } catch {}
    }
  }, []);

  const handleVideoError = useCallback(() => {
    setErrored(true);
    setCountdown(30);
  }, []);

  // Auto-retry countdown for telegram errors
  useEffect(() => {
    if (!errored) {
      if (retryTimer.current) clearInterval(retryTimer.current);
      return;
    }
    retryTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { retryPlayback(); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (retryTimer.current) clearInterval(retryTimer.current); };
  }, [errored, retryPlayback]);

  // Notes auto-save (2s after typing pause)
  const onNotesChange = (val: string) => {
    setNotes(val);
    if (!user || !video) return;
    if (noteSaveTimeout.current) clearTimeout(noteSaveTimeout.current);
    setNoteSaving(true);
    noteSaveTimeout.current = setTimeout(async () => {
      await (supabase as any).from("video_notes").upsert({
        user_id: user.id,
        video_id: video.id,
        content: val,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,video_id" });
      setNoteSaving(false);
    }, 2000);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (noteSaveTimeout.current) clearTimeout(noteSaveTimeout.current);
      if (retryTimer.current) clearInterval(retryTimer.current);
    };
  }, []);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>;
  }
  if (!video || !source) {
    return <div className="min-h-screen flex items-center justify-center text-foreground-muted">Video not found.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between glass-strong">
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-2 text-sm text-foreground-dim hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Link to={`/chapter/${chapter?.id}`} className="text-xs text-foreground-muted hover:text-foreground truncate max-w-[60%]">
          {chapter?.name}
        </Link>
      </div>

      <div className="container max-w-6xl py-6">
        <div className="rounded-2xl overflow-hidden bg-black border border-border aspect-video relative">
          {source.type === "youtube" || source.type === "drive" ? (
            <iframe
              className="w-full h-full"
              src={source.url}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : errored ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="rounded-2xl glass-strong border border-border p-8 max-w-md text-center">
                <p className="font-bangla text-foreground mb-3">
                  ভিডিও লোড হচ্ছে না। ব্যাকএন্ড সার্ভার চালু হতে কিছু সময় লাগছে।
                </p>
                <p className="font-bangla text-sm text-foreground-muted mb-5">
                  {countdown} সেকেন্ড পরে আবার চেষ্টা করা হবে...
                </p>
                <Button onClick={retryPlayback} className="rounded-full bg-primary hover:bg-primary-glow shadow-glow">
                  <RotateCw className="w-4 h-4 mr-2" /> আবার চেষ্টা করুন
                </Button>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={source.url}
              controls
              autoPlay
              preload="auto"
              className="w-full h-full"
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onError={handleVideoError}
            />
          )}
        </div>

        <div className="mt-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{video.title}</h1>
          {video.title_bn && <p className="font-bangla text-foreground-dim mt-1">{video.title_bn}</p>}
          {video.description && <p className="text-foreground-dim mt-4 max-w-3xl">{video.description}</p>}
        </div>

        {/* Notes panel */}
        <div className="mt-8 rounded-2xl bg-background-elevated border border-border overflow-hidden">
          <button
            onClick={() => setNotesOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-background-overlay transition-colors"
          >
            <span className="flex items-center gap-2 font-medium">
              <StickyNote className="w-4 h-4 text-primary" />
              <span className="font-bangla">নোট লিখুন</span>
              {noteSaving && <Loader2 className="w-3 h-3 animate-spin text-foreground-muted ml-2" />}
            </span>
            {notesOpen ? <ChevronUp className="w-4 h-4 text-foreground-muted" /> : <ChevronDown className="w-4 h-4 text-foreground-muted" />}
          </button>
          {notesOpen && (
            <div className="p-5 border-t border-border">
              <Textarea
                value={notes}
                onChange={e => onNotesChange(e.target.value)}
                placeholder="এই ভিডিও সম্পর্কে আপনার নোট এখানে লিখুন..."
                className="font-bangla min-h-[160px] bg-background border-border focus:border-primary"
                maxLength={5000}
              />
              <p className="text-xs text-foreground-muted mt-2 text-right">{notes.length} / 5000</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
