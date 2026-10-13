import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { generateDescription } from "@/lib/ai.functions";
import { formatPKR, ordersToCsv, resizeImage, type CartItem } from "@/lib/store";

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
  const [tab, setTab] = useState<"orders" | "products" | "categories" | "settings">("orders");
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
        <div className="mb-6 flex gap-2">
          {(["orders", "products", "categories", "settings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground" : "bg-card"}`}>{t}</button>
          ))}
        </div>
        {tab === "orders" ? <Orders /> : tab === "products" ? <Products /> : tab === "categories" ? <Categories /> : <Settings />}
      </div>
    </div>
  );
}

const STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

function Orders() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
  });
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

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Products ({data.length})</h2>
        <button className={btn} onClick={() => setEditing({ name: "", description: "", price: 0, image_url: null, category_id: cats[0]?.id ?? null, in_stock: true })}>Add product</button>
      </div>
      <div className="space-y-2">
        {data.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-2 text-sm">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
            <div className="flex-1"><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{formatPKR(Number(p.price))}{!p.in_stock && " · sold out"}</p></div>
            <button className="underline" onClick={() => setEditing({ ...p, price: Number(p.price) })}>Edit</button>
            <button className="text-destructive underline" onClick={async () => {
              if (confirm("Delete this product?")) { await supabase.from("products").delete().eq("id", p.id); refresh(); }
            }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
