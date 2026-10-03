import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface RefereeType {
  id: number;
  code: string;
  name: string;
}

export interface RefereeItem {
  id: number;
  full_name: string;
  photo_url: string | null;
  license_no: string | null;
  referee_type: RefereeType | null;
}

export interface ClubItem {
  id: number;
  name: string;
  code: string;
  athlete_count: number;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
}

export function useReferees() {
  return useQuery({
    queryKey: ["kurumsal", "hakemler"],
    queryFn: async () => {
      const { data } = await api.get<{ items: RefereeItem[] }>("/kurumsal/hakemler");
      return data.items;
    },
  });
}

export function useClubs() {
  return useQuery({
    queryKey: ["kurumsal", "kulupler"],
    queryFn: async () => {
      const { data } = await api.get<{ items: ClubItem[] }>("/kurumsal/kulupler");
      return data.items;
    },
  });
}
