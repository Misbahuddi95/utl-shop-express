import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { useStoreSession } from "@/lib/session";
import { companyCanPublish, validProductPrice } from "@/lib/company-rules";
import { formatPKR, resizeImage } from "@/lib/store";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/company")({
  head: () => ({ meta: [
    { title: "Company product portal — UTL Store" },
    { name: "description", content: "Manage your company's products and registration on UTL." },
    { property: "og:title", content: "Company product portal — UTL Store" },
    { property: "og:description", content: "Your company's UTL products and registration." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Company,
});
const field = "w-full rounded-md border bg-card px-3 py-2 text-sm";
type ProductDraft = Pick<Tables<"products">, "name" | "description" | "price" | "image_url" | "category_id" | "in_stock"> & { id?: string };

function Company() {
  const session = useStoreSession();
  const qc = useQueryClient();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const { data: registration, isPending: loadingRegistration, error: registrationError } = useQuery({
    queryKey: ["my-company", session?.user.id], enabled: !!session,
    queryFn: async () => { const { data, error } = await supabase.from("vendor_registrations").select("*").eq("user_id", session?.user.id ?? "").maybeSingle(); if (error) throw error; return data; },
  });
  const { data: products = [], error: productsError } = useQuery({
    queryKey: ["company-products", registration?.id], enabled: !!registration,
    queryFn: async () => { const { data, error } = await supabase.from("products").select("*").eq("vendor_id", registration?.id ?? "").order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [] });
  const active = registration && companyCanPublish(registration.status);
  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const f = new FormData(e.currentTarget);
    const credentials = { email: String(f.get("email")), password: String(f.get("password")) };
    try {
      const { error } = signup ? await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: window.location.origin + "/company" } }) : await supabase.auth.signInWithPassword(credentials);
      if (error) toast.error(error.message); else if (signup) toast.success("Check your email to confirm your account, then sign in.");
    } finally { setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!draft || !registration || !active || !validProductPrice(draft.price)) return;
    setBusy(true);
    try {
      const { id, ...row } = draft;
      const result = id ? await supabase.from("products").update(row).eq("id", id).eq("vendor_id", registration.id).select("id").single() : await supabase.from("products").insert({ ...row, vendor_id: registration.id }).select("id").single();
      if (result.error) { toast.error("Product could not be saved"); return; }
      setDraft(null); toast.success("Product published"); qc.invalidateQueries({ queryKey: ["company-products"] }); qc.invalidateQueries({ queryKey: ["products"] });
    } finally { setBusy(false); }
  }
  return <div className="min-h-screen">
    <header className="border-b bg-primary text-primary-foreground"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4"><Link to="/" className="font-display text-xl">UTL Store</Link><span>Company portal</span>{session && <Button variant="secondary" onClick={async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); setDraft(null); }}><LogOut /> Sign out</Button>}</div></header>
    <main className="mx-auto max-w-5xl px-4 py-8">
      {session === undefined ? <p>Loading…</p> : !session ? <form onSubmit={signIn} className="mx-auto max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">{signup ? "Create company account" : "Company sign in"}</h1>
        <label className="block text-sm">Email<input name="email" type="email" required className={field} /></label>
        <label className="block text-sm">Password<input name="password" type="password" minLength={6} required className={field} /></label>
        <Button className="w-full" disabled={busy}>{signup ? "Create account" : "Sign in"}</Button>
        <Button type="button" variant="outline" className="w-full" onClick={async () => { const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/company" }); if (result.error) toast.error(String(result.error)); }}>Continue with Google</Button>
        <Button type="button" variant="link" onClick={() => setSignup(!signup)}>{signup ? "Already registered? Sign in" : "Create company account"}</Button>
      </form> : registrationError ? <p role="alert">Company details could not be loaded.</p> : loadingRegistration ? <p>Loading company…</p> : !registration ? <div className="space-y-4"><h1 className="text-2xl font-semibold">Your company</h1><Button asChild><Link to="/register">Register your company</Link></Button></div> : <>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">{registration.company_name}</h1><p className="text-sm text-muted-foreground">Registration: {registration.status} · Fee {formatPKR(Number(registration.fee_amount))} · Ref {registration.payment_reference}</p></div>{active && !draft && <Button onClick={() => setDraft({ name: "", description: "", price: 0, image_url: null, category_id: categories[0]?.id ?? null, in_stock: true })}><Plus /> Add product</Button>}</div>
        {!active && <p className="mb-5 border-l-4 border-accent pl-4">{registration.status === "rejected" ? "Registration rejected. Contact UTL about your payment." : "Registration fee verification pending."}</p>}
        {draft && active ? <form onSubmit={save} className="max-w-lg space-y-4">
          <h2 className="text-xl font-semibold">{draft.id ? "Edit product" : "New product"}</h2>
          <label className="block text-sm">Product name<input required maxLength={200} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className={field} /></label>
          <label className="block text-sm">Description<textarea maxLength={2000} value={draft.description ?? ""} onChange={e => setDraft({ ...draft, description: e.target.value })} className={field} rows={3} /></label>
          <label className="block text-sm">Price (PKR)<input type="number" required min={0} step="0.01" value={draft.price} onChange={e => setDraft({ ...draft, price: Number(e.target.value) })} className={field} /></label>
          <label className="block text-sm">Category<select value={draft.category_id ?? ""} onChange={e => setDraft({ ...draft, category_id: e.target.value || null })} className={field}><option value="">Uncategorised</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={draft.in_stock} onChange={e => setDraft({ ...draft, in_stock: e.target.checked })} />In stock</label>
          {draft.image_url && <img src={draft.image_url} alt={draft.name} className="h-40 w-40 rounded-md object-contain" />}
          <label className="block text-sm">Product photo<input type="file" accept="image/*" disabled={busy} className="block w-full text-sm" onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { const url = await resizeImage(file); setDraft(current => current ? { ...current, image_url: url } : null); } catch { toast.error("Photo could not be uploaded"); } finally { setBusy(false); } }} /></label>
          <div className="flex gap-3"><Button disabled={busy}>Publish product</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}>Cancel</Button></div>
        </form> : <div className="space-y-3">{productsError && <p role="alert">Products could not be loaded.</p>}{products.map(p => <article key={p.id} className="flex items-center gap-3 rounded-md border bg-card p-3"><div className="h-16 w-16 shrink-0 bg-muted">{p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-contain" />}</div><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{p.name}</h2><p className="text-sm">{formatPKR(Number(p.price))} · {categories.find(c => c.id === p.category_id)?.name ?? "Uncategorised"}</p></div>{active && <><Button variant="outline" size="icon" aria-label={`Edit ${p.name}`} title="Edit product" onClick={() => setDraft(p)}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`} title="Delete product" onClick={async () => { if (!confirm("Delete this product?")) return; const { error } = await supabase.from("products").delete().eq("id", p.id).eq("vendor_id", registration.id); if (error) toast.error("Delete failed"); else { qc.invalidateQueries({ queryKey: ["company-products"] }); qc.invalidateQueries({ queryKey: ["products"] }); } }}><Trash2 /></Button></>}</article>)}{!products.length && !productsError && <p className="text-muted-foreground">No company products yet.</p>}</div>}
      </>}
    </main>
  </div>;
}