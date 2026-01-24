-- Melhorar trigger handle_new_customer para dar erro claro em caso de duplicatas
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar customer se tiver phone no metadata (clientes reais)
  -- OU se tiver name no metadata (novos cadastros via formulário)
  IF ((NEW.raw_user_meta_data->>'phone') IS NOT NULL AND (NEW.raw_user_meta_data->>'phone') != '')
     OR ((NEW.raw_user_meta_data->>'name') IS NOT NULL AND (NEW.raw_user_meta_data->>'name') != '') THEN
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE user_id = NEW.id) THEN
      BEGIN
        INSERT INTO public.customers (user_id, email, name, phone)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(
            NEW.raw_user_meta_data->>'name', 
            COALESCE(NEW.raw_user_meta_data->>'full_name', '')
          ),
          COALESCE(NEW.raw_user_meta_data->>'phone', '')
        );
      EXCEPTION
        WHEN unique_violation THEN
          -- Capturar erro de telefone duplicado
          IF SQLERRM LIKE '%customers_phone_key%' THEN
            RAISE EXCEPTION 'Phone number already registered';
          ELSIF SQLERRM LIKE '%customers_email_key%' THEN
            RAISE EXCEPTION 'Email already registered';
          ELSE
            RAISE;
          END IF;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;