import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export type ResultType = "official" | "splits" | "overall";

/** results.php probe yanıtı: hangi sonuç dosyaları mevcut. */
export interface ResultProbe {
  key: string;
  official: boolean;
  splits: boolean;
  overall: boolean;
}

/**
 * Legacy canlı sonuçlar: OE2010'un ürettiği HTML doğrudan servis edilir.
 * Dosya FTP ile public_html/uploads/yaris/canli_sonuclar.html altına bırakılır.
 */
export const LIVE_RESULTS_URL = "/api/results.php?source=live";

/** results.php ayrı bir dosya (router dışı) → /api/results.php?key=..&type=.. */
export function resultFileUrl(key: string, type: ResultType): string {
  const qs = new URLSearchParams({ key, type });
  return `/api/results.php?${qs.toString()}`;
}

const EMPTY_PROBE = (key: string): ResultProbe => ({
  key,
  official: false,
  splits: false,
  overall: false,
});

/**
 * Verilen folder_key'ler için sonuç dosyası mevcudiyetini paralel probe eder.
 * Tek bir query → tek loading state. Dosya yoksa (local'de beklenen) sessizce
 * "yok" döner; sayfa yine de yarışları listeler.
 */
export function useResultProbes(keys: string[]) {
  const uniqueKeys = [...new Set(keys)].sort();
  return useQuery({
    queryKey: ["result-probes", uniqueKeys],
    enabled: uniqueKeys.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const entries = await Promise.all(
        uniqueKeys.map(async (key) => {
          try {
            const { data } = await api.get<ResultProbe>("/results.php", {
              params: { key, probe: 1 },
            });
            return [key, data] as const;
          } catch {
            return [key, EMPTY_PROBE(key)] as const;
          }
        }),
      );
      return Object.fromEntries(entries) as Record<string, ResultProbe>;
    },
  });
}
