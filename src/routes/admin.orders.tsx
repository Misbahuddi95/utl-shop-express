import { createFileRoute, Link } from "@tanstack/react-router";
import { Orders } from "@/components/store/orders";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [
    { title: "Customer orders & payments — UTL Admin" },
    { name: "description", content: "Track UTL customer orders, item quantities, totals and payment status." },
    { property: "og:title", content: "Customer orders & payments — UTL Admin" },
    { property: "og:description", content: "Manage UTL orders and record received payments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <main className="mx-auto max-w-5xl px-4 py-6"><Link to="/admin" className="mb-5 inline-block underline">UTL Admin</Link><Orders /></main>,
});