import { useState, type FormEvent } from "react";
import { Upload, Building2, CheckCircle2, Trash2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  useMyClub,
  useUpdateProfile,
  useUpdateMyClub,
  useUploadClubLogo,
  useDeleteClubLogo,
  type MyClub,
} from "@/api/profile";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function SavedTag() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="size-4" /> Kaydedildi
    </span>
  );
}

/* ---------------------------- Kişisel ---------------------------- */

function PersonalCard() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone_number ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (fullName.trim() === "") {
      setError("Ad soyad zorunludur.");
      return;
    }
    try {
      await update.mutateAsync({
        full_name: fullName.trim(),
        phone_number: phone.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kişisel Bilgiler</CardTitle>
      </CardHeader>
      <CardContent>
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
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setSaved(false);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSaved(false);
                }}
                placeholder="05xx xxx xx xx"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>E-posta</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
            {saved && <SavedTag />}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Kulüp ------------------------------ */

function ClubCard({ club }: { club: MyClub }) {
  const update = useUpdateMyClub();
  const uploadLogo = useUploadClubLogo();
  const deleteLogo = useDeleteClubLogo();

  const [form, setForm] = useState({
    name: club.name ?? "",
    description: club.description ?? "",
    contact_email: club.contact_email ?? "",
    contact_phone: club.contact_phone ?? "",
    website: club.website ?? "",
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
    if (form.name.trim() === "") {
      setError("Kulüp adı zorunludur.");
      return;
    }
    try {
      await update.mutateAsync({
        name: form.name.trim(),
        description: form.description.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        website: form.website.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kulüp Bilgileri</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            {club.logo_url ? (
              <img
                src={club.logo_url}
                alt="Kulüp logosu"
                className="size-32 rounded-xl border object-contain bg-background p-1"
              />
            ) : (
              <div className="grid size-32 place-items-center rounded-xl border border-dashed text-muted-foreground">
                <ImageIcon className="size-9" />
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <label
                className={cn(
                  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent",
                  uploadLogo.isPending && "pointer-events-none opacity-50",
                )}
              >
                <Upload className="size-4" />
                {uploadLogo.isPending ? "Yükleniyor…" : "Logo Yükle"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLogo.mutate(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {club.logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteLogo.mutate()}
                  disabled={deleteLogo.isPending}
                >
                  <Trash2 /> Kaldır
                </Button>
              )}
            </div>
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
                <Label htmlFor="club_name">Kulüp Adı</Label>
                <Input
                  id="club_name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="club_code">Kulüp Kodu</Label>
                <Input id="club_code" value={club.code} disabled />
                <p className="text-xs text-muted-foreground">
                  Kod yönetici tarafından belirlenir, değiştirilemez.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Kulübünüzü kısaca tanıtın (Kulüplerimiz sayfasında görünür)."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact_email">E-posta</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set("contact_email", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">Telefon</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => set("contact_phone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">Web Sitesi</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Kaydediliyor…" : "Kaydet"}
              </Button>
              {saved && <SavedTag />}
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ Sayfa ------------------------------ */

export default function ClubProfilePage() {
  const { isAdmin } = useAuth();
  const { data: club, isLoading, isError } = useMyClub();

  return (
    <div>
      <PageHeader
        title="Profilim"
        description="Kişisel bilgilerinizi ve kulübünüzün tanıtımını yönetin."
      />

      <div className="space-y-8">
        <PersonalCard />

        {isLoading ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : isError ? (
          <EmptyState title="Kulüp bilgisi yüklenemedi" />
        ) : !club ? (
          <EmptyState
            title="Kulüp atanmamış"
            description={
              isAdmin
                ? "Admin hesabı bir kulübe yönetici değildir."
                : "Hesabınıza henüz bir kulüp atanmamış."
            }
            icon={Building2}
          />
        ) : (
          <ClubCard club={club} />
        )}
      </div>
    </div>
  );
}
