import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface MyClub {
  id: number;
  name: string;
  code: string;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
}

/** GET /api/me/club — kulüp yöneticisinin kendi kulübü (yoksa null). */
export function useMyClub() {
  return useQuery({
    queryKey: ["my-club"],
    queryFn: async () => {
      const { data } = await api.get<{ club: MyClub | null }>("/me/club");
      return data.club;
    },
  });
}

export interface ProfileInput {
  full_name?: string;
  phone_number?: string | null;
}

/** PUT /api/me/profile — ad/telefon. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      await api.put("/me/profile", input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export interface ClubInput {
  name?: string;
  description?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
}

function invalidateClub(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["my-club"] });
  qc.invalidateQueries({ queryKey: ["kurumsal", "kulupler"] }); // public liste
  qc.invalidateQueries({ queryKey: ["me"] }); // AuthContext club adı
}

/** PUT /api/me/club — kulüp adı + açıklama + iletişim (kod hariç). */
export function useUpdateMyClub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClubInput) => {
      const { data } = await api.put<{ club: MyClub }>("/me/club", input);
      return data.club;
    },
    onSuccess: () => invalidateClub(qc),
  });
}

export function useUploadClubLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("logo", file);
      const { data } = await api.post<{ logo_url: string }>(
        "/me/club/logo",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => invalidateClub(qc),
  });
}

export function useDeleteClubLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete("/me/club/logo");
    },
    onSuccess: () => invalidateClub(qc),
  });
}
