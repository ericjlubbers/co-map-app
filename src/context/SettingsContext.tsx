import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface AppSettings {
  site_title: string;
}

const DEFAULTS: AppSettings = {
  site_title: "The Colorado Sun Map Tool",
};

interface SettingsContextValue {
  settings: AppSettings;
  /** Re-fetch settings from the API (e.g. after saving). */
  refresh: () => Promise<void>;
}

const SettingsCtx = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setSettings({
        site_title: data.settings?.site_title || DEFAULTS.site_title,
      });
    } catch {
      // Use defaults on error
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update the document title whenever settings change
  useEffect(() => {
    document.title = settings.site_title;
  }, [settings.site_title]);

  return (
    <SettingsCtx.Provider value={{ settings, refresh }}>
      {children}
    </SettingsCtx.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx)
    throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
