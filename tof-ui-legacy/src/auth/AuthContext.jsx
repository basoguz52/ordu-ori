import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;
    apiClient
      .me()
      .then((res) => {
        if (!alive) return;
        setUser(res.user);
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
      })
      .finally(() => alive && setBooting(false));

    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!user,
      booting,

      async login(email, password) {
        const res = await apiClient.login(email, password);
        setUser(res.user);
      },

      async logout() {
        await apiClient.logout();
        setUser(null);
      },
    }),
    [user, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
