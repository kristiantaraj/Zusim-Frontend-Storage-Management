import React, { createContext, useState, useEffect } from 'react';

export const RoleContext = createContext();

const MANAGER_AUTH_KEY = 'managerAuth';
const OWNER_AUTH_KEY = 'ownerAuth';

export function RoleProvider({ children }) {
  const [role, setRole] = useState(() => localStorage.getItem('role') || null);
  const [managerAuthenticated, setManagerAuthenticated] = useState(() => localStorage.getItem(MANAGER_AUTH_KEY) === '1');
  const [ownerAuthenticated, setOwnerAuthenticated] = useState(() => localStorage.getItem(OWNER_AUTH_KEY) === '1');
  const managerPassword = import.meta.env.VITE_MANAGER_PASSWORD || '';
  const ownerPassword = import.meta.env.VITE_OWNER_PASSWORD || '';

  useEffect(() => {
    if (role) {
      localStorage.setItem('role', role);
      return;
    }

    localStorage.removeItem('role');
  }, [role]);

  useEffect(() => {
    if (managerAuthenticated) {
      localStorage.setItem(MANAGER_AUTH_KEY, '1');
      return;
    }

    localStorage.removeItem(MANAGER_AUTH_KEY);
  }, [managerAuthenticated]);

  useEffect(() => {
    if (ownerAuthenticated) {
      localStorage.setItem(OWNER_AUTH_KEY, '1');
      return;
    }

    localStorage.removeItem(OWNER_AUTH_KEY);
  }, [ownerAuthenticated]);

  const logout = () => {
    setRole(null);
    setManagerAuthenticated(false);
    setOwnerAuthenticated(false);
  };

  const selectOperator = () => {
    setRole('operator');
  };

  const unlockManager = (passwordAttempt) => {
    if (!managerPassword) {
      return { ok: false, reason: 'missing-config' };
    }

    if (passwordAttempt === managerPassword) {
      setManagerAuthenticated(true);
      setRole('manager');
      return { ok: true };
    }

    return { ok: false, reason: 'invalid-password' };
  };

  const unlockOwner = (passwordAttempt) => {
    if (!ownerPassword) {
      return { ok: false, reason: 'missing-config' };
    }

    if (passwordAttempt === ownerPassword) {
      setOwnerAuthenticated(true);
      setRole('owner');
      return { ok: true };
    }

    return { ok: false, reason: 'invalid-password' };
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        managerAuthenticated,
        ownerAuthenticated,
        selectOperator,
        unlockManager,
        unlockOwner,
        logout,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = React.useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
