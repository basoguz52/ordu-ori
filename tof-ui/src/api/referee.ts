import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface RefereeType {
  id: number;
  code: string;
  name: string;
}

export interface RefereeProfile {
  user: {
    id: number;
    full_name: string;
    phone_number: string | null;
    email: string;
  };
  license_no: string | null;
  registry_no: string | null;
  bio: string | null;
  photo_url: string | null;
  default_referee_type_id: number | null;
  default_referee_type: RefereeType | null;
}

export interface RefereeEvent {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  is_past: boolean;
  wants_to_serve: boolean | null;
  preference_note: string | null;
  assigned: boolean;
  assigned_type: RefereeType | null;
}

/** GET /api/referee-types */
export function useRefereeTypes() {
  return useQuery({
    queryKey: ["referee-types"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<{ items: RefereeType[] }>("/referee-types");
      return data.items;
    },
  });
}

/** GET /api/me/referee-profile */
export function useRefereeProfile() {
  return useQuery({
    queryKey: ["referee-profile"],
    queryFn: async () => {
      const { data } = await api.get<RefereeProfile>("/me/referee-profile");
      return data;
    },
  });
}

export interface RefereeProfileInput {
  full_name?: string;
  phone_number?: string | null;
  license_no?: string | null;
  registry_no?: string | null;
  bio?: string | null;
  default_referee_type_id?: number | null;
}

/** PUT /api/me/referee-profile */
export function useUpdateRefereeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RefereeProfileInput) => {
      const { data } = await api.put<RefereeProfile>(
        "/me/referee-profile",
        input,
      );
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["referee-profile"], data);
      qc.invalidateQueries({ queryKey: ["me"] }); // full_name/phone AuthContext'e yansısın
    },
  });
}

/** POST /api/me/referee-profile/photo (form-data: photo) */
export function useUploadRefereePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("photo", file);
      const { data } = await api.post<{ photo_url: string }>(
        "/me/referee-profile/photo",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referee-profile"] }),
  });
}

/** GET /api/me/referee/events */
export function useRefereeEvents() {
  return useQuery({
    queryKey: ["referee-events"],
    queryFn: async () => {
      const { data } = await api.get<{ items: RefereeEvent[] }>(
        "/me/referee/events",
      );
      return data.items;
    },
  });
}

export interface PreferenceInput {
  wants_to_serve: boolean;
  note?: string | null;
  preferred_referee_type_id?: number | null;
}

/** PUT /api/me/referee/events/{id}/preference */
export function useSetEventPreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { eventId: number; input: PreferenceInput }) => {
      const { data } = await api.put(
        `/me/referee/events/${vars.eventId}/preference`,
        vars.input,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["referee-events"] }),
  });
}
