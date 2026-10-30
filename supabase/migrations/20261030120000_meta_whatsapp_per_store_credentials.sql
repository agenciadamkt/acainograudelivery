-- Store each franchisee's own Meta authorization encrypted at rest.
-- Existing connection rows remain untouched; they can be reauthorized later.
CREATE TABLE IF NOT EXISTS public.whatsapp_connection_secrets (
  connection_id uuid PRIMARY KEY
    REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  access_token_ciphertext text NOT NULL,
  access_token_iv text NOT NULL,
  token_expires_at timestamptz,
  data_access_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_connection_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_connection_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.whatsapp_connection_secrets TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_meta_whatsapp_connection_with_secret(
  p_store_id uuid,
  p_waba_id text,
  p_phone_number_id text,
  p_display_phone_number text,
  p_verified_name text,
  p_quality_rating text,
  p_access_token_ciphertext text,
  p_access_token_iv text,
  p_token_expires_at timestamptz,
  p_data_access_expires_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_connection_id uuid;
BEGIN
  IF p_store_id IS NULL OR p_waba_id IS NULL OR p_phone_number_id IS NULL
     OR p_access_token_ciphertext IS NULL OR p_access_token_iv IS NULL THEN
    RAISE EXCEPTION 'invalid_meta_connection';
  END IF;

  INSERT INTO public.whatsapp_connections (
    store_id, provider, status, waba_id, phone_number_id,
    display_phone_number, verified_name, quality_rating
  ) VALUES (
    p_store_id, 'meta_cloud', 'active', p_waba_id, p_phone_number_id,
    p_display_phone_number, p_verified_name, p_quality_rating
  )
  ON CONFLICT (store_id, provider) WHERE store_id IS NOT NULL
  DO UPDATE SET
    status = 'active',
    waba_id = EXCLUDED.waba_id,
    phone_number_id = EXCLUDED.phone_number_id,
    display_phone_number = EXCLUDED.display_phone_number,
    verified_name = EXCLUDED.verified_name,
    quality_rating = EXCLUDED.quality_rating
  RETURNING id INTO v_connection_id;

  INSERT INTO public.whatsapp_connection_secrets (
    connection_id, access_token_ciphertext, access_token_iv,
    token_expires_at, data_access_expires_at, updated_at
  ) VALUES (
    v_connection_id, p_access_token_ciphertext, p_access_token_iv,
    p_token_expires_at, p_data_access_expires_at, now()
  )
  ON CONFLICT (connection_id) DO UPDATE SET
    access_token_ciphertext = EXCLUDED.access_token_ciphertext,
    access_token_iv = EXCLUDED.access_token_iv,
    token_expires_at = EXCLUDED.token_expires_at,
    data_access_expires_at = EXCLUDED.data_access_expires_at,
    updated_at = now();

  RETURN v_connection_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_meta_whatsapp_connection_with_secret(
  uuid, text, text, text, text, text, text, text, timestamptz, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_meta_whatsapp_connection_with_secret(
  uuid, text, text, text, text, text, text, text, timestamptz, timestamptz
) TO service_role;
