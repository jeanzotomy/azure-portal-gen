ALTER TABLE public.service_invoices
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sent_channels text[] NOT NULL DEFAULT '{}'::text[];

-- Storage policies for invoice PDFs (private bucket)
CREATE POLICY "Staff can read invoice documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoice-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'comptable'::app_role)
    OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
    OR public.has_role(auth.uid(), 'agent'::app_role)
  )
);

CREATE POLICY "Staff can upload invoice documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'invoice-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'comptable'::app_role)
    OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
    OR public.has_role(auth.uid(), 'agent'::app_role)
  )
);

CREATE POLICY "Staff can update invoice documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'invoice-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'comptable'::app_role)
    OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
    OR public.has_role(auth.uid(), 'agent'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'invoice-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'comptable'::app_role)
    OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
    OR public.has_role(auth.uid(), 'agent'::app_role)
  )
);

CREATE POLICY "Staff can delete invoice documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'invoice-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'comptable'::app_role)
    OR public.has_role(auth.uid(), 'gestionnaire'::app_role)
    OR public.has_role(auth.uid(), 'agent'::app_role)
  )
);