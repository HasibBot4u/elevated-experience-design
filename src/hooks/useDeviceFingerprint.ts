import { useMemo } from "react";

export function useDeviceFingerprint(): string {
  return useMemo(() => {
    const components = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}`,
      screen.colorDepth.toString(),
      new Date().getTimezoneOffset().toString(),
      (navigator.hardwareConcurrency || 0).toString(),
      navigator.platform || "unknown",
    ];
    const str = components.join("|||");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36) + "-" + str.length.toString(36);
  }, []);
}
