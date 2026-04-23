import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCatalog } from "@/contexts/CatalogContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function PlayerPage() {
  const { videoId } = useParams();
  const { catalog, isLoading } = useCatalog();
  const { user } = useAuth();
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resumeAt, setResumeAt] = useState(0);

  let video: any, chapter: any;
  catalog?.subjects.forEach(s => s.cycles.forEach(c => c.chapters.forEach(ch =>
    ch.videos.forEach(v => { if (v.id === videoId) { video = v; chapter = ch; } })
  )));

  useEffect(() => {
    if (!user || !videoId) return;
    supabase.from("watch_history").select("progress_seconds").eq("user_id", user.id).eq("video_id", videoId).maybeSingle()
      .then(({ data }) => { if (data) setResumeAt(data.progress_seconds || 0); });
  }, [user, videoId]);

  // Save progress every 10s
  useEffect(() => {
    if (!user || !video) return;
    const id = setInterval(async () => {
      const el = videoRef.current; if (!el || !el.duration) return;
      const seconds = Math.floor(el.currentTime);
      const percent = Math.min(100, Math.floor((el.currentTime / el.duration) * 100));
      const completed = percent >= 95;
      await supabase.from("watch_history").upsert({
        user_id: user.id, video_id: video.id,
        progress_seconds: seconds, progress_percent: percent,
        completed, watched_at: new Date().toISOString(),
      }, { onConflict: "user_id,video_id" });
    }, 10000);
    return () => clearInterval(id);
  }, [user, video]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!video) return <div className="min-h-screen flex items-center justify-center text-foreground-muted">Video not found.</div>;

  const isYouTube = video.source_type === "youtube" && video.youtube_video_id;
  const isDrive = video.source_type === "drive" && video.drive_file_id;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between glass-strong">
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-2 text-sm text-foreground-dim hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Link to={`/chapter/${chapter?.id}`} className="text-xs text-foreground-muted hover:text-foreground truncate max-w-[60%]">{chapter?.name}</Link>
      </div>

      <div className="container max-w-6xl py-6">
        <div className="rounded-2xl overflow-hidden bg-black border border-border aspect-video">
          {isYouTube ? (
            <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${video.youtube_video_id}?autoplay=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          ) : isDrive ? (
            <iframe className="w-full h-full" src={`https://drive.google.com/file/d/${video.drive_file_id}/preview`} allow="autoplay" allowFullScreen />
          ) : video.source_url ? (
            <video ref={videoRef} src={video.source_url} controls autoPlay
              onLoadedMetadata={(e) => { if (resumeAt > 0) (e.target as HTMLVideoElement).currentTime = resumeAt; }}
              className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground-muted">No playable source.</div>
          )}
        </div>
        <div className="mt-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{video.title}</h1>
          {video.title_bn && <p className="font-bangla text-foreground-dim mt-1">{video.title_bn}</p>}
          {video.description && <p className="text-foreground-dim mt-4 max-w-3xl">{video.description}</p>}
        </div>
      </div>
    </div>
  );
}
