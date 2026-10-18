CREATE OR REPLACE FUNCTION public.company_orders(_vendor_id uuid)
RETURNS TABLE (id uuid, created_at timestamptz, customer_name text, status text, payment_status text, items jsonb, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.id, o.created_at, o.customer_name, o.status, o.payment_status,
    owned.items, owned.total
  FROM public.orders o
  CROSS JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', item->>'name', 'qty', (item->>'qty')::numeric, 'price', (item->>'price')::numeric, 'image_url', p.image_url)) AS items,
      sum((item->>'qty')::numeric * (item->>'price')::numeric) AS total
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(o.items) = 'array' THEN o.items ELSE '[]'::jsonb END) item
    JOIN public.products p ON p.id::text = item->>'id'
    JOIN public.vendor_registrations v ON v.id = p.vendor_id
    WHERE v.id = _vendor_id AND v.user_id = auth.uid()
  ) owned
  WHERE auth.uid() IS NOT NULL AND owned.items IS NOT NULL
  ORDER BY o.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.company_orders(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_orders(uuid) TO authenticated;
COMMENT ON FUNCTION public.company_orders(uuid) IS 'Read only order projection for the owning company; excludes other sellers items, full order totals, addresses, phones and emails.';