import { useEffect, useState } from "react";
import { getPhotoUrl } from "../lib/photoStore";

/** Resolve an IndexedDB photo id to a renderable object-URL (session-cached). */
export function usePhotoUrl(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setUrl(null);
      return;
    }
    void getPhotoUrl(id).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}
