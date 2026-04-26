import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceFingerprint } from "./useDeviceFingerprint";

/**
 * Chapter-access hook backed by the existing `chapter_access` table and
 * `redeem_enrollment_code` RPC in this Supabase project.
 */
export function useChapterAccess(chapterId: string | undefined, requiresEnrollment: boolean) {
  const { user } = useAuth();
  const fingerprint = useDeviceFingerprint();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAccess = useCallback(async () => {
    if (!chapterId) return;
    if (!requiresEnrollment) { setHasAccess(true); return; }
    if (!user) { setHasAccess(false); return; }
    setIsLoading(true);
    const { data } = await (supabase as any)
      .from("chapter_access")
      .select("id")
      .eq("user_id", user.id)
      .eq("chapter_id", chapterId)
      .maybeSingle();
    setHasAccess(!!data);
    setIsLoading(false);
  }, [user, chapterId, requiresEnrollment]);

  useEffect(() => { checkAccess(); }, [checkAccess]);

  const redeemCode = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    const normalized = code.replace(/\s|-/g, "").toUpperCase().trim();
    if (!normalized) return { success: false, error: "কোড খালি রাখা যাবে না।" };
    const { data, error } = await (supabase as any).rpc("redeem_enrollment_code", {
      _code: normalized,
      _device_fingerprint: fingerprint,
    });
    if (error) return { success: false, error: "কোডটি সঠিক নয়, মেয়াদ শেষ, বা সীমা পূর্ণ হয়েছে।" };
    const r = data as { ok?: boolean; chapter_id?: string; error?: string };
    if (!r?.ok) return { success: false, error: "কোডটি সঠিক নয়, মেয়াদ শেষ, বা সীমা পূর্ণ হয়েছে।" };
    if (chapterId && r.chapter_id && r.chapter_id !== chapterId) {
      return { success: false, error: "এই কোডটি অন্য একটি অধ্যায়ের জন্য।" };
    }
    setHasAccess(true);
    return { success: true };
  }, [chapterId, fingerprint]);

  return { hasAccess, isLoading, checkAccess, redeemCode, fingerprint };
}
