import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { UserPlus, CheckCircle2, AlertCircle } from "lucide-react";
import { useRegister } from "@/api/auth";
import { ApiError } from "@/lib/apiClient";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Backend hata kodlarını Türkçe mesaja çevir; bilinmeyende backend mesajına düş. */
function registerErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "email_taken":
        return "Bu e-posta adresi zaten kayıtlı.";
      case "validation_error":
        return "Girdiğiniz bilgileri kontrol edip tekrar deneyin.";
      default:
        return err.message;
    }
  }
  return "Kayıt oluşturulamadı.";
}

export default function Kayit() {
  const register = useRegister();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    password_confirm: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** İstemci tarafı doğrulama; backend kuralıyla birebir. */
  function clientError(): string | null {
    if (form.full_name.trim() === "") return "Ad soyad zorunludur.";
    if (form.email.trim() === "") return "E-posta zorunludur.";
    if (form.password.length < 8)
      return "Şifre en az 8 karakter olmalıdır.";
    if (form.password !== form.password_confirm)
      return "Şifreler eşleşmiyor.";
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const ce = clientError();
    if (ce) {
      setError(ce);
      return;
    }
    try {
      await register.mutateAsync({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone_number: form.phone_number.trim() || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(registerErrorMessage(err));
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center py-8">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <span className="mb-2 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <UserPlus className="size-6" />
          </span>
          <CardTitle className="text-xl">Kulüp Yöneticisi Kaydı</CardTitle>
          <CardDescription>
            Kulübünüz adına sporcu kaydı yapabilmek için hesap oluşturun.
            Başvurunuz yönetici onayından sonra aktifleşir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="size-12 text-primary" />
              <p className="text-lg font-semibold">Başvurunuz alındı</p>
              <p className="text-sm text-muted-foreground">
                Hesabınız yönetici onayı bekliyor. Onaylandığında e-posta ve
                şifrenizle giriş yapabilirsiniz.
              </p>
              <Link
                to="/giris"
                className={cn(buttonVariants({ variant: "outline" }), "mt-2")}
              >
                Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="full_name">Ad Soyad</Label>
                <Input
                  id="full_name"
                  autoComplete="name"
                  required
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="ornek@eposta.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Telefon (opsiyonel)</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone_number}
                  onChange={(e) => update("phone_number", e.target.value)}
                  placeholder="05xx xxx xx xx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="En az 8 karakter"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirm">Şifre (tekrar)</Label>
                <Input
                  id="password_confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password_confirm}
                  onChange={(e) => update("password_confirm", e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={register.isPending}
              >
                {register.isPending ? "Gönderiliyor…" : "Kayıt Ol"}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{" "}
            <Link to="/giris" className="font-medium text-primary hover:underline">
              Giriş yapın
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
