import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useForgotPassword } from "@/api/auth";
import { ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SifremiUnuttum() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await forgot.mutateAsync(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İstek gönderilemedi.");
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <span className="mb-2 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="size-6" />
          </span>
          <CardTitle className="text-xl">Şifremi Unuttum</CardTitle>
          <CardDescription>
            Hesabınızın e-posta adresini girin, şifre sıfırlama bağlantısı gönderelim
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center text-sm">
              <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-3">
                Bu e-posta adresiyle kayıtlı aktif bir hesap varsa, şifre sıfırlama bağlantısı
                gönderildi. Bağlantı <strong>1 saat</strong> geçerlidir. Gelen kutunuzu ve
                gereksiz (spam) klasörünü kontrol edin.
              </p>
              <Link to="/giris" className="font-medium text-primary hover:underline">
                Giriş sayfasına dön
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@eposta.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={forgot.isPending}>
                {forgot.isPending ? "Gönderiliyor…" : "Bağlantı Gönder"}
              </Button>
              <p className="text-center text-sm">
                <Link to="/giris" className="text-muted-foreground hover:underline">
                  Giriş sayfasına dön
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
