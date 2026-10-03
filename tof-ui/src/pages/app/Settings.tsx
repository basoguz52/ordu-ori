import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Check, Loader2, Save, ShieldAlert } from "lucide-react";
import {
  useFtpSettings,
  useUpdateFtpSettings,
  type FtpSettings,
} from "@/api/settings";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const EMPTY: FtpSettings = {
  host: "",
  port: "21",
  user: "",
  pass: "",
  base_dir: "uploads/events",
  passive: "1",
  note: "",
};

export default function Settings() {
  const { data, isLoading, isError } = useFtpSettings();
  const update = useUpdateFtpSettings();

  const [form, setForm] = useState<FtpSettings>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      setForm(data);
      setLoaded(true);
    }
  }, [data, loaded]);

  function set<K extends keyof FtpSettings>(key: K, value: FtpSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync(form);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ayarlar kaydedilemedi.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Ayarlar"
        description="Sonuç yükleme (FTP) bilgileri. Bu değerler yarış sayfalarındaki FTP kartında gösterilir."
      />

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : isError ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>Ayarlar yüklenemedi.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Sonuç Yükleme — FTP Bilgileri</CardTitle>
              <p className="text-sm text-muted-foreground">
                OE2010 zaman tutma yazılımının sonuç dosyalarını FTP ile yüklemesi
                için gereken bağlantı bilgileri.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <span>
                  Güvenlik: Mümkünse yalnızca <code>uploads</code> klasörüne
                  yetkili, ayrı bir FTP hesabı kullanın. Şifre, yarış sayfasındaki
                  karta kopyalanabilmesi için panele açık gelir.
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="host">FTP Sunucu</Label>
                  <Input
                    id="host"
                    value={form.host}
                    onChange={(e) => set("host", e.target.value)}
                    placeholder="ftp.orduoryantiring.com.tr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    value={form.port}
                    onChange={(e) => set("port", e.target.value)}
                    placeholder="21"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="passive">Pasif Mod</Label>
                  <NativeSelect
                    id="passive"
                    value={form.passive}
                    onChange={(e) => set("passive", e.target.value)}
                  >
                    <option value="1">Açık (önerilen)</option>
                    <option value="0">Kapalı</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user">Kullanıcı Adı</Label>
                  <Input
                    id="user"
                    value={form.user}
                    onChange={(e) => set("user", e.target.value)}
                    autoComplete="off"
                    placeholder="sonuc@orduoryantiring.com.tr"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pass">Şifre</Label>
                  <Input
                    id="pass"
                    type="text"
                    value={form.pass}
                    onChange={(e) => set("pass", e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="base_dir">Temel Dizin</Label>
                  <Input
                    id="base_dir"
                    value={form.base_dir}
                    onChange={(e) => set("base_dir", e.target.value)}
                    placeholder="uploads/events"
                  />
                  <p className="text-xs text-muted-foreground">
                    FTP hesabının gördüğü, yarış klasörlerini içeren dizin. Yarışa
                    özel hedef bunun altına eklenir:{" "}
                    <code>{(form.base_dir || "uploads/events").replace(/\/+$/, "")}/00006/results/</code>
                  </p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="note">Ek Not (opsiyonel)</Label>
                  <Textarea
                    id="note"
                    value={form.note}
                    onChange={(e) => set("note", e.target.value)}
                    rows={2}
                    placeholder="Kart altında gösterilecek ek açıklama."
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : saved ? (
                    <Check />
                  ) : (
                    <Save />
                  )}
                  {saved ? "Kaydedildi" : "Kaydet"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
