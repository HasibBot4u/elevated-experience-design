export type AppRole = "admin" | "user";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_blocked: boolean;
  last_active_at: string | null;
  created_at: string;
}

export interface Subject {
  id: string; name: string; name_bn: string | null; slug: string;
  icon: string | null; color: string | null; thumbnail_color: string | null;
  description: string | null; description_bn: string | null;
  display_order: number; is_active: boolean;
}

export interface Cycle {
  id: string; subject_id: string; name: string; name_bn: string | null;
  description: string | null; description_bn: string | null;
  telegram_channel_id: string | null;
  display_order: number; is_active: boolean;
}

export interface Chapter {
  id: string; cycle_id: string; name: string; name_bn: string | null;
  description: string | null; description_bn: string | null;
  requires_enrollment: boolean; display_order: number; is_active: boolean;
}

export interface Video {
  id: string; chapter_id: string; title: string; title_bn: string | null;
  description: string | null; description_bn: string | null;
  source_type: "telegram" | "youtube" | "drive";
  source_url: string | null;
  youtube_video_id: string | null;
  drive_file_id: string | null;
  telegram_channel_id: string | null;
  telegram_message_id: number | null;
  duration: string | null; size_mb: number | null;
  thumbnail_url: string | null;
  display_order: number; is_active: boolean;
  created_at: string;
}

export interface WatchHistoryRow {
  id: string; user_id: string; video_id: string;
  progress_percent: number; progress_seconds: number;
  completed: boolean; watch_count: number;
  watched_at: string;
}

export interface Announcement {
  id: string; title: string; title_bn: string | null;
  body: string | null; body_bn: string | null;
  type: "info" | "warning" | "success" | "urgent";
  is_active: boolean; show_on_dashboard: boolean;
  expires_at: string | null; created_at: string;
}

export interface Notification {
  id: string; user_id: string; title: string; title_bn: string | null;
  body: string | null; body_bn: string | null;
  type: "info" | "success" | "warning" | "system";
  is_read: boolean; action_url: string | null; created_at: string;
}

export interface LiveClass {
  id: string; title: string; title_bn: string | null;
  description: string | null; description_bn: string | null;
  subject_id: string | null; cycle_id: string | null;
  scheduled_at: string; duration_minutes: number;
  meeting_url: string | null; stream_url: string | null;
  is_active: boolean; is_cancelled: boolean; is_completed: boolean;
  created_at: string;
}

export interface EnrollmentCode {
  id: string; code: string; chapter_id: string;
  label: string | null; notes: string | null;
  max_uses: number; uses_count: number;
  is_active: boolean; generated_at: string;
}

export interface ChapterAccessRow {
  id: string; user_id: string; chapter_id: string;
  enrollment_code_id: string | null;
  device_fingerprint: string | null;
  first_accessed_at: string; last_accessed_at: string;
  access_count: number; is_blocked: boolean; blocked_reason: string | null;
}

export interface ActivityLog {
  id: string; user_id: string | null; action: string;
  details: Record<string, unknown>; ip_address: string | null;
  user_agent: string | null; created_at: string;
}
