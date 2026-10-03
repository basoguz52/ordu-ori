/** Ortak form doğrulama yardımcıları. */

/**
 * TC Kimlik No doğrulama (resmi kurallar).
 * - 11 hane, tamamı rakam, ilk hane 0 olamaz.
 * - 10. hane = ((1,3,5,7,9. toplam × 7) − (2,4,6,8. toplam)) mod 10
 * - 11. hane = (ilk 10 hanenin toplamı) mod 10
 */
export function isValidTcNo(value: string): boolean {
  if (!/^[1-9][0-9]{10}$/.test(value)) return false;
  const d = value.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = ((((odd * 7 - even) % 10) + 10) % 10);
  if (d10 !== d[9]) return false;
  const d11 = (d.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;
  return d11 === d[10];
}
