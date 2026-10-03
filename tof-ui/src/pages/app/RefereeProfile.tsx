import { useEffect, useState, type FormEvent } from "react";
import {
  Upload,
  User as UserIcon,
  Check,
  CheckCircle2,
  CalendarClock,
  History,
} from "lucide-react";
import {
  useRefereeTypes,
  useRefereeProfile,
  useUpdateRefereeProfile,
  useUploadRefereePhoto,
  useRefereeEvents,
  useSetEventPreference,
  type RefereeProfile as RefereeProfileData,
  type RefereeEvent,
} from "@/api/referee";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDateRangeTR } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ----------------------------- Profil ----------------------------- */

function ProfileForm({ profile }: { profile: RefereeProfileData }) {
  const { data: types } = useRefereeTypes();
  const update = useUpdateRefereeProfile();
  const uploadPhoto = useUploadRefereePhoto();

  const [form, setForm] = useState({
    full_name: profile.user.full_name ?? "",
    phone_number: profile.user.phone_number ?? "",
    license_no: profile.license_no ?? "",
    registry_no: profile.registry_no ?? "",
    bio: profile.bio ?? "",
    default_referee_type_id:
      profile.default_referee_type_id != null
        ? String(profile.default_referee_type_id)
        : "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (form.full_name.trim() === "") {
      setError("Ad soyad zorunludur.");
      return;
    }
    try {
      await update.mutateAsync({
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim() || null,
        license_no: form.license_no.trim() || null,
        registry_no: form.registry_no.trim() || null,
        bio: form.bio.trim() || null,
        default_referee_type_id: form.default_referee_type_id
          ? Number(form.default_referee_type_id)
          : null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil Bilgileri</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          {/* Foto */}
          <div className="flex flex-col items-center gap-3">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt="Profil fotoğrafı"
                className="size-32 rounded-full border object-cover"
              />
            ) : (
              <div className="grid size-32 place-items-center rounded-full border border-dashed text-muted-foreground">
                <UserIcon className="size-10" />
              </div>
            )}
            <label
              className={cn(
                "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent",
                uploadPhoto.isPending && "pointer-events-none opacity-50",
              )}
            >
              <Upload className="size-4" />
              {uploadPhoto.isPending ? "Yükleniyor…" : "Fotoğraf Değiştir"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPhoto.mutate(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {/* Alanlar */}
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Ad Soyad</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone_number">Telefon</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={form.phone_number}
                  onChange={(e) => set("phone_number", e.target.value)}
                  placeholder="05xx xxx xx xx"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>E-posta</Label>
              <Input value={profile.user.email} disabled />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="license_no">Lisans No</Label>
                <Input
                  id="license_no"
                  value={form.license_no}
                  onChange={(e) => set("license_no", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registry_no">Sicil No</Label>
                <Input
                  id="registry_no"
                  value={form.registry_no}
                  onChange={(e) => set("registry_no", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="default_referee_type_id">
                Varsayılan Hakem Görevi
              </Label>
              <NativeSelect
                id="default_referee_type_id"
                value={form.default_referee_type_id}
                onChange={(e) => set("default_referee_type_id", e.target.value)}
              >
                <option value="">Belirtilmedi</option>
                {types?.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Hakkımda</Label>
              <Textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="Kısa özgeçmiş, deneyim vb."
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Kaydediliyor…" : "Kaydet"}
              </Button>
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" /> Kaydedildi
                </span>
              )}
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------- Görev tercihi --------------------------- */

function EventPreferenceRow({ e }: { e: RefereeEvent }) {
  const setPref = useSetEventPreference();
  const [note, setNote] = useState(e.preference_note ?? "");
  const [editingNote, setEditingNote] = useState(false);

  // Prop değişince (invalidate sonrası) yerel notu senkronla
  useEffect(() => {
    setNote(e.preference_note ?? "");
  }, [e.preference_note]);

  const wants = e.wants_to_serve === true;

  async function toggle(next: boolean) {
    await setPref.mutateAsync({
      eventId: e.id,
      input: { wants_to_serve: next, note },
    });
  }

  async function saveNote() {
    await setPref.mutateAsync({
      eventId: e.id,
      input: { wants_to_serve: wants, note },
    });
    setEditingNote(false);
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{e.name}</h3>
            {e.assigned && (
              <Badge variant="success">
                <Check className="size-3" />
                Görevli{e.assigned_type ? ` · ${e.assigned_type.name}` : ""}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatDateRangeTR(e.start_date, e.end_date)}
            {e.location ? ` · ${e.location}` : ""}
          </p>
        </div>

        {!e.is_past && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={wants}
              disabled={setPref.isPending}
              onChange={(ev) => toggle(ev.target.checked)}
            />
            Görev almak istiyorum
          </label>
        )}
      </div>

      {/* Not (yalnızca gelecekteki yarışlar için) */}
      {!e.is_past && (
        <div className="mt-3 border-t pt-3">
          {editingNote ? (
            <div className="space-y-2">
              <Textarea
                rows={2}
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                placeholder="Uygunluk / tercih notu…"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveNote} disabled={setPref.isPending}>
                  {setPref.isPending ? "Kaydediliyor…" : "Notu Kaydet"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNote(e.preference_note ?? "");
                    setEditingNote(false);
                  }}
                >
                  Vazgeç
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {e.preference_note ? e.preference_note : "Not eklenmemiş."}
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingNote(true)}
              >
                {e.preference_note ? "Notu düzenle" : "Not ekle"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function EventsSection() {
  const { data, isLoading, isError } = useRefereeEvents();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (isError) return <EmptyState title="Yarışlar yüklenemedi" />;
  if (!data || data.length === 0)
    return <EmptyState title="Yarış bulunmuyor" icon={CalendarClock} />;

  const upcoming = data.filter((e) => !e.is_past);
  const past = data.filter((e) => e.is_past);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Yaklaşan Yarışlar</h2>
          <span className="text-sm text-muted-foreground">
            {upcoming.length}
          </span>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Yaklaşan yarış bulunmuyor.
          </p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((e) => (
              <EventPreferenceRow key={e.id} e={e} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <History className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Geçmiş Görevler</h2>
          </div>
          <div className="space-y-3">
            {past.map((e) => (
              <EventPreferenceRow key={e.id} e={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ------------------------------ Sayfa ------------------------------ */

export default function RefereeProfilePage() {
  const { data: profile, isLoading, isError } = useRefereeProfile();

  return (
    <div>
      <PageHeader
        title="Hakem Profilim"
        description="Profil bilgilerinizi güncelleyin ve yarışlarda görev tercihinizi belirtin."
      />

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : isError || !profile ? (
        <EmptyState
          title="Profil yüklenemedi"
          description="Bu sayfa yalnızca hakem hesapları içindir."
        />
      ) : (
        <div className="space-y-8">
          <ProfileForm profile={profile} />
          <EventsSection />
        </div>
      )}
    </div>
  );
}
