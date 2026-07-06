import { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

const SettingsContext = createContext({
  settings: { price_tool_enabled: true },
  reload: () => {},
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ price_tool_enabled: true });

  const reload = () => {
    api.get("/settings")
      .then(({ data }) => setSettings({ ...settings, ...data }))
      .catch(() => { /* keep defaults */ });
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  return (
    <SettingsContext.Provider value={{ settings, reload }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
