import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { User } from "@/types/api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isReferee: boolean;
  isClubManager: boolean;
  /** admin || referee || club_manager — panel yönetim yetkisi */
  canManage: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchMe(): Promise<User | null> {
  const { data } = await api.get<{ user: User | null }>("/me");
  return data.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });

  const loginMut = useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      const { data } = await api.post<{ user: User }>("/login", vars);
      return data.user;
    },
    onSuccess: (u) => qc.setQueryData(["me"], u),
  });

  const logoutMut = useMutation({
    mutationFn: async () => {
      await api.post("/logout");
    },
    onSuccess: () => qc.setQueryData(["me"], null),
  });

  const u = user ?? null;

  const value: AuthContextValue = {
    user: u,
    isLoading,
    isAdmin: !!u?.is_admin,
    isReferee: !!u?.is_referee,
    isClubManager: !!u?.is_club_manager,
    canManage: !!(u?.is_admin || u?.is_referee || u?.is_club_manager),
    login: (email, password) => loginMut.mutateAsync({ email, password }),
    logout: () => logoutMut.mutateAsync(),
    refresh: () => qc.invalidateQueries({ queryKey: ["me"] }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
