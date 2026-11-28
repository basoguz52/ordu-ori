import { useEffect } from "react";
import { useMatches } from "react-router-dom";

export const SITE_NAME = "Ordu Oryantiring";

export function formatTitle(title?: string | null): string {
  return title ? `${title} | ${SITE_NAME}` : SITE_NAME;
}

/** Route `handle.title` değerini taşıyan tip. */
export interface RouteHandle {
  title?: string;
}

/**
 * Sayfanın kendi verdiği başlık (ör. haber başlığı). React'te alt bileşenin effect'i
 * layout'unkinden önce çalıştığı için `PageTitle` bunu okuyup ezmemeye dikkat eder.
 */
let pageOverride: string | null = null;
export function currentPageOverride(): string | null {
  return pageOverride;
}

/**
 * Sayfanın kendi başlığını ayarlar (ör. haber başlığı, yarış adı). `title` boşken route
 * başlığı (`handle.title`) geçerli kalır. Sayfadan çıkınca route başlığına döner.
 */
export function usePageTitle(title?: string | null) {
  const routeTitle = useRouteTitle();
  useEffect(() => {
    if (!title) return;
    pageOverride = title;
    document.title = formatTitle(title);
    return () => {
      pageOverride = null;
      document.title = formatTitle(routeTitle);
    };
  }, [title, routeTitle]);
}

/** Eşleşen en derin route'un `handle.title` değeri. */
export function useRouteTitle(): string | undefined {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const t = (matches[i].handle as RouteHandle | undefined)?.title;
    if (t) return t;
  }
  return undefined;
}
