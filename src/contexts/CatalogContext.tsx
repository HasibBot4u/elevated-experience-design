import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Subject, Cycle, Chapter, Video } from "@/types/nexus";

export interface CatalogChapter extends Chapter { videos: Video[]; }
export interface CatalogCycle extends Cycle { chapters: CatalogChapter[]; }
export interface CatalogSubject extends Subject { cycles: CatalogCycle[]; }
export interface Catalog { subjects: CatalogSubject[]; totalVideos: number; }

interface Ctx {
  catalog: Catalog | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CatalogCtx = createContext<Ctx | undefined>(undefined);
const sb = supabase as any;

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [s, c, ch, v] = await Promise.all([
        sb.from("subjects").select("*").eq("is_active", true).order("order_index"),
        sb.from("cycles").select("*").eq("is_active", true).order("order_index"),
        sb.from("chapters").select("*").eq("is_active", true).order("order_index"),
        sb.from("videos").select("*").eq("is_active", true).order("order_index"),
      ]);
      if (s.error || c.error || ch.error || v.error) {
        throw s.error || c.error || ch.error || v.error;
      }
      const subjects = (s.data ?? []) as unknown as Subject[];
      const cycles = (c.data ?? []) as unknown as Cycle[];
      const chapters = (ch.data ?? []) as unknown as Chapter[];
      const videos = (v.data ?? []) as unknown as Video[];

      const built: CatalogSubject[] = subjects.map((subj) => ({
        ...subj,
        cycles: cycles
          .filter((cy) => cy.subject_id === subj.id)
          .map((cy) => ({
            ...cy,
            chapters: chapters
              .filter((cp) => cp.cycle_id === cy.id)
              .map((cp) => ({
                ...cp,
                videos: videos.filter((vi) => vi.chapter_id === cp.id),
              })),
          })),
      }));
      setCatalog({ subjects: built, totalVideos: videos.length });
    } catch (e: any) {
      setError(e?.message ?? "Failed to load catalog");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <CatalogCtx.Provider value={{ catalog, isLoading, error, refresh }}>{children}</CatalogCtx.Provider>;
}

export function useCatalog() {
  const v = useContext(CatalogCtx);
  if (!v) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return v;
}
