import type { Category } from "@/api/athletes";

/**
 * Bir kategori, seçili cinsiyet + doğum yılına uygun mu?
 * Kademeli: her kısıt yalnızca gereken değer varken uygulanır.
 * - Cinsiyet: gender seçili ve cat.gender doluysa ve farklıysa → uygun değil.
 * - Yaş: birthYear verilmişse ve cat aralığının dışındaysa → uygun değil (aralık dahil).
 */
export function categoryFits(
  cat: Category,
  gender: "" | "M" | "F",
  birthYear: number | null,
): boolean {
  if (gender && cat.gender && cat.gender !== gender) return false;
  if (birthYear != null) {
    if (cat.min_birth_year != null && birthYear < cat.min_birth_year) return false;
    if (cat.max_birth_year != null && birthYear > cat.max_birth_year) return false;
  }
  return true;
}

/** Uygun kategorileri döndürür. */
export function fittingCategories(
  cats: Category[] | undefined,
  gender: "" | "M" | "F",
  birthYear: number | null,
): Category[] {
  return (cats ?? []).filter((c) => categoryFits(c, gender, birthYear));
}
