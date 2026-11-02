import { createFileRoute } from "@tanstack/react-router";
import { productSitemap } from "@/lib/product-sitemap";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { createPublicStoreClient } = await import("@/lib/public-store.server");
          const client = createPublicStoreClient();
          const xml = await productSitemap(async (offset, limit) => {
            const { data, error } = await client.from("products").select("id")
              .order("id").range(offset, offset + limit - 1);
            if (error) throw error;
            if (!data) throw new Error("Missing product sitemap data");
            return data;
          });
          return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" } });
        } catch {
          return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
        }
      },
    },
  },
});