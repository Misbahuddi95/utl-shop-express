DROP POLICY IF EXISTS "public read settings" ON public.store_settings;
CREATE POLICY "admin read settings" ON public.store_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.store_settings FROM anon;
REVOKE ALL ON public.orders FROM anon;
GRANT INSERT ON public.orders TO anon;
REVOKE ALL ON public.vendor_registrations FROM anon;
GRANT INSERT ON public.vendor_registrations TO anon;
REVOKE ALL ON public.user_roles FROM anon;

CREATE OR REPLACE FUNCTION public.get_public_settings()
RETURNS TABLE(key text, value text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.key, s.value FROM public.store_settings s
  WHERE s.key IN ('logo_url','vendor_fee')
     OR (auth.uid() IS NOT NULL AND s.key IN ('vendor_payment_info','vendor_bank_details','vendor_mobile_details'));
$$;
REVOKE ALL ON FUNCTION public.get_public_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_settings() TO anon, authenticated;