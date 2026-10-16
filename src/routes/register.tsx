import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR } from "@/lib/store";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Sell on UTL — Company registration" },
      { name: "description", content: "Register your company to sell products on the UTL Online Store." },
      { property: "og:title", content: "Sell on UTL — Company registration" },
      { property: "og:description", content: "Register your company to sell products on the UTL Online Store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Register,
});

const input = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

function Register() {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: cfg } = useQuery({
    queryKey: ["vendor-cfg"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("key,value").in("key", ["vendor_fee", "vendor_payment_info", "vendor_bank_details", "vendor_mobile_details"]);
      return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    },
  });
  const fee = Number(cfg?.["vendor_fee"] ?? 0);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    setBusy(true);
    const { error } = await supabase.from("vendor_registrations").insert({
      company_name: s("company"), contact_name: s("contact"), email: s("email").toLowerCase(), phone: s("phone"),
      city: s("city") || null, products_info: s("products") || null, fee_amount: fee,
      payment_method: s("method"), payment_reference: s("ref"),
    });
    setBusy(false);
    if (error) { toast.error("Registration failed. Please check your details."); return; }
    setDone(true);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-lg font-semibold">UTL Store</Link>
          <span className="text-xs opacity-80">Company registration</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        {done ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <h1 className="font-display text-2xl font-semibold">Registration received!</h1>
            <p className="mt-2 text-muted-foreground">We will verify your payment and contact you soon.</p>
            <Link to="/portal" className="mt-4 inline-block underline">Open company portal</Link>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-semibold">Sell your products on UTL</h1>
            <p className="mt-2 text-muted-foreground">Register your company. Registration fee: <b className="text-foreground">{formatPKR(fee)}</b></p>
            {(cfg?.["vendor_bank_details"] || cfg?.["vendor_mobile_details"] || cfg?.["vendor_payment_info"]) && (
              <div className="mt-4 space-y-3 rounded-xl border border-accent bg-accent/10 p-4 text-sm">
                <p className="font-semibold">How to pay</p>
                {cfg?.["vendor_bank_details"] && (
                  <div>
                    <p className="font-medium">Bank transfer</p>
                    <p className="whitespace-pre-line text-muted-foreground">{cfg["vendor_bank_details"]}</p>
                  </div>
                )}
                {cfg?.["vendor_mobile_details"] && (
                  <div>
                    <p className="font-medium">JazzCash / Easypaisa</p>
                    <p className="whitespace-pre-line text-muted-foreground">{cfg["vendor_mobile_details"]}</p>
                  </div>
                )}
                {cfg?.["vendor_payment_info"] && <p className="whitespace-pre-line text-muted-foreground">{cfg["vendor_payment_info"]}</p>}
                <p className="text-muted-foreground">Pay the fee using any method above, then enter your transaction ID in the form below.</p>
              </div>
            )}
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input name="company" required maxLength={200} placeholder="Company name" className={input} />
              <input name="contact" required maxLength={200} placeholder="Contact person" className={input} />
              <input name="email" type="email" required maxLength={255} placeholder="Email" className={input} />
              <input name="phone" required minLength={5} maxLength={30} placeholder="Phone" className={input} />
              <input name="city" maxLength={100} placeholder="City" className={input} />
              <textarea name="products" maxLength={1000} rows={3} placeholder="What products do you want to sell?" className={input} />
              <select name="method" required className={input} defaultValue="">
                <option value="" disabled>Payment method</option>
                <option>JazzCash</option><option>Easypaisa</option><option>Bank transfer</option>
              </select>
              <input name="ref" required minLength={3} maxLength={100} placeholder="Payment transaction ID / reference" className={input} />
              <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
                {busy ? "Submitting…" : "Submit registration"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
