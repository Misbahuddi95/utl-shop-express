import { describe, expect, it } from "vitest";
import { productDescription, productImageUrl, productSchema, productUrl, type PublicProduct } from "@/lib/product-seo";

const product: PublicProduct = {
  id: "a-product", name: "UTL Kids Hoodie", description: "A soft cotton hoodie.",
  image_url: "/__l5e/assets-v1/hoodie.jpg", price: 1599, in_stock: true, category_name: "Kids Garments",
};

describe("Product search data", () => {
  it("uses the published self-referencing product URL", () => {
    expect(productUrl(product.id)).toBe("https://utl-shop-express.lovable.app/product/a-product");
  });
  it("limits the description to the first 150 characters", () => {
    expect(productDescription({ ...product, description: "abc".repeat(100) })).toBe("abc".repeat(50));
  });
  it("uses the requested fallback when the description is empty", () => {
    expect(productDescription({ ...product, description: null })).toBe("Buy UTL Kids Hoodie online at UTL Online Store in Pakistan.");
  });
  it("resolves the actual product photo to the published origin", () => {
    expect(productImageUrl(product.image_url)).toBe("https://utl-shop-express.lovable.app/__l5e/assets-v1/hoodie.jpg");
    expect(productImageUrl("data:image/jpeg;base64,abc")).toBeUndefined();
  });
  it("uses PKR and the actual product price", () => {
    expect(productSchema(product).offers).toMatchObject({ price: 1599, priceCurrency: "PKR" });
  });
  it("maps in_stock to InStock", () => {
    expect(productSchema(product).offers.availability).toBe("https://schema.org/InStock");
  });
  it("maps unavailable products to OutOfStock", () => {
    expect(productSchema({ ...product, in_stock: false }).offers.availability).toBe("https://schema.org/OutOfStock");
  });
});