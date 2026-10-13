import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { generateDescription } from "@/lib/ai.functions";
import { formatPKR, ordersToCsv, resizeImage, useStoreLogo, type CartItem } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — UTL Online Store" },
      { name: "description", content: "Manage UTL products, categories and orders." },
      { property: "og:title", content: "UTL Store Admin" },
      { property: "og:description", content: "Manage UTL products, categories and orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const input = "w-full rounded-lg border bg-card px-3 py-2 text-sm";
const btn = "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin")
      .then(({ data }) => setIsAdmin(!!data?.length));
  }, [session]);

  if (session === undefined) return null;
  if (!session) return <Login />;
  if (isAdmin === null) return <p className="p-6">Loading…</p>;
  if (!isAdmin) return (
    <div className="p-6"><p>This account is not an admin.</p><button className={btn + " mt-4"} onClick={() => supabase.auth.signOut()}>Sign out</button></div>
  );
  return <Dashboard email={session.user.email ?? ""} />;
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")), password = String(f.get("password"));
    setBusy(true);
    const { error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (mode === "up") toast.success("Check your email to confirm your account, then sign in.");
  }
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-semibold">UTL Admin</h1>
        <input name="email" type="email" required placeholder="Email" className={input} />
        <input name="password" type="password" required minLength={6} placeholder="Password" className={input} />
        <button disabled={busy} className={btn + " w-full"}>{mode === "in" ? "Sign in" : "Create admin account"}</button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-xs text-muted-foreground underline">
          {mode === "in" ? "First time? Create the admin account" : "Already have an account? Sign in"}
        </button>
        <Link to="/" className="block text-center text-xs underline">Back to store</Link>
      </form>
    </div>
  );
}

function Dashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<"orders" | "products" | "categories" | "companies" | "settings">("orders");
  return (
    <div className="min-h-screen">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="font-display text-lg font-semibold">UTL Admin</span>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden opacity-80 sm:inline">{email}</span>
            <Link to="/" className="underline">Store</Link>
            <button onClick={() => supabase.auth.signOut()} className="underline">Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {(["orders", "products", "categories", "companies", "settings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "bg-card"}`}>{t}</button>
          ))}
        </div>
        {tab === "orders" ? <Orders /> : tab === "products" ? <Products /> : tab === "categories" ? <Categories /> : tab === "companies" ? <Companies /> : <Settings />}
      </div>
    </div>
  );
}

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "completed", "cancelled"];

