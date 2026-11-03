export const STORE_ORIGIN = "https://utl-shop-express.lovable.app";

export type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  in_stock: boolean;
  category_name: string | null;
};

export function productUrl(id: string) {
  return `${STORE_ORIGIN}/product/${encodeURIComponent(id)}`;
}

export function productImageUrl(image: string | null) {
  if (!image) return undefined;
  try {
    const url = new URL(image, STORE_ORIGIN);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function productDescription(product: PublicProduct) {
  const description = product.description?.replace(/\s+/g, " ").trim();
  return description ? description.slice(0, 150) : `Buy ${product.name} online at UTL Online Store in Pakistan.`;
}

export function productSchema(product: PublicProduct) {
  const image = productImageUrl(product.image_url);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(image ? { image } : {}),
    description: product.description?.trim() || productDescription(product),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "PKR",
      availability: `https://schema.org/${product.in_stock ? "InStock" : "OutOfStock"}`,
      url: productUrl(product.id),
    },
  };
}
export function breadcrumbSchema(product: PublicProduct) {
  const names = [["Home", `${STORE_ORIGIN}/`], ...(product.category_name ? [[product.category_name, `${STORE_ORIGIN}/`]] : []), [product.name, productUrl(product.id)]];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: names.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })),
  };
}
