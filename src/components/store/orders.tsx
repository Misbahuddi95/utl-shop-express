import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPKR, ordersToCsv, type CartItem } from "@/lib/store";
import { PAYMENT_STATUSES } from "@/lib/company-rules";
import { Button } from "@/components/ui/button";
const STATUSES = ["pending", "confirmed", "shipped", "delivered", "completed", "cancelled"];

export function Orders() {
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
        <Button onClick={exportCsv} disabled={!data.length}>Export CSV</Button>
      </div>
      <div className="space-y-3">
        {data.map((o) => (
          <div key={o.id} className="rounded-xl border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{o.customer_name} · {o.phone}</p>
                <p className="text-muted-foreground">{o.address}</p><p className="break-all text-muted-foreground">{o.customer_email}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <label className="grid gap-1">Order status<select aria-label={`Order status for ${o.customer_name}`} value={o.status} className="rounded-lg border bg-background px-2 py-1"
                onChange={async (e) => {
                  const { error } = await supabase.from("orders").update({ status: e.target.value }).eq("id", o.id);
                  if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["orders"] });
                }}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select></label>
              <label className="grid gap-1">Payment status<select aria-label={`Payment status for ${o.customer_name}`} value={o.payment_status} className="rounded-lg border bg-background px-2 py-1" onChange={async (e) => { const { error } = await supabase.from("orders").update({ payment_status: e.target.value }).eq("id", o.id); if (error) toast.error("Payment status could not be saved"); else { toast.success("Payment status updated"); qc.invalidateQueries({ queryKey: ["orders"] }); } }}>{PAYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
            </div>
            <ul className="mt-2 border-t pt-2">
              {(o.items as unknown as CartItem[]).map((i) => <li key={i.id}>{i.name} × {i.qty} — {formatPKR(i.price * i.qty)}</li>)}
            </ul>
            {o.notes && <p className="mt-1 italic text-muted-foreground">Note: {o.notes}</p>}
            <p className="mt-2 text-muted-foreground">Quantity: {(o.items as unknown as CartItem[]).reduce((sum, item) => sum + item.qty, 0)}</p><p className="mt-2 font-bold">Total: {formatPKR(Number(o.total))}</p>
          </div>
        ))}
        {!data.length && <p className="text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}