function Orders() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  // Live updates: refresh the list the moment a new order arrives or a status changes.
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["orders"] });
        if (payload.eventType === "INSERT") toast.success("New order received!");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
  const exportCsv = () => {
    const blob = new Blob([ordersToCsv(data)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `utl-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Orders ({data.length})</h2>
        <button onClick={exportCsv} disabled={!data.length} className={btn}>Export CSV</button>
      </div>
      <div className="space-y-3">
        {data.map((o) => (
          <div key={o.id} className="rounded-xl border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{o.customer_name} · {o.phone}</p>
                <p className="text-muted-foreground">{o.address}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <select value={o.status} className="rounded-lg border bg-background px-2 py-1"
                onChange={async (e) => {
                  const { error } = await supabase.from("orders").update({ status: e.target.value }).eq("id", o.id);
                  if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["orders"] });
                }}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <ul className="mt-2 border-t pt-2">
              {(o.items as unknown as CartItem[]).map((i) => <li key={i.id}>{i.name} × {i.qty} — {formatPKR(i.price * i.qty)}</li>)}
            </ul>
            {o.notes && <p className="mt-1 italic text-muted-foreground">Note: {o.notes}</p>}
            <p className="mt-2 font-bold">Total: {formatPKR(Number(o.total))}</p>
          </div>
        ))}
        {!data.length && <p className="text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}

function Categories() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["categories"] });
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={async (e) => {
        e.preventDefault();
        const el = e.currentTarget, name = String(new FormData(el).get("name")).trim();
        if (!name) return;
        const { error } = await supabase.from("categories").insert({ name, sort_order: data.length });
        if (error) toast.error(error.message); else { el.reset(); refresh(); }
      }}>
        <input name="name" placeholder="New category" className={input} />
        <button className={btn}>Add</button>
      </form>
      {data.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-2 text-sm">
          <span>{c.name}</span>
          <div className="flex gap-3">
            <button className="underline" onClick={async () => {
              const name = prompt("Rename category", c.name);
              if (name) { await supabase.from("categories").update({ name }).eq("id", c.id); refresh(); }
            }}>Rename</button>
            <button className="text-destructive underline" onClick={async () => {
              if (confirm("Delete this category?")) { await supabase.from("categories").delete().eq("id", c.id); refresh(); }
            }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

type Product = { id?: string; name: string; description: string | null; price: number; image_url: string | null; category_id: string | null; in_stock: boolean };

function Products() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort_order")).data ?? [],
  });
  const { data = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["products"] });
  const genFn = useServerFn(generateDescription);
  const [details, setDetails] = useState("");
  const [genBusy, setGenBusy] = useState(false);

  async function generate() {
    if (!editing) return;
    setGenBusy(true);
    try {
      const r = await genFn({ data: { name: editing.name, details, category: cats.find((c) => c.id === editing.category_id)?.name ?? "", price: editing.price } });
      if ("text" in r && r.text) { setEditing({ ...editing, description: r.text }); toast.success("Description ready"); }
      else toast.error(r.error ?? "Failed");
    } catch { toast.error("Something went wrong"); }
    setGenBusy(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return undefined;
    const { id, ...row } = editing;
    const { error } = id ? await supabase.from("products").update(row).eq("id", id) : await supabase.from("products").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    refresh();
  }

  if (editing) return (
    <form onSubmit={save} className="max-w-lg space-y-3">
      <h2 className="text-xl font-semibold">{editing.id ? "Edit product" : "New product"}</h2>
      <input required placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={input} />
      <div className="space-y-2 rounded-xl border border-dashed bg-secondary p-3">
        <p className="flex items-center gap-1 text-sm font-semibold"><Sparkles className="h-4 w-4" /> AI description writer</p>
        <textarea placeholder="Product details: size, material, features, uses…" value={details} onChange={(e) => setDetails(e.target.value)} className={input} rows={3} />
        <button type="button" onClick={generate} disabled={genBusy || !editing.name.trim()} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50">
          {genBusy ? "Writing…" : "Generate description"}
        </button>
      </div>
      <textarea placeholder="Description" value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={input} rows={3} />
      <input required type="number" min={0} step="1" placeholder="Price (Rs)" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} className={input} />
      <select value={editing.category_id ?? ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })} className={input}>
        <option value="">No category</option>
        {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.in_stock} onChange={(e) => setEditing({ ...editing, in_stock: e.target.checked })} /> In stock</label>
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 overflow-hidden rounded-lg bg-muted">{editing.image_url && <img src={editing.image_url} alt="" className="h-full w-full object-cover" />}</div>
        <input type="file" accept="image/*" className="text-sm" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setEditing({ ...editing, image_url: await resizeImage(f) });
        }} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditing(null)} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
        <button className={btn}>Save</button>
      </div>
    </form>
  );

  return <ProductList data={data} cats={cats} onEdit={(p) => setEditing({ ...p, price: Number(p.price) })} onNew={() => setEditing({ name: "", description: "", price: 0, image_url: null, category_id: cats[0]?.id ?? null, in_stock: true })} refresh={refresh} />;
}

function ProductList({ data, cats, onEdit, onNew, refresh }: {
  data: Array<{ id: string; name: string; price: number | string; image_url: string | null; category_id: string | null; in_stock: boolean; description: string | null }>;
  cats: Array<{ id: string; name: string }>;
  onEdit: (p: Product & { id: string }) => void;
  onNew: () => void;
  refresh: () => void;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? "Uncategorised";

  const visible = data.filter((p) => {
    if (filter !== "all" && p.category_id !== filter) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  // Group by category for a category-wise view
  const groups = new Map<string, typeof visible>();
  for (const p of visible) {
    const key = catName(p.category_id);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Products ({data.length})</h2>
        <button className={btn} onClick={onNew}>Add product</button>
      </div>
      <input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} className={input + " mb-3"} />
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={`rounded-full border px-3 py-1 text-xs ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-card"}`}>All ({data.length})</button>
        {cats.map((c) => {
          const n = data.filter((p) => p.category_id === c.id).length;
          if (!n) return null;
          return <button key={c.id} onClick={() => setFilter(c.id)} className={`rounded-full border px-3 py-1 text-xs ${filter === c.id ? "bg-primary text-primary-foreground" : "bg-card"}`}>{c.name} ({n})</button>;
        })}
      </div>
      {[...groups.entries()].map(([cat, items]) => (
        <div key={cat} className="mb-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat} ({items.length})</h3>
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-2 text-sm">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
                <div className="flex-1"><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{formatPKR(Number(p.price))}{!p.in_stock && " · sold out"}</p></div>
                <button className="underline" onClick={() => onEdit(p as Product & { id: string })}>Edit</button>
                <button className="text-destructive underline" onClick={async () => {
                  if (confirm("Delete this product?")) { await supabase.from("products").delete().eq("id", p.id); refresh(); }
                }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {!visible.length && <p className="text-muted-foreground">No products match this filter.</p>}
    </div>
  );
}

const VENDOR_STATUSES = ["pending", "paid", "approved", "rejected"];

function Companies() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => (await supabase.from("vendor_registrations").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: cfg } = useQuery({
    queryKey: ["vendor-cfg"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("key,value").in("key", ["vendor_fee", "vendor_payment_info", "vendor_bank_details", "vendor_mobile_details"]);
      return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
    },
  });
  const [fee, setFee] = useState("");
  const [info, setInfo] = useState("");
  const [bank, setBank] = useState("");
  const [mobile, setMobile] = useState("");
  useEffect(() => { if (cfg) { setFee(cfg["vendor_fee"] ?? ""); setInfo(cfg["vendor_payment_info"] ?? ""); setBank(cfg["vendor_bank_details"] ?? ""); setMobile(cfg["vendor_mobile_details"] ?? ""); } }, [cfg]);
  const save = async () => {
    const { error } = await supabase.from("store_settings").upsert([
      { key: "vendor_fee", value: fee }, { key: "vendor_payment_info", value: info },
      { key: "vendor_bank_details", value: bank }, { key: "vendor_mobile_details", value: mobile },
    ]);
    if (error) toast.error(error.message); else { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["vendor-cfg"] }); }
  };
  const paidTotal = data.filter((v) => v.status !== "pending" && v.status !== "rejected").reduce((s, v) => s + Number(v.fee_amount), 0);
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4 text-sm space-y-2">
        <h3 className="font-semibold">Registration fee & payment settings</h3>
        <label className="block">Fee (PKR)<input value={fee} onChange={(e) => setFee(e.target.value)} type="number" min="0" className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label>
        <label className="block">Bank account details (bank name, account title, IBAN / account no.)<textarea value={bank} onChange={(e) => setBank(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label>
        <label className="block">JazzCash / Easypaisa details (account name, mobile number)<textarea value={mobile} onChange={(e) => setMobile(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label>
        <label className="block">Extra payment instructions (optional)<textarea value={info} onChange={(e) => setInfo(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-background px-3 py-2" /></label>
        <div className="flex items-center justify-between">
          <button onClick={save} className={btn}>Save</button>
          <Link to="/register" className="underline">Open registration page</Link>
        </div>
      </div>
      <div>
        <h2 className="mb-1 text-xl font-semibold">Companies ({data.length})</h2>
        <p className="mb-3 text-sm text-muted-foreground">Fees collected: {formatPKR(paidTotal)}</p>
        <div className="space-y-3">
          {data.map((v) => (
            <div key={v.id} className="rounded-xl border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{v.company_name}</p>
                  <p>{v.contact_name} · {v.phone} · {v.email}</p>
                  {v.city && <p className="text-muted-foreground">{v.city}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p>
                </div>
                <select value={v.status} className="rounded-lg border bg-background px-2 py-1"
                  onChange={async (e) => {
                    const { error } = await supabase.from("vendor_registrations").update({ status: e.target.value }).eq("id", v.id);
                    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["vendors"] });
                  }}>
                  {VENDOR_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              {v.products_info && <p className="mt-2 text-muted-foreground">Products: {v.products_info}</p>}
              <p className="mt-2 border-t pt-2">Fee {formatPKR(Number(v.fee_amount))} · {v.payment_method} · Ref: <span className="font-mono">{v.payment_reference}</span></p>
            </div>
          ))}
          {!data.length && <p className="text-muted-foreground">No registrations yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Settings() {
  const qc = useQueryClient();
  const logo = useStoreLogo();
  const [busy, setBusy] = useState(false);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const dataUrl = await resizeImage(f, 256);
    const { error } = await supabase.from("store_settings").upsert({ key: "logo_url", value: dataUrl });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Logo updated");
    qc.invalidateQueries({ queryKey: ["store-logo"] });
  }

  async function removeLogo() {
    const { error } = await supabase.from("store_settings").upsert({ key: "logo_url", value: "" });
    if (error) { toast.error(error.message); return; }
    toast.success("Logo removed");
    qc.invalidateQueries({ queryKey: ["store-logo"] });
  }

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-xl font-semibold">Store logo</h2>
      <p className="text-sm text-muted-foreground">This logo shows at the top of the storefront. A square image works best.</p>
      <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
          {logo ? <img src={logo} alt="Store logo" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}
        </div>
        <div className="space-y-2">
          <input type="file" accept="image/*" disabled={busy} className="text-sm" onChange={upload} />
          {logo && <button onClick={removeLogo} className="text-sm text-destructive underline">Remove logo</button>}
        </div>
      </div>
      {busy && <p className="text-sm text-muted-foreground">Uploading…</p>}
    </div>
  );
}
