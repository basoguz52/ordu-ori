import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface RegistrationRow {
  id: number;
  event_id: number;
  athlete_id: number;
  category_id: number | null;
  registered_at: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  license_no: string | null;
  si_chip_no: string | null;
  birth_year: number | null;
  gender: string | null;
  category_code: string | null;
  category_name: string | null;
  club_name: string | null;
  club_code: string | null;
}

export function useEventRegistrations(eventId: number | string | undefined) {
  return useQuery({
    queryKey: ["event-registrations", String(eventId)],
    enabled: eventId !== undefined && eventId !== "" && !Number.isNaN(Number(eventId)),
    queryFn: async () => {
      const { data } = await api.get<{ items: RegistrationRow[] }>(
        `/events/${eventId}/registrations`,
      );
      return data.items;
    },
  });
}

/** Giriş yapan kullanıcının bu etkinlikteki kendi kayıtları. */
export function useMyRegistrations(eventId: number | string | undefined) {
  return useQuery({
    queryKey: ["my-registrations", String(eventId)],
    enabled: eventId !== undefined && eventId !== "" && !Number.isNaN(Number(eventId)),
    queryFn: async () => {
      const { data } = await api.get<{ items: RegistrationRow[] }>(
        `/events/${eventId}/my-registrations`,
      );
      return data.items;
    },
  });
}

export function useCreateRegistration(eventId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { athlete_id: number; category_id: number }) => {
      const { data } = await api.post("/registrations", {
        event_id: Number(eventId),
        ...vars,
      });
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["my-registrations", String(eventId)] }),
  });
}

export function useDeleteRegistration(eventId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (registrationId: number) => {
      await api.delete(`/registrations/${registrationId}`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["my-registrations", String(eventId)] }),
  });
}

// --- Admin (panel): etkinliğin tüm kayıtları üzerinde işlemler ------------

export type RegStatusValue = "pending" | "approved" | "cancelled";

export const REG_STATUS_LABELS: Record<
  RegStatusValue,
  { label: string; variant: "success" | "warning" | "muted" }
> = {
  approved: { label: "Onaylı", variant: "success" },
  pending: { label: "Beklemede", variant: "warning" },
  cancelled: { label: "İptal", variant: "muted" },
};

export function useUpdateRegistrationStatus(eventId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: number; status: RegStatusValue }) => {
      await api.put(`/registrations/${vars.id}`, { status: vars.status });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["event-registrations", String(eventId)] }),
  });
}

export function useDeleteEventRegistration(eventId: number | string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (registrationId: number) => {
      await api.delete(`/registrations/${registrationId}`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["event-registrations", String(eventId)] }),
  });
}
