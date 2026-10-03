import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertCircle, Save, Loader2, FolderOpen } from "lucide-react";
import {
  useEvent,
  useCreateEvent,
  useUpdateEvent,
  type EventInput,
} from "@/api/events";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormState {
  name: string;
  location: string;
  type: string;
  start_date: string;
  end_date: string;
  description: string;
  is_registration_open: boolean;
  registration_start_at: string;
  registration_end_at: string;
  season_start_year: string;
  season_end_year: string;
}

const EMPTY: FormState = {
  name: "",
  location: "",
  type: "",
  start_date: "",
  end_date: "",
  description: "",
  is_registration_open: true,
  registration_start_at: "",
  registration_end_at: "",
  season_start_year: "",
  season_end_year: "",
};

/** "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM" (datetime-local input). */
function toLocalInput(v: string | null | undefined): string {
  if (!v) return "";
  return v.replace(" ", "T").slice(0, 16);
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function EventForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

  const { data: event, isLoading: loadingEvent, isError } = useEvent(
    isEdit ? id : undefined,
  );
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent(id ?? "");

  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!isEdit);

  // Edit modunda etkinlik gelince formu doldur (tek sefer)
  useEffect(() => {
    if (!isEdit || !event || loaded) return;
    setForm({
      name: event.name ?? "",
      location: event.location ?? "",
      type: event.type ?? "",
      start_date: (event.start_date ?? "").slice(0, 10),
      end_date: (event.end_date ?? "").slice(0, 10),
      description: event.description ?? "",
      is_registration_open: !!event.is_registration_open,
      registration_start_at: toLocalInput(event.registration_start_at),
      registration_end_at: toLocalInput(event.registration_end_at),
      season_start_year: event.season_start_year?.toString() ?? "",
      season_end_year: event.season_end_year?.toString() ?? "",
    });
    setLoaded(true);
  }, [isEdit, event, loaded]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Yarış adı zorunlu.";
    if (!form.location.trim()) return "Yer zorunlu.";
    if (!form.start_date) return "Başlangıç tarihi zorunlu.";
    if (!form.end_date) return "Bitiş tarihi zorunlu.";
    if (form.end_date < form.start_date)
      return "Bitiş tarihi başlangıçtan önce olamaz.";
    if (
      form.registration_start_at &&
      form.registration_end_at &&
      form.registration_start_at > form.registration_end_at
    )
      return "Kayıt başlangıcı, kayıt bitişinden sonra olamaz.";
    return null;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);

    const payload: EventInput = {
      name: form.name.trim(),
      location: form.location.trim(),
      type: form.type.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date,
      description: form.description.trim() || null,
      is_registration_open: form.is_registration_open ? 1 : 0,
      registration_start_at: form.registration_start_at || null,
      registration_end_at: form.registration_end_at || null,
    };

    try {
      if (isEdit) {
        await updateEvent.mutateAsync({
          ...payload,
          season_start_year: form.season_start_year
            ? Number(form.season_start_year)
            : null,
          season_end_year: form.season_end_year
            ? Number(form.season_end_year)
            : null,
        });
        navigate("/app/etkinlikler");
      } else {
        const res = await createEvent.mutateAsync(payload);
        // Yeni yarış: dosya yükleyebilmek için düzenleme ekranına geç
        navigate(`/app/etkinlikler/${res.id}`, { replace: true });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Kaydedilemedi.");
    }
  }

  const saving = createEvent.isPending || updateEvent.isPending;

  if (isEdit && loadingEvent && !loaded) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-muted-foreground">
        Yükleniyor…
      </div>
    );
  }
  if (isEdit && isError) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Etkinlik bulunamadı.
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackLink />
      <PageHeader
        title={isEdit ? form.name || "Yarışı Düzenle" : "Yeni Yarış"}
        description={
          isEdit
            ? "Yarış bilgilerini güncelle ve dosyaları yönet."
            : "Yeni bir yarış oluştur. Kaydettikten sonra bülten/çıkış dosyalarını ekleyebilirsin."
        }
      />

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Yarış Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Yarış Adı" htmlFor="name" required>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="ORDU LİGİ 1. KADEME"
                />
              </Field>
            </div>

            <Field label="Yer" htmlFor="location" required>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Altınordu/ORDU"
              />
            </Field>

            <Field label="Tür" htmlFor="type" hint="Örn. Sprint, Orta Mesafe">
              <Input
                id="type"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                placeholder="Sprint"
              />
            </Field>

            <Field label="Başlangıç Tarihi" htmlFor="start_date" required>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
            </Field>

            <Field label="Bitiş Tarihi" htmlFor="end_date" required>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Açıklama" htmlFor="description">
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  placeholder="Yarışa dair notlar (isteğe bağlı)…"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kayıt Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_registration_open}
                onChange={(e) => set("is_registration_open", e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              <span className="text-sm font-medium">Kayıtlar açık</span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Kayıt Başlangıcı"
                htmlFor="reg_start"
                hint="Boş bırakılırsa alt sınır yok."
              >
                <Input
                  id="reg_start"
                  type="datetime-local"
                  value={form.registration_start_at}
                  onChange={(e) => set("registration_start_at", e.target.value)}
                />
              </Field>
              <Field
                label="Kayıt Bitişi"
                htmlFor="reg_end"
                hint="Boş bırakılırsa üst sınır yok."
              >
                <Input
                  id="reg_end"
                  type="datetime-local"
                  value={form.registration_end_at}
                  onChange={(e) => set("registration_end_at", e.target.value)}
                />
              </Field>
            </div>

            {isEdit && (
              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                <Field
                  label="Sezon Başlangıç Yılı"
                  htmlFor="season_start"
                  hint="Boş bırakılırsa tarihe göre otomatik hesaplanır."
                >
                  <Input
                    id="season_start"
                    type="number"
                    value={form.season_start_year}
                    onChange={(e) => set("season_start_year", e.target.value)}
                    placeholder="2025"
                  />
                </Field>
                <Field label="Sezon Bitiş Yılı" htmlFor="season_end">
                  <Input
                    id="season_end"
                    type="number"
                    value={form.season_end_year}
                    onChange={(e) => set("season_end_year", e.target.value)}
                    placeholder="2026"
                  />
                </Field>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {isEdit ? "Değişiklikleri Kaydet" : "Oluştur"}
          </Button>
          <Link
            to="/app/etkinlikler"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            İptal
          </Link>
        </div>
      </form>

      {isEdit && event && (
        <div className="mt-8 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Dosyalar & Sonuçlar</p>
            <p className="text-sm text-muted-foreground">
              Bülten, çıkış listeleri, sonuç dosyaları ve SKB ayrı sayfadan
              yönetilir.
            </p>
          </div>
          <Link
            to={`/app/etkinlikler/${event.id}/dosyalar`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <FolderOpen /> Dosyaları Yönet
          </Link>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/app/etkinlikler"
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}
    >
      <ArrowLeft /> Etkinlikler
    </Link>
  );
}
