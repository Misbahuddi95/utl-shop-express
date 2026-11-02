import { productUrl, STORE_ORIGIN } from "./product-seo";

export type ProductIdPage = (offset: number, limit: number) => Promise<{ id: string }[]>;

/** Consume every batch before returning any XML; failures propagate. */
export async function productSitemap(fetchPage: ProductIdPage, pageSize = 1000) {
  const urls = new Set<string>([`${STORE_ORIGIN}/`]);
  for (let offset = 0; ; ) {
    const rows = await fetchPage(offset, pageSize);
    if (!rows.length) break;
    for (const row of rows) urls.add(productUrl(row.id));
    offset += rows.length;
  }
  const escape = (value: string) => value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
    return entities[char] ?? char;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...urls].map((url) => `<url><loc>${escape(url)}</loc></url>`).join("")}</urlset>`;
}