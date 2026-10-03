import { useState, type FormEvent } from "react";
import { Mail, MapPin, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useContact } from "@/api/contact";
import { ApiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const CONTACT_EMAIL = "oryantiringordu@gmail.com";

export default function Iletisim() {
  const contact = useContact();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    website: "", // honeypot
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await contact.mutateAsync(form);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mesaj gönderilemedi.");
    }
  }

  return (
    <div>
      <PageHeader
        title="İletişim"
        description="Soru, öneri ve talepleriniz için bize yazın."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Bize Yazın</CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="size-12 text-primary" />
                <p className="text-lg font-semibold">Mesajınız gönderildi</p>
                <p className="text-sm text-muted-foreground">
                  En kısa sürede size dönüş yapacağız.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSent(false);
                    setForm({
                      name: "",
                      email: "",
                      phone: "",
                      subject: "",
                      message: "",
                      website: "",
                    });
                  }}
                >
                  Yeni mesaj
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Soyad</Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon (opsiyonel)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="05xx xxx xx xx"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Konu</Label>
                  <Input
                    id="subject"
                    required
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Mesaj</Label>
                  <Textarea
                    id="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                  />
                </div>

                {/* Honeypot — gizli */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                  className="hidden"
                />

                <Button type="submit" disabled={contact.isPending}>
                  <Send /> {contact.isPending ? "Gönderiliyor…" : "Gönder"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* İletişim bilgileri + harita */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">E-posta</p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-sm text-muted-foreground hover:text-primary hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">Adres</p>
                  <p className="text-sm text-muted-foreground">
                    Ordu İl Temsilciliği · Altınordu / ORDU
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <iframe
              title="Ordu harita"
              src="https://www.google.com/maps?q=Ordu%2C%20T%C3%BCrkiye&output=embed"
              className="h-64 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
