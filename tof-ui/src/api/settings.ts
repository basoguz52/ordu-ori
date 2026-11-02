import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

/** Sonuç yükleme FTP bilgileri (admin ayarı). */
export interface FtpSettings {
  host: string;
  port: string;
  user: string;
  pass: string;
  base_dir: string;
  passive: string; // "1" | "0"
  note: string;
  /** Puan CSV'si için ayrı FTP hesabı (gizli gelen kutusu). */
  csv_user: string;
  csv_pass: string;
  /** Sunucu yazar (salt okunur): gelen kutusunun mutlak yolu = CSV FTP hesabının ana klasörü. */
  csv_inbox_dir?: string;
}

export function useFtpSettings() {
  return useQuery({
    queryKey: ["ftp-settings"],
    queryFn: async () => {
      const { data } = await api.get<{ item: FtpSettings }>("/admin/settings/ftp");
      return data.item;
    },
  });
}

export function useUpdateFtpSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FtpSettings>) => {
      const { data } = await api.put<{ item: FtpSettings }>(
        "/admin/settings/ftp",
        input,
      );
      return data.item;
    },
    onSuccess: (item) => qc.setQueryData(["ftp-settings"], item),
  });
}

/** Yarışa özel hedef dizin: <base_dir>/<folder_key>/results/ */
export function eventRemoteDir(baseDir: string, folderKey: string): string {
  const base = baseDir.replace(/\/+$/, "");
  return `${base}/${folderKey}/results/`;
}
