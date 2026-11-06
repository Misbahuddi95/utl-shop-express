import type { CartItem } from "@/lib/store";

const SHOPIFY_API_VERSION = "2026-10";
const SHOPIFY_STORE_PERMANENT_DOMAIN = "ts0j0a-54.myshopify.com";
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_STOREFRONT_TOKEN = "32c5227a523a35adaa31dcd20d82cd66"; // public storefront token

export async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 402) throw new Error("Shopify store needs an active plan to take payments.");
  if (!res.ok) throw new Error(`Shopify error ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors.map((e: { message: string }) => e.message).join(", "));
  return data;
}

const FIND_VARIANT = `query($q: String!) { products(first: 5, query: $q) { edges { node { title variants(first: 1) { edges { node { id availableForSale } } } } } } }`;

const CART_CREATE = `mutation cartCreate($input: CartInput!) { cartCreate(input: $input) { cart { id checkoutUrl } userErrors { field message } } }`;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

async function findVariantId(name: string): Promise<string | null> {
  const data = await storefrontApiRequest(FIND_VARIANT, { q: `title:"${name.trim().replace(/"/g, "")}"` });
  const match = (data.data.products.edges as { node: { title: string; variants: { edges: { node: { id: string; availableForSale: boolean } }[] } } }[])
    .find((e) => norm(e.node.title) === norm(name));
  const v = match?.node.variants.edges[0]?.node;
  return v?.availableForSale ? v.id : null;
}

export function formatCheckoutUrl(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.set("channel", "online_store");
    return u.toString();
  } catch {
    return url;
  }
}

/** Creates a real Shopify cart for the UTL cart items. Returns checkout URL, or names of items not sold online. */
export async function createCardCheckout(items: CartItem[]): Promise<{ url: string } | { missing: string[] }> {
  const ids = await Promise.all(items.map((i) => findVariantId(i.name)));
  const missing = items.filter((_, k) => !ids[k]).map((i) => i.name);
  if (missing.length) return { missing };
  const data = await storefrontApiRequest(CART_CREATE, {
    input: { lines: items.map((i, k) => ({ merchandiseId: ids[k], quantity: i.qty })) },
  });
  const errs = data.data.cartCreate.userErrors;
  if (errs.length) throw new Error(errs[0].message);
  return { url: formatCheckoutUrl(data.data.cartCreate.cart.checkoutUrl) };
}
