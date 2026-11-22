import { lazy, type ComponentType } from "react";

const FLAG = "chunk-reload-at";

/**
 * React.lazy + deploy güvenliği: yeni sürüm yüklendikten sonra açık kalan sekme eski (artık
 * sunucuda olmayan) hash'li chunk'ı isterse import hata verir. Bu durumda sayfayı bir kez
 * yenileyip yeni index.html'i alırız. Sonsuz döngüye girmemek için 30 sn içinde ikinci kez
 * yenilemez, hatayı fırlatır.
 */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(FLAG);
      return mod;
    } catch (err) {
      const last = Number(sessionStorage.getItem(FLAG) ?? 0);
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(FLAG, String(Date.now()));
        window.location.reload();
        return new Promise<{ default: T }>(() => {}); // yenilenene kadar bekle
      }
      throw err;
    }
  });
}
