import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR, resizeImage } from "@/lib/store";

export const Route = createFileRoute("/portal")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Company Portal — Sell on UTL" },
      { name: "description", content: "Companies register, pay the fee and manage their own products on the UTL store." },
      { property: "og:title", content: "UTL Company Portal" },
      { property: "og:description", content: "Register your company and manage your own products on UTL." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Portal,
});

const input = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
const btn = "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function Portal() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <div className="min-h-screen">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-lg font-semibold">UTL Store</Link>
          <div className="flex items-center gap-3 text-xs">
            <span>Company Portal</span>
            {session && <button className="underline" onClick={() => supabase.auth.signOut()}>Sign out</button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {session === undefined ? null : session ? <Company userId={session.user.id} email={session.user.email ?? ""} /> : <Login />}
      </main>
    </div>
  );
}

function Login() {
  const [up, setUp] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")), password = String(f.get("password"));
    setBusy(true);
    const { error } = up
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/portal" } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (up) toast.success("Check your email to confirm your account, then sign in.");
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-3 rounded-2xl border bg-card p-6">
      <h1 className="text-2xl font-semibold">{up ? "Create company account" : "Company sign in"}</h1>
      <input name="email" type="email" required placeholder="Email" className={input} />
      <input name="password" type="password" required minLength={6} placeholder="Password" className={input} />
      <button disabled={busy} className={btn + " w-full"}>{up ? "Create account" : "Sign in"}</button>
      <button type="button" onClick={() => setUp(!up)} className="w-full text-xs text-muted-foreground underline">
        {up ? "Already have an account? Sign in" : "New company? Create an account"}
      </button>
    </form>
  );
}

function Company({ userId, email }: { userId: string; email: string }) {
  const { data: reg, isLoading } = useQuery({
    queryKey: ["my-company", userId],
    queryFn: async () => (await supabase.from("vendor_registrations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle()).data,
  });
  if (isLoading) return <p>Loading…</p>;
  if (!reg) return <RegisterForm userId={userId} email={email} />;
  if (reg.status === "pending") return <Notice title="Registration received" text="We are verifying your registration fee. Once confirmed, you can add products here." />;
  if (reg.status === "rejected") return <Notice title="Registration not approved" text="Please contact UTL for details." />;
  return <MyProducts vendorId={reg.id} company={reg.company_name} />;
}

function Notice({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border bg-card p-6 text-center"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-muted-foreground">{text}</p></div>;
}

function RegisterForm({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
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
      user_id: userId, company_name: s("company"), contact_name: s("contact"), email: email.toLowerCase(), phone: s("phone"),
      city: s("city") || null, products_info: s("products") || null, fee_amount: fee, payment_method: s("method"), payment_reference: s("ref"),
    });
    setBusy(false);
    if (error) return toast.error("Registration failed. Please check your details.");
    qc.invalidateQueries({ queryKey: ["my-company"] });
  }
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Register your company</h1>
      <p className="mt-2 text-muted-foreground">Registration fee: <b className="text-foreground">{formatPKR(fee)}</b></p>
      {(cfg?.["vendor_bank_details"] || cfg?.["vendor_mobile_details"] || cfg?.["vendor_payment_info"]) && (
        <div className="mt-4 space-y-2 rounded-xl border border-accent bg-accent/10 p-4 text-sm">
          <p className="font-semibold">How to pay</p>
          {cfg?.["vendor_bank_details"] && <p className="whitespace-pre-line"><b>Bank transfer:</b> {cfg["vendor_bank_details"]}</p>}
          {cfg?.["vendor_mobile_details"] && <p className="whitespace-pre-line"><b>JazzCash / Easypaisa:</b> {cfg["vendor_mobile_details"]}</p>}
          {cfg?.["vendor_payment_info"] && <p className="whitespace-pre-line text-muted-foreground">{cfg["vendor_payment_info"]}</p>}
        </div>
      )}
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input name="company" required maxLength={200} placeholder="Company name" className={input} />
        <input name="contact" required maxLength={200} placeholder="Contact person" className={input} />
        <input name="phone" required minLength={5} maxLength={30} placeholder="Phone" className={input} />
        <input name="city" maxLength={100} placeholder="City" className={input} />
        <textarea name="products" maxLength={1000} rows={2} placeholder="What products do you sell?" className={input} />
        <select name="method" required className={input} defaultValue="">
          <option value="" disabled>Payment method</option>
          <option>JazzCash</option><option>Easypaisa</option><option>Bank transfer</option>
        </select>
        <input name="ref" required minLength={3} maxLength={100} placeholder="Payment transaction ID" className={input} />
        <button disabled={busy} className={btn + " w-full"}>{busy ? "Submitting…" : "Submit registration"}</button>
      </form>
    </div>
  );
}

