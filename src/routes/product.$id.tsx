import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StoreLayout } from "@/components/store/store-layout";
import { formatPKR, useCart } from "@/lib/store";
import { productQueryOptions } from "@/lib/product-query";
import { productDescription, productImageUrl, productSchema, productUrl } from "@/lib/product-seo";

export const Route = createFileRoute("/product/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(productQueryOptions(params.id)),
  head: ({ loaderData }) => {
    if (!loaderData) return {
      meta: [
        { title: "Product unavailable | UTL Online Store" },
        { name: "description", content: "This UTL product is unavailable." },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: "Product unavailable | UTL Online Store" },
        { property: "og:description", content: "This UTL product is unavailable." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
    const title = `${loaderData.name} | UTL Online Store`;
    const description = productDescription(loaderData);
    const image = productImageUrl(loaderData.image_url);
    const url = productUrl(loaderData.id);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(productSchema(loaderData)).replace(/</g, "\\u003c") }],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Product not found</h1>
      <Button asChild variant="link" className="mt-4 px-0"><Link to="/">Back to store</Link></Button>
    </main>
  ),
  errorComponent: ProductError,
});

function ProductError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-6xl px-4 py-12" role="alert">
      <h1 className="text-2xl font-semibold">Product could not be loaded</h1>
      <Button className="mt-4" onClick={async () => { await router.invalidate(); reset(); }}>Try again</Button>
    </main>
  );
}

function ProductPage() {
  const { id } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQueryOptions(id));
  const cart = useCart();
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  return (
    <StoreLayout cart={cart}>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Button asChild variant="link" className="mb-6 px-0"><Link to="/"><ArrowLeft />Back to store</Link></Button>
        <div className="grid gap-6 md:grid-cols-2">
          <Button
            variant="ghost"
            aria-label={zoom ? `Zoom out ${product.name}` : `Zoom ${product.name}`}
            aria-pressed={zoom}
            className={`relative aspect-square h-auto w-full overflow-hidden rounded-2xl bg-muted p-0 hover:bg-muted ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            onClick={() => setZoom((value) => !value)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setOrigin(`${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`);
            }}
          >
            {product.image_url && <img src={product.image_url} alt={product.name} style={{ transformOrigin: origin }} className={`h-full w-full object-cover transition-transform duration-300 motion-reduce:transition-none ${zoom ? "scale-[2.5]" : ""}`} />}
          </Button>
          <div className="min-w-0 py-2">
            <p className="text-sm text-muted-foreground">{product.category_name ?? "Uncategorized"}</p>
            <h1 className="mt-2 break-words text-3xl font-semibold">{product.name}</h1>
            <p className="mt-3 text-xl font-bold text-primary">{formatPKR(product.price)}</p>
            <p className="mt-2 text-sm text-muted-foreground">{product.in_stock ? "In stock" : "Sold out"}</p>
            {product.description && <p className="mt-6 whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>}
            <Button
              disabled={!product.in_stock}
              className="mt-6 h-auto w-full rounded-full py-3 font-semibold md:max-w-sm"
              onClick={() => {
                cart.add({ id: product.id, name: product.name, price: product.price, image_url: product.image_url });
                toast.success("Added to cart");
              }}
            >{product.in_stock ? "Add to cart" : "Sold out"}</Button>
          </div>
        </div>
      </main>
    </StoreLayout>
  );
}