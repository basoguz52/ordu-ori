import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface MyAthlete {
  id: number;
  user_id: number;
  club_id: number | null;
  category_id: number | null;
  first_name: string;
  last_name: string;
  gender: string;
  birth_year: number | null;
  national_id: string | null;
  license_no: string | null;
  si_chip_no: string | null;
  club_name: string | null;
  club_code: string | null;
  category_name: string | null;
  category_code: string | null;
}

export function useMyAthletes() {
  return useQuery({
    queryKey: ["my-athletes"],
    queryFn: async () => {
      const { data } = await api.get<{ items: MyAthlete[] }>("/me/athletes");
      return data.items;
    },
  });
}
