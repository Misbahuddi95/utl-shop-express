import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = { name: string; details: string; category: string; price: number };

export const generateDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => ({
    name: String(d.name ?? "").slice(0, 200),
    details: String(d.details ?? "").slice(0, 2000),
    category: String(d.category ?? "").slice(0, 100),
    price: Number(d.price) || 0,
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { error: "Only admins can use this." };
    if (!data.name.trim()) return { error: "Please enter a product name first." };

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { error: "AI is not configured." };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You write product descriptions for UTL, an online store in Pakistan. Write a clear, attractive description for customers in simple English: 2-3 short sentences (max ~60 words), highlighting benefits. No headings, no emojis, no price, no made-up specifications beyond what is given. Return only the description text.",
        input: `Product: ${data.name}\nCategory: ${data.category || "-"}\nDetails from seller: ${data.details || "-"}`,
      }),
    });
    if (!res.ok || !res.body) {
      if (res.status === 429) return { error: "Too many requests. Please try again in a minute." };
      if (res.status === 402) return { error: "AI credits have run out. Please add credits to continue." };
      return { error: `AI request failed (${res.status}).` };
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "response.failed" || ev.type === "error") return { error: "AI could not write a description." };
        } catch {
          /* partial line */
        }
      }
    }
    text = text.trim();
    return text ? { text } : { error: "AI returned no text. Please try again." };
  });
