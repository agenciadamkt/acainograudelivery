-- Cria a função para confirmar o e-mail de um usuário automaticamente e sem envio de e-mail.
-- SECURITY DEFINER permite que a função rode com privilégios de administrador (bypassa RLS de auth.users).

CREATE OR REPLACE FUNCTION public.confirm_user_email(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza a data de confirmação para a data atual, destravando o login na hora
  UPDATE auth.users 
  SET email_confirmed_at = now() 
  WHERE email = user_email;
END;
$$;
