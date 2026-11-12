import { useEffect, useState } from "react";
import { API_URL } from "../api";

// /site-config, fetched once per page load: the banner and which tools are switched off.
let pending = null;
export function loadSiteConfig() {
  if (!pending) {
    pending = fetch(`${API_URL}/site-config`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  }
  return pending;
}

export function useSiteConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    let live = true;
    loadSiteConfig().then((c) => live && setConfig(c || {}));
    return () => { live = false; };
  }, []);
  return config;
}

export function useFeatureOn(name) {
  const c = useSiteConfig();
  return !(c?.features_off || []).includes(name);
}
