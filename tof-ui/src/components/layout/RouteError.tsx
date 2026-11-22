import { Link, useRouteError } from "react-router-dom";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Route hatası ekranı (React Router'ın İngilizce varsayılan ekranı yerine).
 * En sık neden: site yeni sürüme güncellenmişken açık kalan sekmenin eski sayfa dosyasını istemesi.
 */
export function RouteError() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);

  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Sayfa yüklenemedi</h1>
        <p className="text-muted-foreground">
          Site yeni sürüme güncellenmiş ya da bağlantınız kesilmiş olabilir. Sayfayı yenileyip
          tekrar deneyin.
        </p>
        <div className="flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Sayfayı yenile</Button>
          <Link to="/" reloadDocument className={buttonVariants({ variant: "outline" })}>
            Anasayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
