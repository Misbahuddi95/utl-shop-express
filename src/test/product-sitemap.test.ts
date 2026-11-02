import { describe, expect, it, vi } from "vitest";
import { productSitemap } from "@/lib/product-sitemap";

describe("Public product sitemap", () => {
  it("lists only homepage and all product pages across batches, without lastmod", async () => {
    const page = vi.fn(async (offset: number) => offset === 0 ? [{ id: "one" }, { id: "two" }] : offset === 2 ? [{ id: "three" }] : []);
    const xml = await productSitemap(page, 2);
    expect(page.mock.calls.map(([offset]) => offset)).toEqual([0, 2, 3]);
    expect(xml.match(/<loc>/g)).toHaveLength(4);
    expect(xml).toContain("<loc>https://utl-shop-express.lovable.app/</loc>");
    expect(xml).toContain("<loc>https://utl-shop-express.lovable.app/product/three</loc>");
    expect(xml).not.toMatch(/lastmod|\/admin|\/portal|\/register|\/reset-password/);
  });
  it("fails rather than returning partial XML when a later batch fails", async () => {
    const page = vi.fn(async (offset: number) => {
      if (offset) throw new Error("Read failed");
      return [{ id: "one" }];
    });
    await expect(productSitemap(page, 1)).rejects.toThrow("Read failed");
  });
});