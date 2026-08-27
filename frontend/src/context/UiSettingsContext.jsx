import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEYS = {
  destructiveConfirm: 'ui.destructiveConfirm',
  sidebarCollapsed: 'ui.sidebarCollapsed',
};

const UiSettingsContext = createContext(null);

function readBool(key, fallback) {
  const value = localStorage.getItem(key);
  if (value === null) return fallback;
  return value === '1';
}

export function UiSettingsProvider({ children }) {
  const [destructiveConfirm, setDestructiveConfirm] = useState(() => readBool(STORAGE_KEYS.destructiveConfirm, true));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readBool(STORAGE_KEYS.sidebarCollapsed, false));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.destructiveConfirm, destructiveConfirm ? '1' : '0');
  }, [destructiveConfirm]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  const value = useMemo(
    () => ({
      destructiveConfirm,
      setDestructiveConfirm,
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed: () => setSidebarCollapsed((current) => !current),
    }),
    [destructiveConfirm, sidebarCollapsed]
  );

  return <UiSettingsContext.Provider value={value}>{children}</UiSettingsContext.Provider>;
}

export function useUiSettings() {
  const ctx = useContext(UiSettingsContext);
  if (!ctx) throw new Error('useUiSettings must be used within UiSettingsProvider');
  return ctx;
}
