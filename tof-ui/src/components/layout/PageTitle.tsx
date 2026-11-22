import { useEffect } from "react";
import { currentPageOverride, formatTitle, useRouteTitle } from "@/lib/usePageTitle";

/** Route'un `handle.title` değerini sekme başlığına yazar. Layout'lara bir kez konur. */
export function PageTitle() {
  const title = useRouteTitle();
  useEffect(() => {
    document.title = formatTitle(currentPageOverride() ?? title);
  }, [title]);
  return null;
}
