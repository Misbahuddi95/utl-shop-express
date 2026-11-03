import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PublicProduct } from "./product-seo";

export const getPublicProduct = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().max(100) }))
  .handler(async ({ data }): Promise<PublicProduct | null> => {
    if (!z.string().uuid().safeParse(data.id).success) return null;
    const { createPublicStoreClient } = await import("./public-store.server");
    const client = createPublicStoreClient();
    const { data: product, error } = await client.from("products")
      .select("id,name,description,image_url,price,in_stock,category_id")
      .eq("id", data.id).maybeSingle();
    if (error) throw new Error("Product could not be loaded");
    if (!product) return null;
    let category_name: string | null = null;
    if (product.category_id) {
      const { data: category, error: categoryError } = await client.from("categories")
        .select("name").eq("id", product.category_id).maybeSingle();
      if (categoryError) throw new Error("Product category could not be loaded");
      category_name = category?.name ?? null;
    }
    return {
      id: product.id, name: product.name, description: product.description,
      image_url: product.image_url, price: Number(product.price), in_stock: product.in_stock, category_name,
    };
  });
/** Absolute https image for link previews: store logo, else newest product photo. */
export const getShareImage = createServerFn({ method: "GET" }).handler(async (): Promise<string | null> => {
  const { productImageUrl } = await import("./product-seo");
  try {
    const { createPublicStoreClient } = await import("./public-store.server");
    const client = createPublicStoreClient();
    const { data: settings } = await client.rpc("get_public_settings");
    const logo = productImageUrl((settings ?? []).find((r) => r.key === "logo_url")?.value ?? null);
    if (logo) return logo;
    const { data: rows } = await client.from("products").select("image_url").not("image_url", "is", null)
      .order("created_at", { ascending: false }).limit(10);
    for (const r of rows ?? []) { const u = productImageUrl(r.image_url); if (u) return u; }
  } catch { /* no preview image */ }
  return null;
});