type P = { id: string; name: string; description: string | null; price: number; image_url: string | null; category_id: string | null; in_stock: boolean };

function MyProducts({ vendorId, company }: { vendorId: string; company: string }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<P | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: cats = [] } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [] });
  const { data = [] } = useQuery({
    queryKey: ["my-products", vendorId],
    queryFn: async () => (await supabase.from("products").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["my-products"] }); qc.invalidateQueries({ queryKey: ["products"] }); };
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget, f = new FormData(el);
    const row = {
      name: String(f.get("name")).trim(), description: String(f.get("description") || "").trim() || null,
      price: Number(f.get("price")) || 0, category_id: String(f.get("category") || "") || null,
      in_stock: f.get("in_stock") === "on", image_url: img ?? edit?.image_url ?? null, vendor_id: vendorId,
    };
    setBusy(true);
    const { error } = edit ? await supabase.from("products").update(row).eq("id", edit.id) : await supabase.from("products").insert(row);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Product updated" : "Product added to the store");
    el.reset(); setEdit(null); setImg(null); refresh();
  }
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">{company}</h1>
      <form key={edit?.id ?? "new"} onSubmit={save} className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">{edit ? "Edit product" : "Add a product"}</h2>
        <input name="name" required maxLength={200} defaultValue={edit?.name} placeholder="Product name" className={input} />
        <textarea name="description" maxLength={2000} rows={3} defaultValue={edit?.description ?? ""} placeholder="Description" className={input} />
        <div className="grid grid-cols-2 gap-3">
          <input name="price" type="number" min="0" required defaultValue={edit?.price} placeholder="Price (PKR)" className={input} />
          <select name="category" defaultValue={edit?.category_id ?? ""} className={input}>
            <option value="">No category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="in_stock" defaultChecked={edit?.in_stock ?? true} /> In stock</label>
        <input type="file" accept="image/*" className="text-sm" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setImg(await resizeImage(file)); }} />
        {(img ?? edit?.image_url) && <img src={img ?? edit?.image_url ?? ""} alt="" className="h-24 w-24 rounded-lg object-cover" />}
        <div className="flex gap-2">
          <button disabled={busy} className={btn}>{edit ? "Save" : "Add product"}</button>
          {edit && <button type="button" className="text-sm underline" onClick={() => { setEdit(null); setImg(null); }}>Cancel</button>}
        </div>
      </form>
      <div>
        <h2 className="mb-3 text-xl font-semibold">My products ({data.length})</h2>
        <div className="space-y-2">
          {data.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 text-sm">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex-1"><p className="font-medium">{p.name}</p><p className="text-muted-foreground">{formatPKR(Number(p.price))}{!p.in_stock && " · Sold out"}</p></div>
              <button className="underline" onClick={() => { setEdit(p as P); setImg(null); window.scrollTo(0, 0); }}>Edit</button>
              <button className="text-destructive underline" onClick={async () => {
                if (!confirm("Delete this product?")) return;
                const { error } = await supabase.from("products").delete().eq("id", p.id);
                if (error) toast.error(error.message); else refresh();
              }}>Delete</button>
            </div>
          ))}
          {!data.length && <p className="text-muted-foreground">No products yet. Add your first product above.</p>}
        </div>
      </div>
    </div>
  );
}
