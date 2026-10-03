import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div className="space-y-4">
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="text-xl font-semibold">Sayfa bulunamadı</h1>
        <p className="text-muted-foreground">
          Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
        </p>
        <Link to="/" className={buttonVariants({})}>
          Anasayfaya dön
        </Link>
      </div>
    </div>
  );
}
