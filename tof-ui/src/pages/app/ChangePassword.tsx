import { useState, type FormEvent } from "react";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { useChangePassword } from "@/api/auth";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY = {
  current_password: "",
  new_password: "",
  new_password_confirm: "",
};

/** Backend invalid_credentials mesajını Türkçeleştir; diğerinde backend mesajı. */
function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "invalid_credentials") return "Mevcut şifre yanlış.";
    return err.message;
  }
  return "Şifre değiştirilemedi.";
}

export default function ChangePassword() {
  const change = useChangePassword();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (
      form.current_password === "" ||
      form.new_password === "" ||
      form.new_password_confirm === ""
    ) {
      setError("Tüm alanları doldurun.");
      return;
    }
    if (form.new_password.length < 8) {
      setError("Yeni şifre en az 8 karakter olmalıdır.");
      return;
    }
    if (form.new_password !== form.new_password_confirm) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (form.new_password === form.current_password) {
      setError("Yeni şifre mevcut şifreden farklı olmalıdır.");
      return;
    }

    try {
      await change.mutateAsync(form);
      setForm(EMPTY);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="Şifre Değiştir"
        description="Hesabınızın şifresini güncelleyin."
      />

      <Card>
        <CardContent className="pt-6">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="size-12 text-primary" />
              <p className="text-lg font-semibold">Şifreniz güncellendi</p>
              <p className="text-sm text-muted-foreground">
                Yeni şifrenizle giriş yapmaya devam edebilirsiniz.
              </p>
              <Button variant="outline" onClick={() => setDone(false)}>
                Tekrar değiştir
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="current_password">Mevcut Şifre</Label>
                <Input
                  id="current_password"
                  type="password"
                  autoComplete="current-password"
                  value={form.current_password}
                  onChange={(e) => set("current_password", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new_password">Yeni Şifre</Label>
                <Input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  value={form.new_password}
                  onChange={(e) => set("new_password", e.target.value)}
                  placeholder="En az 8 karakter"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new_password_confirm">Yeni Şifre (tekrar)</Label>
                <Input
                  id="new_password_confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.new_password_confirm}
                  onChange={(e) => set("new_password_confirm", e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={change.isPending}>
                <KeyRound />
                {change.isPending ? "Güncelleniyor…" : "Şifreyi Değiştir"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
