import { Download, ExternalLink, FileText } from "lucide-react";
import { EventsCalendar } from "@/components/EventsCalendar";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sezon faaliyet takvimi PDF'i. Aynı origin'den servis edilir:
 * dev/build icin tof-ui/public/docs/faaliyet-takvimi.pdf,
 * prod'da public_html/docs/faaliyet-takvimi.pdf.
 */
const PDF_URL = "/docs/faaliyet-takvimi.pdf";

export default function FaaliyetTakvimi() {
  return (
    <div>
      <PageHeader
        title="Faaliyet Takvimi"
        description="Sezon boyunca düzenlenen yarışmalar ve resmi faaliyet takvimi."
      />

      <EventsCalendar heading={false} hideWhenEmpty={false} showGridOnMobile />

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <FileText className="size-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">
            Sezon Faaliyet Takvimi (PDF)
          </h2>
          <div className="ml-auto flex flex-wrap gap-2">
            <a
              href={PDF_URL}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ExternalLink /> Yeni sekmede aç
            </a>
            <a
              href={PDF_URL}
              download
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Download /> İndir
            </a>
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <iframe
            title="Faaliyet Takvimi PDF"
            src={PDF_URL + "#view=FitH"}
            className="h-[80vh] w-full border-0 bg-white"
          />
        </Card>

        <p className="mt-2 text-sm text-muted-foreground">
          Not: Bazı mobil tarayıcılar PDF'i sayfa içinde açmaz. Bu durumda
          yukarıdaki "Yeni sekmede aç" bağlantısını kullanın.
        </p>
      </section>
    </div>
  );
}
