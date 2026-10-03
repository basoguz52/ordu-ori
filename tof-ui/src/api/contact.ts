import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  /** honeypot — bot doldurursa backend sessizce yok sayar */
  website: string;
}

export function useContact() {
  return useMutation({
    mutationFn: async (payload: ContactPayload) => {
      const { data } = await api.post<{ ok: boolean }>("/contact", payload);
      return data;
    },
  });
}
