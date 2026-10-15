import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ShoppingBag, X, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cartTotal, formatPKR, useCart, useStoreLogo } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UTL Online Store — Shop & order online" },
      { name: "description", content: "Browse UTL products by category, add to cart and place your order online." },
      { property: "og:title", content: "UTL Online Store" },
      { property: "og:description", content: "Browse UTL products and place your order online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Store,
});

function Store() {
  const cart = useCart();
  const logo = useStoreLogo();
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  const [sending, setSending] = useState(false);

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const shown = cat ? products.filter((p) => p.category_id === cat) : products;
  const count = cart.items.reduce((s, i) => s + i.qty, 0);

  async function placeOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSending(true);
    const { error } = await supabase.from("orders").insert({
      customer_name: String(f.get("name")).trim(),
      phone: String(f.get("phone")).trim(),
      customer_email: String(f.get("email")).trim().toLowerCase(),
      address: String(f.get("address")).trim(),
      notes: String(f.get("notes") || "").trim() || null,
      items: cart.items,
      total: cartTotal(cart.items),
    });
    setSending(false);
    if (error) { toast.error("Order could not be placed. Please check your details."); return; }
    cart.clear();
    setStep("done");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt="UTL logo" className="h-9 w-9 rounded-full object-contain" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">UTL</span>
            )}
            <span className="font-display text-xl font-semibold">UTL Store</span>
          </div>
          <button onClick={() => { setOpen(true); setStep("cart"); }} className="relative rounded-full bg-primary p-2.5 text-primary-foreground" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">{count}</span>}
          </button>
        </div>
      </header>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <p className="text-sm uppercase tracking-widest text-accent">Online Store</p>
          <h1 className="mt-2 max-w-xl text-4xl font-semibold leading-tight md:text-5xl">Quality products, delivered to your door.</h1>
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
            {shown.map((p) => (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
                <div className="aspect-square bg-muted">
                  {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <h3 className="font-sans text-sm font-semibold">{p.name}</h3>
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

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © UTL Store · <Link to="/register" className="underline">Sell on UTL</Link> · <Link to="/company" className="underline">Company portal</Link> · <Link to="/admin" className="underline">Admin</Link>
      </footer>

      {open && (
        <div className="fixed inset-0 z-30 flex justify-end bg-foreground/40" onClick={() => setOpen(false)}>
          <div className="flex h-full w-full max-w-md flex-col bg-background" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-xl font-semibold">{step === "checkout" ? "Your details" : step === "done" ? "Thank you!" : "Your cart"}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close"><X /></button>
            </div>
            {step === "done" ? (
              <div className="p-6 text-center">
                <p>Your order has been placed. We will contact you soon to confirm.</p>
                <button onClick={() => setOpen(false)} className="mt-6 rounded-full bg-primary px-6 py-2 text-primary-foreground">Continue shopping</button>
              </div>
            ) : step === "checkout" ? (
              <form onSubmit={placeOrder} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                <input name="name" required maxLength={200} placeholder="Full name" className="rounded-lg border bg-card px-3 py-2" />
                <input name="phone" required minLength={5} maxLength={30} placeholder="Phone number" className="rounded-lg border bg-card px-3 py-2" />
                <input name="email" type="email" required maxLength={255} placeholder="Email (for order updates)" className="rounded-lg border bg-card px-3 py-2" />
                <textarea name="address" required minLength={3} maxLength={1000} placeholder="Delivery address" rows={3} className="rounded-lg border bg-card px-3 py-2" />
                <textarea name="notes" maxLength={1000} placeholder="Notes (optional)" rows={2} className="rounded-lg border bg-card px-3 py-2" />
                <p className="text-sm">Total: <b>{formatPKR(cartTotal(cart.items))}</b> · Cash on delivery</p>
                <div className="mt-auto flex gap-2">
                  <button type="button" onClick={() => setStep("cart")} className="flex-1 rounded-full border py-2.5">Back</button>
                  <button disabled={sending} className="flex-1 rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-50">{sending ? "Placing…" : "Place order"}</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {cart.items.length === 0 && <p className="text-muted-foreground">Your cart is empty.</p>}
                  {cart.items.map((i) => (
                    <div key={i.id} className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}</div>
                      <div className="flex-1"><p className="text-sm font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{formatPKR(i.price)}</p></div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => cart.setQty(i.id, i.qty - 1)} className="rounded-full border p-1" aria-label="Less"><Minus className="h-3 w-3" /></button>
                        <span className="w-5 text-center text-sm">{i.qty}</span>
                        <button onClick={() => cart.setQty(i.id, i.qty + 1)} className="rounded-full border p-1" aria-label="More"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t p-4">
                  <div className="mb-3 flex justify-between font-semibold"><span>Total</span><span>{formatPKR(cartTotal(cart.items))}</span></div>
                  <button disabled={!cart.items.length} onClick={() => setStep("checkout")} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-40">Checkout</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
