import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR, useCart } from "@/lib/store";
import { StoreLayout } from "@/components/store/store-layout";
import { getShareImage } from "@/lib/products.functions";
import heroVideo from "@/assets/utl-store-hero.mp4.asset.json";

export const Route = createFileRoute("/")({
  loader: async () => ({ shareImage: await getShareImage() }),
  head: ({ loaderData }) => ({
    meta: [
      { title: "UTL Online Store | Kids Fashion, Frocks, Hoodies & Dupatta in Pakistan" },
      { name: "description", content: "Shop kids fashion, girls frocks, boys t-shirts, hoodies and dupatta online at UTL Online Store. Easy ordering with delivery across Pakistan." },
      { property: "og:title", content: "UTL Online Store | Kids Fashion, Frocks, Hoodies & Dupatta in Pakistan" },
      { property: "og:description", content: "Shop kids fashion, girls frocks, boys t-shirts, hoodies and dupatta online at UTL Online Store. Easy ordering with delivery across Pakistan." },
      { property: "og:url", content: "https://utl-shop-express.lovable.app/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.shareImage ? [{ property: "og:image", content: loaderData.shareImage }, { name: "twitter:image", content: loaderData.shareImage }] : []),
    ],
    links: [{ rel: "canonical", href: "https://utl-shop-express.lovable.app/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://utl-shop-express.lovable.app/#organization",
            name: "UTL Online Store",
            url: "https://utl-shop-express.lovable.app/",
          },
          {
            "@type": "WebSite",
            "@id": "https://utl-shop-express.lovable.app/#website",
            name: "UTL Online Store",
            url: "https://utl-shop-express.lovable.app/",
            publisher: { "@id": "https://utl-shop-express.lovable.app/#organization" },
          },
        ],
      }),
    }],
  }),
  component: Store,
});

function Store() {
  const cart = useCart();
  const [cat, setCat] = useState<string | null>(null);

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const shown = cat ? products.filter((p) => p.category_id === cat) : products;

  return (
    <StoreLayout cart={cart}>
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <p className="text-sm uppercase tracking-widest text-accent">Online Store</p>
          <h1 className="mt-2 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">Kids Fashion & Everyday Essentials, Delivered Across Pakistan</h1>
          <p className="mt-3 max-w-md opacity-80">Choose items, add them to your cart, and place your order in a minute.</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
          {[{ id: null, name: "All" }, ...cats].map((c) => (
            <button key={c.id ?? "all"} onClick={() => setCat(c.id)}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm ${cat === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>
              {c.name}
            </button>
          ))}
        </div>

        {isLoading ? <p className="text-muted-foreground">Loading…</p> : shown.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">No products yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {shown.map((p, idx) => (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
                <Link to="/product/$id" params={{ id: p.id }} className="aspect-square overflow-hidden bg-muted" aria-label={`View ${p.name}`}>
                  {p.image_url && <img src={p.image_url} alt={p.name} width={400} height={400} className="h-full w-full object-cover transition-transform duration-300 hover:scale-110" loading={idx < 4 ? "eager" : "lazy"} />}
                </Link>
                <div className="flex flex-1 flex-col p-3">
                  <h3 className="font-sans text-sm font-semibold"><Link to="/product/$id" params={{ id: p.id }}>{p.name}</Link></h3>
                  {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="font-bold text-primary">{formatPKR(Number(p.price))}</span>
                    <button disabled={!p.in_stock}
                      onClick={() => { cart.add({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url }); toast.success("Added to cart"); }}
                      className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground disabled:opacity-40">
                      {p.in_stock ? "Add" : "Sold out"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

    </StoreLayout>
  );
}
