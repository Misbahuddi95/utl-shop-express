import { useEffect, useState } from "react";

export type CartItem = { id: string; name: string; price: number; qty: number; image_url: string | null };

export const formatPKR = (n: number) => "Rs " + Math.round(n).toLocaleString("en-PK");

export const cartTotal = (items: CartItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0);

const KEY = "utl-cart";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(KEY) || "[]"));
    } catch {
      /* ignore */
    }
  }, []);
  const save = (next: CartItem[]) => {
    setItems(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };
  return {
    items,
    add: (p: Omit<CartItem, "qty">) => {
      const ex = items.find((i) => i.id === p.id);
      save(ex ? items.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) : [...items, { ...p, qty: 1 }]);
    },
    setQty: (id: string, qty: number) =>
      save(qty <= 0 ? items.filter((i) => i.id !== id) : items.map((i) => (i.id === id ? { ...i, qty } : i))),
    clear: () => save([]),
  };
}

/** Resize an image file to a compact JPEG data URL (stored directly with the product). */
export function resizeImage(file: File, max = 700): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * scale;
      c.height = img.height * scale;
      const context = c.getContext("2d");
      if (!context) { reject(new Error("Photo could not be processed")); return; }
      context.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function ordersToCsv(rows: { created_at: string; customer_name: string; phone: string; address: string; items: unknown; total: number; status: string; notes: string | null }[]) {
  const head = ["Date", "Customer", "Phone", "Address", "Items", "Total", "Status", "Notes"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((o) => {
    const items = (o.items as unknown as CartItem[]).map((i) => `${i.name} x${i.qty}`).join("; ");
    return [new Date(o.created_at).toLocaleString(), o.customer_name, o.phone, o.address, items, o.total, o.status, o.notes]
      .map(esc)
      .join(",");
  });
  return [head.map(esc).join(","), ...lines].join("\n");
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Store logo URL from store_settings (empty string until loaded / not set). */
export function useStoreLogo() {
  const { data = "" } = useQuery({
    queryKey: ["store-logo"],
    queryFn: async () =>
      (await supabase.from("store_settings").select("value").eq("key", "logo_url").maybeSingle()).data?.value ?? "",
  });
  return data;
}
