import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useResetPassword } from "@/api/auth";
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

export default function SifreSifirla() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    try {
      await reset.mutateAsync({ token, password, password_confirm: confirm });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Şifre değiştirilemedi.");
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <span className="mb-2 grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="size-6" />
          </span>
          <CardTitle className="text-xl">Yeni Şifre Belirle</CardTitle>
          <CardDescription>Hesabınız için yeni bir şifre girin</CardDescription>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-4 text-center text-sm">
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-destructive">
                Bağlantı eksik veya hatalı. E-postadaki bağlantıyı tam olarak açın ya da yeni
                bir sıfırlama isteyin.
              </p>
              <Link to="/sifremi-unuttum" className="font-medium text-primary hover:underline">
                Yeni bağlantı iste
              </Link>
            </div>
          ) : done ? (
            <div className="space-y-4 text-center text-sm">
              <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-3">
                Şifreniz değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.
              </p>
              <Link to="/giris" className="font-medium text-primary hover:underline">
                Giriş yap
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}{" "}
                  {reset.error instanceof ApiError && reset.error.code === "invalid_token" && (
                    <Link to="/sifremi-unuttum" className="font-medium underline">
                      Yeni bağlantı iste
                    </Link>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Yeni şifre</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 8 karakter"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Yeni şifre (tekrar)</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={reset.isPending}>
                {reset.isPending ? "Kaydediliyor…" : "Şifreyi Değiştir"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
