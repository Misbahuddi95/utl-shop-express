import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { getPublicProduct } from "./products.functions";

export const productQueryOptions = (id: string) => queryOptions({
  queryKey: ["public-product", id],
  queryFn: async () => {
    const product = await getPublicProduct({ data: { id } });
    if (!product) throw notFound();
    return product;
  },
  staleTime: 30_000,
  retry: false,
});