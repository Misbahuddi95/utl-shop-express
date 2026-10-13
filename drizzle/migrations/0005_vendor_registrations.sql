CREATE TABLE public.vendor_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text,
  products_info text,
  fee_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  payment_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.vendor_registrations TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.vendor_registrations TO authenticated;
GRANT ALL ON public.vendor_registrations TO service_role;
ALTER TABLE public.vendor_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can register" ON public.vendor_registrations FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' AND length(company_name) BETWEEN 1 AND 200 AND length(contact_name) BETWEEN 1 AND 200 AND length(email) BETWEEN 3 AND 255 AND length(phone) BETWEEN 5 AND 30 AND length(payment_reference) BETWEEN 3 AND 100);
CREATE POLICY "admin read vendors" ON public.vendor_registrations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update vendors" ON public.vendor_registrations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete vendors" ON public.vendor_registrations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.store_settings(key, value) VALUES ('vendor_fee','5000'), ('vendor_payment_info','JazzCash / Bank transfer: account details admin se poochein') ON CONFLICT (key) DO NOTHING;