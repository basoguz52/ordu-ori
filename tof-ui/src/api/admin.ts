import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { Club } from "@/types/api";

export type UserStatus = "pending" | "active" | "rejected";

/** Admin kullanıcı satırı (AdminController::userRow ile birebir). */
export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  phone_number: string | null;
  is_referee: boolean;
  is_club_manager: boolean;
  is_admin: boolean;
  status: UserStatus;
  created_at: string | null;
  club: Club | null;
}

/** GET /api/admin/users?status= — status boşsa hepsi. */
export function useAdminUsers(status?: UserStatus | "") {
  return useQuery({
    queryKey: ["admin-users", status ?? ""],
    queryFn: async () => {
      const { data } = await api.get<{ items: AdminUser[] }>("/admin/users", {
        params: status ? { status } : undefined,
      });
      return data.items;
    },
  });
}

/** GET /api/clubs — kulüp seçimi için. */
export function useClubs() {
  return useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const { data } = await api.get<{ items: Club[] }>("/clubs");
      return data.items;
    },
  });
}

/** Onay gövdesi: opsiyonel kulüp yöneticisi ataması (var olan kulüp ya da yeni kulüp). */
export interface ApproveInput {
  is_club_manager?: boolean;
  club_id?: number;
  club_name?: string;
  club_code?: string;
}

function invalidateUsers(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-users"] });
  qc.invalidateQueries({ queryKey: ["clubs"] });
}

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; input: ApproveInput }) => {
      const { data } = await api.post<{ message: string; user: AdminUser }>(
        `/admin/users/${vars.id}/approve`,
        vars.input,
      );
      return data;
    },
    onSuccess: () => invalidateUsers(qc),
  });
}

export function useRejectUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/users/${id}/reject`);
    },
    onSuccess: () => invalidateUsers(qc),
  });
}

export function useAssignClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; club_id: number }) => {
      await api.post(`/admin/users/${vars.id}/assign-club`, {
        club_id: vars.club_id,
      });
    },
    onSuccess: () => invalidateUsers(qc),
  });
}
