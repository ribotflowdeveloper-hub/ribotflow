

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."audio_job_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


ALTER TYPE "public"."audio_job_status" OWNER TO "postgres";


CREATE TYPE "public"."expense_status" AS ENUM (
    'pending',
    'paid',
    'overdue',
    'cancelled'
);


ALTER TYPE "public"."expense_status" OWNER TO "postgres";


CREATE TYPE "public"."invoice_status" AS ENUM (
    'Draft',
    'Sent',
    'Paid',
    'Overdue',
    'Cancelled'
);


ALTER TYPE "public"."invoice_status" OWNER TO "postgres";


CREATE TYPE "public"."job_status" AS ENUM (
    'open',
    'closed'
);


ALTER TYPE "public"."job_status" OWNER TO "postgres";


CREATE TYPE "public"."opportunity_stage" AS ENUM (
    'Nou Lead',
    'Contactat',
    'Proposta Enviada',
    'Negociació',
    'Guanyat',
    'Perdut'
);


ALTER TYPE "public"."opportunity_stage" OWNER TO "postgres";


CREATE TYPE "public"."quote_status" AS ENUM (
    'Draft',
    'Sent',
    'Accepted',
    'Declined',
    'Invoiced'
);


ALTER TYPE "public"."quote_status" OWNER TO "postgres";


CREATE TYPE "public"."task_priority" AS ENUM (
    'Baixa',
    'Mitjana',
    'Alta'
);


ALTER TYPE "public"."task_priority" OWNER TO "postgres";


CREATE TYPE "public"."ticket_filter" AS ENUM (
    'tots',
    'rebuts',
    'enviats',
    'noLlegits'
);


ALTER TYPE "public"."ticket_filter" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status" AS ENUM (
    'Obert',
    'En progrés',
    'Esperant resposta',
    'Tancat',
    'Llegit'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."ticket_type" AS ENUM (
    'rebut',
    'enviat'
);


ALTER TYPE "public"."ticket_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_invitation"("invitation_token" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  invitation_record RECORD;
  current_user_id UUID := auth.uid();
  current_user_email TEXT;
BEGIN
  -- Obtenir dades de l'usuari actual
  SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;

  -- 1. Trobar la invitació i bloquejar la fila
  SELECT * INTO invitation_record FROM public.invitations
  WHERE token = invitation_token FOR UPDATE;

  -- 2. Validar
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitació invàlida o caducada';
  END IF;

  IF invitation_record.email <> current_user_email THEN
    RAISE EXCEPTION 'Aquesta invitació està destinada a un altre usuari';
  END IF;

  -- 3. Inserir el nou membre
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (invitation_record.team_id, current_user_id, invitation_record.role)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  -- 4. Esborrar la invitació
  DELETE FROM public.invitations WHERE id = invitation_record.id;
END;
$$;


ALTER FUNCTION "public"."accept_invitation"("invitation_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_invitation_and_set_active_team"("invite_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  invitation_data record;
  subscription_data record;
  user_metadata jsonb;
  requesting_user_id uuid := auth.uid();
  requesting_user_email text := auth.jwt()->>'email';
begin
  -- 1. Validar la invitació
  select * into invitation_data from public.invitations
  where token = invite_token and status = 'pending';

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;
  
  if invitation_data.email is not null and invitation_data.email != requesting_user_email then
      raise exception 'INVITATION_FOR_DIFFERENT_USER';
  end if;

  -- 2. Afegir l'usuari a l'equip
  insert into public.team_members (team_id, user_id, role)
  values (invitation_data.team_id, requesting_user_id, invitation_data.role)
  on conflict (team_id, user_id) do nothing;

  -- 3. Obtenir el pla de l'equip
  select plan_id, status into subscription_data from public.subscriptions
  where team_id = invitation_data.team_id;
  
  -- 4. Actualitzar les metadades (el token) de l'usuari
  select raw_app_meta_data from auth.users where id = requesting_user_id into user_metadata;
  
  update auth.users set raw_app_meta_data = user_metadata || jsonb_build_object(
      'active_team_id', invitation_data.team_id,
      
      -- ✅ BUG CRÍTIC ARREGLAT (El que trencava la RLS de 'subscriptions')
      'active_team_role', invitation_data.role, 
      
      'active_team_plan', case when subscription_data.status = 'active' then subscription_data.plan_id else 'free' end
  ) where id = requesting_user_id;

  -- 5. Esborrar la invitació
  delete from public.invitations where id = invitation_data.id;

  return json_build_object('success', true, 'team_id', invitation_data.team_id)::jsonb;
end;
$$;


ALTER FUNCTION "public"."accept_invitation_and_set_active_team"("invite_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_personal_invitation"("invitation_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  invitation_data RECORD;
  subscription_data RECORD;
  user_metadata JSONB;
  requesting_user_id UUID := auth.uid();
BEGIN
  -- 1️⃣ Validem que la invitació existeixi i pertanyi a l'usuari actual
  SELECT *
  INTO invitation_data
  FROM public.invitations
  WHERE id = invitation_id
    AND user_id = requesting_user_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_INVITATION';
  END IF;

  -- 2️⃣ Afegim l'usuari a l'equip (si ja hi és, no passa res)
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (invitation_data.team_id, requesting_user_id, invitation_data.role)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  -- 3️⃣ Obtenim el pla de l'equip (si n'hi ha)
  SELECT plan_id, status
  INTO subscription_data
  FROM public.subscriptions
  WHERE team_id = invitation_data.team_id
  LIMIT 1;

  -- 4️⃣ Actualitzem les metadades de l'usuari a `auth.users`
  SELECT raw_app_meta_data
  INTO user_metadata
  FROM auth.users
  WHERE id = requesting_user_id;

  UPDATE auth.users
  SET raw_app_meta_data = user_metadata || jsonb_build_object(
    'active_team_id', invitation_data.team_id,
    'active_team_plan',
      CASE
        WHEN subscription_data.status = 'active' THEN subscription_data.plan_id
        ELSE 'free'
      END
  )
  WHERE id = requesting_user_id;

  -- 5️⃣ Eliminem la invitació (ja acceptada)
  DELETE FROM public.invitations
  WHERE id = invitation_data.id;

  RETURN json_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."accept_personal_invitation"("invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_quote_and_create_invoice"("p_secure_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE 
  v_quote public.quotes%ROWTYPE;
  v_new_invoice_id BIGINT;
  v_target_stage_id BIGINT;
BEGIN
  -- 1️⃣ Actualitzar el pressupost
  UPDATE public.quotes
  SET status = 'Accepted'
  WHERE secure_id = p_secure_id
  RETURNING * INTO v_quote;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRESSUPOST_NO_TROBAT';
  END IF;

  -- 2️⃣ Actualitzar l’oportunitat (etapa guanyada)
  IF v_quote.opportunity_id IS NOT NULL THEN
    BEGIN
      SELECT ps_target.id
      INTO v_target_stage_id
      FROM public.opportunities o
      JOIN public.pipeline_stages ps_current 
        ON o.pipeline_stage_id = ps_current.id
      JOIN public.pipeline_stages ps_target 
        ON ps_current.pipeline_id = ps_target.pipeline_id
      WHERE o.id = v_quote.opportunity_id
        AND ps_target.stage_type = 'WON'
      LIMIT 1;

      IF v_target_stage_id IS NOT NULL THEN
        UPDATE public.opportunities
        SET pipeline_stage_id = v_target_stage_id
        WHERE id = v_quote.opportunity_id;
      END IF;

    EXCEPTION 
      WHEN NO_DATA_FOUND THEN 
        -- Si no trobem etapa, ignorem.
        NULL;
    END;
  END IF;

  -- 3️⃣ Crear la factura associada
  INSERT INTO public.invoices (
    user_id, team_id, contact_id, quote_id, status, 
    total_amount, subtotal, tax_amount, discount_amount,
    issue_date, due_date
  ) VALUES (
    v_quote.user_id, v_quote.team_id, v_quote.contact_id, v_quote.id, 'Draft',
    v_quote.total, v_quote.subtotal, v_quote.tax, v_quote.discount,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days'
  )
  RETURNING id INTO v_new_invoice_id;

  -- 4️⃣ Copiar els ítems del pressupost
  INSERT INTO public.invoice_items (
    invoice_id, product_id, description, quantity, unit_price, 
    tax_rate, total, user_id, team_id
  )
  SELECT
    v_new_invoice_id,
    qi.product_id,
    qi.description,
    qi.quantity,
    qi.unit_price,
    COALESCE(p.iva, 0) AS tax_rate,
    qi.total,
    v_quote.user_id,
    v_quote.team_id
  FROM public.quote_items qi
  LEFT JOIN public.products p ON qi.product_id = p.id
  WHERE qi.quote_id = v_quote.id;

END;
$$;


ALTER FUNCTION "public"."accept_quote_and_create_invoice"("p_secure_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_ticket"("ticket_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    ("auth"."uid"() = ticket_user_id) OR 
    (EXISTS (
      SELECT 1
      FROM "public"."inbox_permissions"
      WHERE 
        ("inbox_permissions"."grantee_user_id" = "auth"."uid"()) AND 
        ("inbox_permissions"."target_user_id" = ticket_user_id)
    ))
$$;


ALTER FUNCTION "public"."can_access_ticket"("ticket_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_new_organization"("org_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_org_id UUID;
  current_user_id UUID := auth.uid();
BEGIN
  -- ✅ 1. Crear la nova organització
  INSERT INTO public.organizations (name, owner_id)
  VALUES (org_name, current_user_id)
  RETURNING id INTO new_org_id;

  -- ✅ 2. Afegir el creador com a "owner" a la taula de membres
  INSERT INTO public.members (organization_id, user_id, role)
  VALUES (new_org_id, current_user_id, 'owner');

  -- ✅ 3. Retornar l'ID de la nova organització
  RETURN new_org_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en create_new_organization per usuari %: %', current_user_id, SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_new_organization"("org_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_opportunity_on_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_target_stage_id BIGINT;
  v_default_pipeline_id BIGINT;
  v_contact_name TEXT;
BEGIN
  -- ✅ Només crear oportunitat si és un correu enviat i no n’hi ha cap “en curs”
  IF NEW.type = 'enviat' AND NOT EXISTS (
    SELECT 1
    FROM public.opportunities o
    JOIN public.pipeline_stages ps ON o.pipeline_stage_id = ps.id
    WHERE o.contact_id = NEW.contact_id
      AND ps.stage_type IS NULL  -- NULL = etapa “en curs”
  ) THEN

    -- ✅ 1. Trobar el pipeline per defecte
    SELECT t.default_pipeline_id
    INTO v_default_pipeline_id
    FROM public.teams t
    WHERE t.id = NEW.team_id;

    IF v_default_pipeline_id IS NULL THEN
      RETURN NEW; -- sense pipeline, no fem res
    END IF;

    -- ✅ 2. Trobar l’etapa “CONTACTED” dins el pipeline
    SELECT id
    INTO v_target_stage_id
    FROM public.pipeline_stages
    WHERE pipeline_id = v_default_pipeline_id
      AND stage_type = 'CONTACTED'
    LIMIT 1;

    -- ✅ 3. Si la trobem, crear una nova oportunitat
    IF v_target_stage_id IS NOT NULL THEN
      SELECT nom INTO v_contact_name
      FROM public.contacts
      WHERE id = NEW.contact_id;

      INSERT INTO public.opportunities (
        user_id,
        team_id,
        contact_id,
        name,
        value,
        pipeline_stage_id,
        source
      )
      VALUES (
        NEW.user_id,
        NEW.team_id,
        NEW.contact_id,
        'Oportunitat per ' || COALESCE(v_contact_name, 'Contacte'),
        0,
        v_target_stage_id,
        'Email Sortint'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_opportunity_on_reply"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_public_profile_for_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name' -- Intenta agafar el nom del registre
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."create_public_profile_for_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_team_with_defaults"("team_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_team_id UUID;
  requesting_user_id UUID := auth.uid();
BEGIN
  -- 1️⃣ Crear el nou equip
  INSERT INTO public.teams (name, owner_id)
  VALUES (team_name, requesting_user_id)
  RETURNING id INTO new_team_id;

  -- 2️⃣ Afegir el propietari com a membre
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, requesting_user_id, 'owner');

  -- 3️⃣ Afegir etapes del pipeline per defecte
  INSERT INTO public.pipeline_stages (name, position, team_id, user_id)
  VALUES
    ('Prospecte', 1, new_team_id, requesting_user_id),
    ('Contactat', 2, new_team_id, requesting_user_id),
    ('Proposta Enviada', 3, new_team_id, requesting_user_id),
    ('Negociació', 4, new_team_id, requesting_user_id),
    ('Guanyat', 5, new_team_id, requesting_user_id),
    ('Perdut', 6, new_team_id, requesting_user_id);

  -- 4️⃣ Retornar l'ID de l'equip
  RETURN new_team_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en crear l''equip per a l''usuari %: %', requesting_user_id, SQLERRM;
END;
$$;


ALTER FUNCTION "public"."create_team_with_defaults"("team_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_credential"("provider_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    DELETE FROM public.user_credentials
    WHERE user_id = auth.uid()
      AND provider = provider_name;
END;
$$;


ALTER FUNCTION "public"."delete_user_credential"("provider_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_team_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'active_team_id',
      '00000000-0000-0000-0000-000000000000' -- Un UUID nul per defecte
    )::uuid
$$;


ALTER FUNCTION "public"."get_active_team_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_team_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'active_team_role',
      'member' -- Valor per defecte segur
    )::text
$$;


ALTER FUNCTION "public"."get_active_team_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_column_valid_values"("p_ref_table_name" "text") RETURNS TABLE("value" "text")
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Exemple: Si és la taula 'customers', retorna els noms (assumint que el camp es diu 'name')
    IF p_ref_table_name = 'customer' THEN
        RETURN QUERY 
        EXECUTE format('SELECT DISTINCT name::text FROM public.%I ORDER BY 1', p_ref_table_name);
    
    -- Pots afegir més lògica aquí per altres taules/camps.

    ELSE
        -- Per defecte o si és un camp simple, no retorna res
        RETURN; 
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_column_valid_values"("p_ref_table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_crm_dashboard_data"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    active_team_id UUID;
    result json;
BEGIN
    active_team_id := public.get_active_team_id();

    IF active_team_id IS NULL THEN
        RETURN '{}'::json;
    END IF;

    SELECT json_build_object(
        'stats', (
            SELECT json_build_object(
                'totalContacts', COUNT(*),
                'newContactsThisMonth', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())),
                'opportunities', (
                    SELECT COUNT(*) 
                    FROM public.opportunities 
                    WHERE team_id = active_team_id AND stage_name NOT IN ('Guanyat', 'Perdut')
                ),
                'pipelineValue', (
                    SELECT COALESCE(SUM(value), 0) 
                    FROM public.opportunities 
                    WHERE team_id = active_team_id AND stage_name NOT IN ('Guanyat', 'Perdut')
                ),
                'avgRevenuePerClient', (
                    SELECT AVG(total_invoiced)
                    FROM (
                        SELECT SUM(total_amount) AS total_invoiced
                        FROM public.invoices 
                        WHERE team_id = active_team_id
                        GROUP BY contact_id
                    ) AS client_totals
                ),
                'avgConversionTimeDays', (
                    SELECT AVG(EXTRACT(DAY FROM (last_updated_at - created_at)))
                    FROM public.opportunities 
                    WHERE team_id = active_team_id AND stage_name = 'Guanyat'
                )
            )
            FROM public.contacts 
            WHERE team_id = active_team_id
        ),
        'funnel', (
            SELECT json_build_object(
                'leads', COUNT(*) FILTER (WHERE estat = 'Lead'),
                'quoted', (
                    SELECT COUNT(DISTINCT contact_id) 
                    FROM public.quotes 
                    WHERE team_id = active_team_id
                ),
                'clients', (
                    SELECT COUNT(DISTINCT contact_id) 
                    FROM public.invoices 
                    WHERE team_id = active_team_id
                )
            )
            FROM public.contacts 
            WHERE team_id = active_team_id
        ),
        'topClients', COALESCE((
            SELECT json_agg(c.* ORDER BY c.total_invoiced DESC)
            FROM (
                SELECT 
                    ct.id, 
                    ct.nom, 
                    SUM(i.total_amount) AS total_invoiced
                FROM public.invoices i
                JOIN public.contacts ct ON i.contact_id = ct.id
                WHERE i.team_id = active_team_id
                GROUP BY ct.id, ct.nom
                ORDER BY total_invoiced DESC
                LIMIT 5
            ) AS c
        ), '[]'::json),
        'coldContacts', COALESCE((
            SELECT json_agg(cc.*)
            FROM (
                SELECT id, nom, last_interaction_at
                FROM public.contacts
                WHERE team_id = active_team_id 
                  AND last_interaction_at < (now() - interval '30 days')
                ORDER BY last_interaction_at ASC
                LIMIT 5
            ) AS cc
        ), '[]'::json),
        'unreadActivities', COALESCE((
            SELECT json_agg(ua.*)
            FROM (
                SELECT 
                    a.id, a.content, a.created_at, a.contact_id, 
                    c.nom AS contact_name, c.email AS contact_email
                FROM public.activities a
                JOIN public.contacts c ON a.contact_id = c.id
                WHERE a.team_id = active_team_id 
                  AND a.is_read = false
                ORDER BY a.created_at DESC
                LIMIT 5
            ) AS ua
        ), '[]'::json),
        'bestMonths', COALESCE((
            SELECT json_agg(bm.*)
            FROM (
                SELECT 
                    to_char(date_trunc('month', issue_date), 'YYYY-MM') AS month,
                    SUM(total_amount) AS total
                FROM public.invoices
                WHERE team_id = active_team_id
                GROUP BY month
                ORDER BY total DESC
                LIMIT 3
            ) AS bm
        ), '[]'::json)
    )
    INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_crm_dashboard_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_crm_overview"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  seven_days_ago DATE := current_date - INTERVAL '7 days';
  current_user_id UUID := auth.uid();
  result jsonb;
BEGIN
  -- ✅ Construcció de l’objecte JSON amb subconsultes segures
  SELECT jsonb_build_object(
    'totalContacts', (
      SELECT COUNT(*) FROM public.contacts WHERE user_id = current_user_id
    ),
    'activeClients', (
      SELECT COUNT(*) FROM public.contacts
      WHERE user_id = current_user_id AND estat = 'Client'
    ),
    'opportunities', (
      SELECT COUNT(*) FROM public.contacts
      WHERE user_id = current_user_id AND (estat = 'Lead' OR estat = 'Actiu') AND valor > 0
    ),
    'pipelineValue', (
      SELECT COALESCE(SUM(valor), 0)
      FROM public.contacts
      WHERE user_id = current_user_id AND (estat = 'Lead' OR estat = 'Actiu') AND valor > 0
    ),
    'activeQuotes', (
      SELECT COUNT(*) FROM public.quotes
      WHERE user_id = current_user_id AND status IN ('Sent', 'Draft')
    ),
    'attentionCount', (
      SELECT COUNT(*) FROM public.contacts
      WHERE user_id = current_user_id AND last_interaction_at < seven_days_ago
    )
  ) INTO result;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en get_crm_overview(): %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."get_crm_overview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_jwt_claims"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  claims text;
BEGIN
  -- Intentem obtenir els claims del token JWT
  claims := current_setting('request.jwt.claims', true);

  -- Log informatiu (visible als logs de Postgres)
  RAISE LOG '[DB_FUNC] get_current_jwt_claims cridada. Claims trobats: %', claims;

  RETURN claims;
END;
$$;


ALTER FUNCTION "public"."get_current_jwt_claims"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_team_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  team_id_val UUID;
BEGIN
  -- 🔍 Obté el primer equip associat a l'usuari actual
  SELECT team_id
  INTO team_id_val
  FROM public.team_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- 🔁 Retorna l'ID (pot ser NULL si no pertany a cap equip)
  RETURN team_id_val;
END;
$$;


ALTER FUNCTION "public"."get_current_team_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"() RETURNS TABLE("total_contacts" bigint, "active_clients" bigint, "opportunities" bigint, "invoiced_current_month" numeric, "invoiced_previous_month" numeric, "pending_total" numeric, "expenses_current_month" numeric, "expenses_previous_month" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_team_id uuid;
BEGIN
  -- 1. Obtenim l'equip actiu (corregit a 'profiles')
  SELECT active_team_id INTO v_team_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- Si no hi ha equip, retornem zeros per a tot
  IF v_team_id IS NULL THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Retornem les estadístiques utilitzant el team_id
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM contacts WHERE team_id = v_team_id) AS total_contacts,
    
    (SELECT COUNT(DISTINCT contact_id) FROM invoices 
     WHERE team_id = v_team_id AND status = 'Paid' AND issue_date >= (now() - interval '1 year')) AS active_clients,
     
    -- 2. Lògica d'oportunitats (corregida a 'stage_type')
    (SELECT COUNT(*) 
     FROM opportunities o
     LEFT JOIN pipeline_stages ps ON o.pipeline_stage_id = ps.id
     WHERE o.team_id = v_team_id AND (ps.stage_type IS NULL OR ps.stage_type NOT IN ('WON', 'LOST'))) AS opportunities,
     
    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices 
     WHERE team_id = v_team_id AND status = 'Paid' AND date_trunc('month', issue_date) = date_trunc('month', now())) AS invoiced_current_month,
     
    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices 
     WHERE team_id = v_team_id AND status = 'Paid' AND date_trunc('month', issue_date) = date_trunc('month', now() - interval '1 month')) AS invoiced_previous_month,

    (SELECT COALESCE(SUM(total_amount), 0) FROM invoices 
     WHERE team_id = v_team_id AND status IN ('Sent', 'Overdue', 'Draft')) AS pending_total,

    -- ✅ 3. LÒGICA CORREGIDA:
    -- Canviat 'amount' per 'total_amount'
    (SELECT COALESCE(SUM(total_amount), 0) FROM expenses 
     WHERE team_id = v_team_id AND status = 'paid' AND date_trunc('month', expense_date) = date_trunc('month', now())) AS expenses_current_month,

    -- ✅ 3. LÒGICA CORREGIDA:
    -- Canviat 'amount' per 'total_amount'
    (SELECT COALESCE(SUM(total_amount), 0) FROM expenses 
     WHERE team_id = v_team_id AND status = 'paid' AND date_trunc('month', expense_date) = date_trunc('month', now() - interval '1 month')) AS expenses_previous_month;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats_for_team"("p_team_id" "uuid") RETURNS TABLE("total_contacts" bigint, "active_clients" bigint, "opportunities" bigint, "total_value" numeric, "invoiced_current_month" numeric, "invoiced_previous_month" numeric, "pending_total" numeric, "expenses_current_month" numeric, "expenses_previous_month" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    start_of_current_month DATE;
    start_of_previous_month DATE;
BEGIN
    -- Definim inicis dels mesos actual i anterior
    start_of_current_month := date_trunc('month', current_date);
    start_of_previous_month := date_trunc('month', current_date - interval '1 month');

    RETURN QUERY
    SELECT
        -- 📊 Estadístiques bàsiques
        (SELECT COUNT(*) FROM public.contacts WHERE team_id = p_team_id) AS total_contacts,
        (SELECT COUNT(*) FROM public.contacts WHERE team_id = p_team_id AND estat = 'Client') AS active_clients,
        (SELECT COUNT(*) FROM public.opportunities WHERE team_id = p_team_id AND stage_name NOT IN ('Guanyada', 'Perduda')) AS opportunities,
        (SELECT COALESCE(SUM(value), 0) FROM public.opportunities WHERE team_id = p_team_id) AS total_value,

        -- 💰 Facturació actual i anterior
        (SELECT COALESCE(SUM(total_amount), 0)
         FROM public.invoices
         WHERE team_id = p_team_id
           AND status = 'Paid'
           AND issue_date >= start_of_current_month) AS invoiced_current_month,

        (SELECT COALESCE(SUM(total_amount), 0)
         FROM public.invoices
         WHERE team_id = p_team_id
           AND status = 'Paid'
           AND issue_date >= start_of_previous_month
           AND issue_date < start_of_current_month) AS invoiced_previous_month,

        -- ⏳ Pendents
        (SELECT COALESCE(SUM(total_amount), 0)
         FROM public.invoices
         WHERE team_id = p_team_id
           AND status IN ('Sent', 'Overdue')) AS pending_total,

        -- 💸 Despeses per mes
        (SELECT COALESCE(SUM(total_amount), 0)
         FROM public.expenses
         WHERE team_id = p_team_id
           AND expense_date >= start_of_current_month) AS expenses_current_month,

        (SELECT COALESCE(SUM(total_amount), 0)
         FROM public.expenses
         WHERE team_id = p_team_id
           AND expense_date >= start_of_previous_month
           AND expense_date < start_of_current_month) AS expenses_previous_month;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats_for_team"("p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_financial_summary"() RETURNS TABLE("facturat" numeric, "pendent" numeric, "despeses" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  WITH combined_transactions AS (
    -- 💰 Factures
    SELECT
      'invoice' AS type,
      total_amount AS amount,
      status,
      issue_date
    FROM public.invoices
    WHERE user_id = auth.uid()

    UNION ALL

    -- 💸 Despeses
    SELECT
      'expense' AS type,
      total_amount AS amount,  -- 👈 correcció: a expenses el camp s'anomena total_amount (no amount)
      NULL AS status,
      expense_date AS issue_date
    FROM public.expenses
    WHERE user_id = auth.uid()
  )
  -- 📊 Càlcul del resum financer
  SELECT
    COALESCE(SUM(CASE
      WHEN type = 'invoice'
       AND status = 'Paid'
       AND date_trunc('month', issue_date) = date_trunc('month', CURRENT_DATE)
      THEN amount ELSE 0 END), 0) AS facturat,

    COALESCE(SUM(CASE
      WHEN type = 'invoice'
       AND status IN ('Sent', 'Overdue')
      THEN amount ELSE 0 END), 0) AS pendent,

    COALESCE(SUM(CASE
      WHEN type = 'expense'
       AND date_trunc('month', issue_date) = date_trunc('month', CURRENT_DATE)
      THEN amount ELSE 0 END), 0) AS despeses;
END;
$$;


ALTER FUNCTION "public"."get_financial_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inbox_received_count"("p_visible_user_ids" "uuid"[]) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.tickets
    WHERE
      tickets.user_id = ANY(p_visible_user_ids)
      AND (tickets.type = 'rebut' OR tickets.type IS NULL)
  );
END;
$$;


ALTER FUNCTION "public"."get_inbox_received_count"("p_visible_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inbox_sent_count"("p_visible_user_ids" "uuid"[]) RETURNS bigint
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
    SELECT COUNT(*)
    FROM public.tickets
    WHERE
        tickets.user_id = ANY(p_visible_user_ids) AND
        tickets.type = 'enviat'
$$;


ALTER FUNCTION "public"."get_inbox_sent_count"("p_visible_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inbox_tickets"("p_visible_user_ids" "uuid"[], "p_search_term" "text", "p_active_filter" "text", "p_limit" integer, "p_offset" integer) RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "user_id" "uuid", "contact_id" "uuid", "provider" "text", "provider_message_id" "text", "subject" "text", "body" "text", "sender_name" "text", "sender_email" "text", "sent_at" timestamp with time zone, "status" "text", "attachments" "jsonb", "preview" "text", "type" "text", "contact_nom" "text", "contact_email" "text", "profile_full_name" "text", "profile_avatar_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        et.id,
        et.created_at,
        et.user_id,
        et.contact_id,
        et.provider,
        et.provider_message_id,
        et.subject,
        et.body,
        et.sender_name,
        et.sender_email,
        et.sent_at,
        et.status,
        et.attachments,
        et.preview,
        et.type,
        et.contact_nom,
        et.contact_email,
        et.profile_full_name,
        et.profile_avatar_url
    FROM
        public.enriched_tickets AS et
    WHERE 
        et.user_id = ANY(p_visible_user_ids)
        AND (
            p_search_term IS NULL OR p_search_term = '' OR
            et.subject ILIKE '%' || p_search_term || '%' OR
            et.sender_name ILIKE '%' || p_search_term || '%' OR
            et.sender_email ILIKE '%' || p_search_term || '%' OR
            et.preview ILIKE '%' || p_search_term || '%'
        )
        AND (
            p_active_filter = 'tots'
            OR (p_active_filter = 'rebuts' AND (et.type = 'rebut' OR et.type IS NULL))
            OR (p_active_filter = 'enviats' AND et.type = 'enviat')
            OR (p_active_filter = 'noLlegits' AND (et.type = 'rebut' OR et.type IS NULL) AND et.status <> 'Llegit')
        )
    ORDER BY et.sent_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_inbox_tickets"("p_visible_user_ids" "uuid"[], "p_search_term" "text", "p_active_filter" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_marketing_kpis"() RETURNS TABLE("total_leads" bigint, "conversion_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  start_of_current_month DATE;
  total_leads_this_month BIGINT;
  opportunities_from_leads BIGINT;
BEGIN
  -- 📅 Primer dia del mes actual
  start_of_current_month := date_trunc('month', current_date);

  -- 👥 Total de leads creats aquest mes
  SELECT COUNT(*)
  INTO total_leads_this_month
  FROM public.contacts
  WHERE user_id = auth.uid()
    AND created_at >= start_of_current_month;

  -- 🎯 Leads convertits en oportunitats o clients
  SELECT COUNT(*)
  INTO opportunities_from_leads
  FROM public.contacts
  WHERE user_id = auth.uid()
    AND created_at >= start_of_current_month
    AND (estat = 'Lead' OR estat = 'Actiu' OR estat = 'Client');

  -- 📊 Retorn dels resultats
  RETURN QUERY
  SELECT
    total_leads_this_month AS total_leads,
    CASE
      WHEN total_leads_this_month > 0
        THEN (opportunities_from_leads::NUMERIC / total_leads_this_month::NUMERIC) * 100
      ELSE 0
    END AS conversion_rate;
END;
$$;


ALTER FUNCTION "public"."get_marketing_kpis"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_marketing_page_data"("p_team_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'kpis', (
        SELECT json_build_object(
          'totalLeads', COALESCE(COUNT(*), 0),
          'conversionRate', COALESCE(
            (COUNT(*) FILTER (WHERE estat = 'Client') * 100.0 / NULLIF(COUNT(*), 0)),
            0
          )
        )
        FROM public.contacts
        WHERE team_id = p_team_id
      ),
      'campaigns', (
        SELECT COALESCE(json_agg(c), '[]'::json)
        FROM (
          SELECT
            id,
            name,
            type,
            status,
            campaign_date,
            goal,
            target_audience,
            content
          FROM public.campaigns
          WHERE team_id = p_team_id
          ORDER BY campaign_date DESC
        ) c
      )
    )
  );
END;
$$;


ALTER FUNCTION "public"."get_marketing_page_data"("p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_team_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  team_id_val uuid;
BEGIN
  SELECT team_id
  INTO team_id_val
  FROM public.team_members
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN team_id_val;
END;
$$;


ALTER FUNCTION "public"."get_my_team_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_teams"() RETURNS TABLE("team_id" "uuid")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_teams"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quote_details"("p_quote_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  quote_data JSONB;
  opportunities_data JSONB;
BEGIN
  -- ✅ 1. Obtenim les dades del pressupost i els seus items
  SELECT to_jsonb(q)
  INTO quote_data
  FROM (
    SELECT q.*, COALESCE(jsonb_agg(qi) FILTER (WHERE qi.id IS NOT NULL), '[]'::jsonb) AS items
    FROM public.quotes q
    LEFT JOIN public.quote_items qi ON q.id = qi.quote_id
    WHERE q.id = p_quote_id
    GROUP BY q.id
  ) q;

  IF quote_data IS NULL THEN
    RAISE EXCEPTION 'PRESSUPOST_NO_TROBAT per ID %', p_quote_id;
  END IF;

  -- ✅ 2. Si el pressupost té un contacte, busquem les seves oportunitats
  IF (quote_data->>'contact_id') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(o), '[]'::jsonb)
    INTO opportunities_data
    FROM public.opportunities o
    WHERE o.contact_id = (quote_data->>'contact_id')::BIGINT;
  ELSE
    opportunities_data := '[]'::jsonb;
  END IF;

  -- ✅ 3. Retornem un únic objecte JSON amb tota la informació
  RETURN jsonb_build_object(
    'quote', quote_data,
    'opportunities', opportunities_data
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error a get_quote_details(%): %', p_quote_id, SQLERRM;
END;
$$;


ALTER FUNCTION "public"."get_quote_details"("p_quote_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_table_columns"("table_name_param" "text") RETURNS TABLE("column_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT c.column_name::text
  FROM information_schema.columns c
  WHERE c.table_name = table_name_param;
END;
$$;


ALTER FUNCTION "public"."get_table_columns"("table_name_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_table_columns_excluding_security"("p_table_name" "text") RETURNS TABLE("column_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY 
  SELECT c.column_name::text
  FROM information_schema.columns c
  WHERE c.table_name = p_table_name
    AND c.table_schema = 'public'
    AND c.column_name NOT IN ('id', 'user_id', 'team_id');
END;
$$;


ALTER FUNCTION "public"."get_table_columns_excluding_security"("p_table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_table_columns_info"("p_table_name" "text") RETURNS TABLE("column_name" "text", "data_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY 
  SELECT 
      c.column_name::text, 
      c.data_type::text
  FROM 
      information_schema.columns AS c
  WHERE 
      c.table_name = p_table_name
      AND c.table_schema = 'public'
      AND c.column_name NOT IN ('id', 'user_id', 'team_id'); -- Exclou columnes internes
END;
$$;


ALTER FUNCTION "public"."get_table_columns_info"("p_table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_table_columns_with_types"("p_table_name" "text") RETURNS TABLE("column_name" "text", "data_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY 
  SELECT 
      c.column_name::text, 
      c.data_type::text
  FROM 
      information_schema.columns c
  WHERE 
      c.table_name = p_table_name
      AND c.table_schema = 'public'
      AND c.column_name NOT IN ('id', 'user_id', 'team_id');
END;
$$;


ALTER FUNCTION "public"."get_table_columns_with_types"("p_table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_dashboard_data"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    active_team_id UUID;
    result json;
BEGIN
    -- Obtenim l’equip actiu de l’usuari
    active_team_id := public.get_active_team_id();

    -- Si no hi ha equip actiu, retornem objecte buit
    IF active_team_id IS NULL THEN
        RETURN '{}'::json;
    END IF;

    -- Construïm l’objecte JSON amb totes les dades del dashboard
    SELECT json_build_object(
        'stats', (
            SELECT json_build_object(
                'totalContacts', COUNT(*),
                'newContactsThisMonth', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now())),
                'opportunities', (
                    SELECT COUNT(*) 
                    FROM public.opportunities 
                    WHERE team_id = active_team_id AND stage_name NOT IN ('Guanyat', 'Perdut')
                ),
                'pipelineValue', (
                    SELECT COALESCE(SUM(value), 0)
                    FROM public.opportunities 
                    WHERE team_id = active_team_id AND stage_name NOT IN ('Guanyat', 'Perdut')
                ),
                'avgRevenuePerClient', (
                    SELECT AVG(total_invoiced)
                    FROM (
                        SELECT SUM(total_amount) AS total_invoiced
                        FROM public.invoices
                        WHERE team_id = active_team_id
                        GROUP BY contact_id
                    ) AS client_totals
                ),
                'avgConversionTimeDays', (
                    SELECT AVG(EXTRACT(DAY FROM (last_updated_at - created_at)))
                    FROM public.opportunities
                    WHERE team_id = active_team_id AND stage_name = 'Guanyat'
                )
            )
            FROM public.contacts
            WHERE team_id = active_team_id
        ),

        'funnel', (
            SELECT json_build_object(
                'leads', COUNT(*) FILTER (WHERE estat = 'Lead'),
                'quoted', (
                    SELECT COUNT(DISTINCT contact_id)
                    FROM public.quotes
                    WHERE team_id = active_team_id
                ),
                'clients', (
                    SELECT COUNT(DISTINCT contact_id)
                    FROM public.invoices
                    WHERE team_id = active_team_id
                )
            )
            FROM public.contacts
            WHERE team_id = active_team_id
        ),

        'topClients', COALESCE((
            SELECT json_agg(c.* ORDER BY c.total_invoiced DESC)
            FROM (
                SELECT ct.id, ct.nom, SUM(i.total_amount) AS total_invoiced
                FROM public.invoices i
                JOIN public.contacts ct ON i.contact_id = ct.id
                WHERE i.team_id = active_team_id
                GROUP BY ct.id, ct.nom
                ORDER BY total_invoiced DESC
                LIMIT 5
            ) AS c
        ), '[]'::json),

        'coldContacts', COALESCE((
            SELECT json_agg(cc.*)
            FROM (
                SELECT id, nom, last_interaction_at
                FROM public.contacts
                WHERE team_id = active_team_id
                  AND last_interaction_at < (now() - interval '30 days')
                ORDER BY last_interaction_at ASC
                LIMIT 5
            ) AS cc
        ), '[]'::json),

        'unreadActivities', COALESCE((
            SELECT json_agg(ua.*)
            FROM (
                SELECT a.id, a.content, a.created_at, a.contact_id,
                       c.nom AS contact_name, c.email AS contact_email
                FROM public.activities a
                JOIN public.contacts c ON a.contact_id = c.id
                WHERE a.team_id = active_team_id AND a.is_read = false
                ORDER BY a.created_at DESC
                LIMIT 5
            ) AS ua
        ), '[]'::json),

        'bestMonths', COALESCE((
            SELECT json_agg(bm.*)
            FROM (
                SELECT to_char(date_trunc('month', issue_date), 'YYYY-MM') AS month,
                       SUM(total_amount) AS total
                FROM public.invoices
                WHERE team_id = active_team_id
                GROUP BY month
                ORDER BY total DESC
                LIMIT 3
            ) AS bm
        ), '[]'::json)
    )
    INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_team_dashboard_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_team_ticket_count"("p_team_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ticket_count integer;
BEGIN
  -- Compta els tiquets units a un usuari que pertany a l'equip
  SELECT count(t.id)
  INTO ticket_count
  FROM public.tickets t
  JOIN public.team_members tm ON t.user_id = tm.user_id
  WHERE tm.team_id = p_team_id;
  
  RETURN ticket_count;
END;
$$;


ALTER FUNCTION "public"."get_team_ticket_count"("p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_id_by_email"("email_to_check" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id
  INTO user_id
  FROM auth.users
  WHERE email = email_to_check;

  RETURN user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_id_by_email"("email_to_check" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_team_context"("p_user_id" "uuid", "p_team_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  result JSON;
  v_role TEXT;
  v_plan_id TEXT;
  v_team_name TEXT;
BEGIN
  -- 1️⃣ Obtenir el rol de l'usuari dins de l'equip
  SELECT tm.role
  INTO v_role
  FROM public.team_members tm
  WHERE tm.user_id = p_user_id
    AND tm.team_id = p_team_id;

  -- 2️⃣ Obtenir el pla actiu (actiu o en prova)
  SELECT s.plan_id
  INTO v_plan_id
  FROM public.subscriptions s
  WHERE s.team_id = p_team_id
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  -- 3️⃣ Obtenir el nom de l'equip
  SELECT t.name
  INTO v_team_name
  FROM public.teams t
  WHERE t.id = p_team_id;

  -- 4️⃣ Construir el JSON final
  SELECT json_build_object(
    'role', v_role,
    'plan_id', v_plan_id,
    'team_name', v_team_name
  )
  INTO result;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in get_user_team_context(%): %', p_team_id, SQLERRM
      USING ERRCODE = 'P0001';
END;
$$;


ALTER FUNCTION "public"."get_user_team_context"("p_user_id" "uuid", "p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_team_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_team_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_lost_opportunity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  stage_id_lost BIGINT;
BEGIN
  -- 💡 Si el pressupost es rebutja o ha expirat, marquem l'oportunitat com a perduda
  IF (
    (NEW.status = 'Declined' AND (OLD.status IS DISTINCT FROM 'Declined'))
    OR (NEW.expiry_date < NOW() AND (OLD.expiry_date IS NULL OR OLD.expiry_date >= NOW()))
  ) THEN
    SELECT id INTO stage_id_lost
    FROM public.pipeline_stages
    WHERE name = 'Perdut'
    LIMIT 1;

    IF stage_id_lost IS NOT NULL AND NEW.opportunity_id IS NOT NULL THEN
      UPDATE public.opportunities
      SET
        pipeline_stage_id = stage_id_lost,
        status = 'Lost'
      WHERE id = NEW.opportunity_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_lost_opportunity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_onboarding"("p_user_id" "uuid", "p_full_name" "text", "p_company_name" "text", "p_tax_id" "text", "p_website" "text", "p_summary" "text", "p_sector" "text", "p_services" "text"[], "p_phone" "text", "p_email" "text", "p_street" "text", "p_city" "text", "p_postal_code" "text", "p_region" "text", "p_country" "text", "p_latitude" double precision, "p_longitude" double precision) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_team_id uuid;
  user_metadata jsonb;
  app_metadata jsonb;
BEGIN
  -- 1. Actualitzar Perfil
  UPDATE public.profiles
  SET full_name = p_full_name, phone = p_phone, onboarding_completed = TRUE
  WHERE id = p_user_id;

  -- 2. Inserir Equip i obtenir el seu ID
  INSERT INTO public.teams (
    name, owner_id, tax_id, website, summary, sector, services, phone, email,
    street, city, postal_code, region, country, latitude, longitude
  ) VALUES (
    p_company_name, p_user_id, p_tax_id, p_website, p_summary, p_sector, p_services, p_phone, p_email,
    p_street, p_city, p_postal_code, p_region, p_country, p_latitude, p_longitude
  ) RETURNING id INTO new_team_id;

  -- 3. Inserir Membre d'Equip
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, p_user_id, 'owner');

  -- 4. Inserir Subscripció (amb client Admin)
  -- Aquesta és una funció 'helper' que et permet utilitzar el rol 'service_role'
  -- de forma segura dins d'una funció 'SECURITY DEFINER'.
  INSERT INTO public.subscriptions (team_id, plan_id, status)
  VALUES (new_team_id, 'free', 'active');

  -- 5. Actualitzar Metadades de l'Usuari (Admin Auth)
  -- Obtenim les metadades actuals
  SELECT raw_user_meta_data, raw_app_meta_data
  INTO user_metadata, app_metadata
  FROM auth.users WHERE id = p_user_id;

  -- Actualitzem les metadades
  PERFORM auth.admin_update_user_by_id(
    p_user_id,
    jsonb_build_object(
        'user_metadata', (user_metadata || jsonb_build_object('full_name', p_full_name)),
        'app_metadata', (app_metadata || jsonb_build_object('active_team_id', new_team_id, 'active_team_plan', 'free'))
    )
  );
  
  -- 6. Retornem l'ID de l'equip
  RETURN new_team_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Si qualsevol de les operacions anteriors falla, tot es reverteix
    RAISE EXCEPTION 'Error a handle_onboarding: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."handle_onboarding"("p_user_id" "uuid", "p_full_name" "text", "p_company_name" "text", "p_tax_id" "text", "p_website" "text", "p_summary" "text", "p_sector" "text", "p_services" "text"[], "p_phone" "text", "p_email" "text", "p_street" "text", "p_city" "text", "p_postal_code" "text", "p_region" "text", "p_country" "text", "p_latitude" double precision, "p_longitude" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_onboarding"("p_user_id" "uuid", "p_full_name" "text", "p_email" "text", "p_company_name" "text", "p_tax_id" "text", "p_website" "text", "p_summary" "text", "p_sector" "text", "p_services" "text"[], "p_phone" "text", "p_street" "text", "p_city" "text", "p_postal_code" "text", "p_region" "text", "p_country" "text", "p_latitude" double precision DEFAULT NULL::double precision, "p_longitude" double precision DEFAULT NULL::double precision) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_team_id uuid;
  user_metadata jsonb;
  app_metadata jsonb;
BEGIN
  -- 1. Actualitzar Perfil
  UPDATE public.profiles
  SET full_name = p_full_name, phone = p_phone, onboarding_completed = TRUE
  WHERE id = p_user_id;

  -- 2. Inserir Equip i obtenir el seu ID
  INSERT INTO public.teams (
    name, owner_id, tax_id, website, summary, sector, services, phone, email,
    street, city, postal_code, region, country, latitude, longitude
  ) VALUES (
    p_company_name, p_user_id, p_tax_id, p_website, p_summary, p_sector, p_services, p_phone, p_email,
    p_street, p_city, p_postal_code, p_region, p_country, p_latitude, p_longitude
  ) RETURNING id INTO new_team_id;

  -- 3. Inserir Membre d'Equip
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, p_user_id, 'owner');

  -- 4. Inserir Etapes del Pipeline
  INSERT INTO public.pipeline_stages (name, "position", team_id, user_id)
  VALUES
    ('Prospecte', 1, new_team_id, p_user_id),
    ('Contactat', 2, new_team_id, p_user_id),
    ('Proposta Enviada', 3, new_team_id, p_user_id),
    ('Negociació', 4, new_team_id, p_user_id),
    ('Guanyat', 5, new_team_id, p_user_id),
    ('Perdut', 6, new_team_id, p_user_id);

  -- 5. Inserir Subscripció
  INSERT INTO public.subscriptions (team_id, plan_id, status)
  VALUES (new_team_id, 'free', 'active');

  -- 6. Actualitzar Metadades de l'Usuari (Admin Auth)
  SELECT raw_user_meta_data, raw_app_meta_data
  INTO user_metadata, app_metadata
  FROM auth.users WHERE id = p_user_id;

  PERFORM auth.admin_update_user_by_id(
    p_user_id,
    jsonb_build_object(
      'user_metadata', (user_metadata || jsonb_build_object('full_name', p_full_name)),
      'app_metadata', (app_metadata || jsonb_build_object('active_team_id', new_team_id, 'active_team_plan', 'free'))
    )
  );
  
  -- 7. Retornar l'ID de l'equip
  RETURN new_team_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error a handle_onboarding: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."handle_onboarding"("p_user_id" "uuid", "p_full_name" "text", "p_email" "text", "p_company_name" "text", "p_tax_id" "text", "p_website" "text", "p_summary" "text", "p_sector" "text", "p_services" "text"[], "p_phone" "text", "p_street" "text", "p_city" "text", "p_postal_code" "text", "p_region" "text", "p_country" "text", "p_latitude" double precision, "p_longitude" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_opportunity_on_quote_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_target_stage_id bigint;
  v_opportunity_id bigint;
BEGIN
  v_opportunity_id := NEW.opportunity_id;

  IF v_opportunity_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT ps_target.id
    INTO v_target_stage_id
    FROM public.opportunities o
    JOIN public.pipeline_stages ps_current 
      ON o.pipeline_stage_id = ps_current.id
    JOIN public.pipeline_stages ps_target 
      ON ps_current.pipeline_id = ps_target.pipeline_id
    WHERE o.id = v_opportunity_id
      AND ps_target.stage_type = 'PROPOSAL';

    IF v_target_stage_id IS NOT NULL THEN
      UPDATE public.opportunities
      SET pipeline_stage_id = v_target_stage_id
      WHERE id = v_opportunity_id;
    END IF;

  EXCEPTION 
    WHEN NO_DATA_FOUND THEN 
      NULL;
  END;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_opportunity_on_quote_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_quote_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE 
  stage_id_won BIGINT;
  stage_id_lost BIGINT;
BEGIN
  -- 🟢 Quan el pressupost és acceptat
  IF NEW.status = 'Accepted' AND OLD.status != 'Accepted' THEN
    SELECT id INTO stage_id_won
    FROM public.pipeline_stages
    WHERE name = 'Guanyat'
    LIMIT 1;

    IF stage_id_won IS NOT NULL AND NEW.opportunity_id IS NOT NULL THEN
      UPDATE public.opportunities
      SET pipeline_stage_id = stage_id_won,
          status = 'Won'
      WHERE id = NEW.opportunity_id;

      -- 🧾 Crear automàticament una factura en esborrany
      INSERT INTO public.invoices (user_id, contact_id, quote_id, total_amount, status)
      VALUES (NEW.user_id, NEW.contact_id, NEW.id, NEW.total, 'Draft');
    END IF;
  END IF;

  -- 🔴 Quan el pressupost es declina o expira
  IF (NEW.status = 'Declined' AND OLD.status != 'Declined')
     OR (NEW.expiry_date < NOW() AND (OLD.expiry_date IS NULL OR OLD.expiry_date >= NOW())) THEN
    SELECT id INTO stage_id_lost
    FROM public.pipeline_stages
    WHERE name = 'Perdut'
    LIMIT 1;

    IF stage_id_lost IS NOT NULL AND NEW.opportunity_id IS NOT NULL THEN
      UPDATE public.opportunities
      SET pipeline_stage_id = stage_id_lost,
          status = 'Lost'
      WHERE id = NEW.opportunity_id;
    END IF;
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in handle_quote_status_change: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."handle_quote_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_invoice_sequence"("p_user_id" "uuid", "p_series" "text") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    next_num INT;
BEGIN
    INSERT INTO public.invoice_sequences (user_id, series, last_number)
    VALUES (p_user_id, p_series, 0)
    ON CONFLICT (user_id, series) DO NOTHING;

    UPDATE public.invoice_sequences
    SET last_number = last_number + 1
    WHERE user_id = p_user_id AND series = p_series
    RETURNING last_number INTO next_num;

    RETURN next_num;
END;
$$;


ALTER FUNCTION "public"."increment_invoice_sequence"("p_user_id" "uuid", "p_series" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_contact_on_public_quote"("contact_id_to_check" bigint) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM quotes WHERE contact_id = contact_id_to_check AND secure_id IS NOT NULL
  );
$$;


ALTER FUNCTION "public"."is_contact_on_public_quote"("contact_id_to_check" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_quote_public"("quote_id_to_check" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quotes
    WHERE id = quote_id_to_check
    AND secure_id IS NOT NULL
  );
$$;


ALTER FUNCTION "public"."is_quote_public"("quote_id_to_check" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_member"("team_id_to_check" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_members.user_id = auth.uid()
      AND team_members.team_id = team_id_to_check
  );
$$;


ALTER FUNCTION "public"."is_team_member"("team_id_to_check" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_on_public_quote"("team_id_to_check" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM quotes WHERE team_id = team_id_to_check AND secure_id IS NOT NULL
  );
$$;


ALTER FUNCTION "public"."is_team_on_public_quote"("team_id_to_check" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_task_activity"("task_id_input" bigint, "new_status_input" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    new_log_entry jsonb;
    action_text text;
    current_user_id uuid := auth.uid();
BEGIN
    IF new_status_input THEN
        action_text := 'actiu';
    ELSE
        action_text := 'inactiu';
    END IF;

    new_log_entry := jsonb_build_object(
        'timestamp', now(),
        'action', action_text,
        'user_id', current_user_id
    );

    UPDATE public.tasks
    SET 
        is_active = new_status_input,
        time_tracking_log = COALESCE(time_tracking_log, '[]'::jsonb) || new_log_entry
    WHERE id = task_id_input;
END;
$$;


ALTER FUNCTION "public"."log_task_activity"("task_id_input" bigint, "new_status_input" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_task_activity"("task_id_input" "uuid", "new_status_input" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    new_log_entry jsonb;
    action_text text;
    current_user_id uuid := auth.uid();
BEGIN
    IF new_status_input THEN
        action_text := 'actiu';
    ELSE
        action_text := 'inactiu';
    END IF;

    new_log_entry := jsonb_build_object(
        'timestamp', now(),
        'action', action_text,
        'user_id', current_user_id
    );

    UPDATE public.tasks
    SET 
        is_active = new_status_input,
        time_tracking_log = COALESCE(time_tracking_log, '[]'::jsonb) || new_log_entry
    WHERE id = task_id_input;
END;
$$;


ALTER FUNCTION "public"."log_task_activity"("task_id_input" "uuid", "new_status_input" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" "uuid", "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM
    public.documents d
  WHERE
    1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_quote_with_reason"("p_secure_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE 
  v_quote public.quotes%ROWTYPE;
  v_target_stage_id bigint;
BEGIN
  -- 🧾 Pas 1: Actualitzar el pressupost
  UPDATE public.quotes
  SET status = 'Declined',
      rejection_reason = p_reason
  WHERE secure_id = p_secure_id
  RETURNING * INTO v_quote;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRESSUPOST_NO_TROBAT';
  END IF;

  -- 🔁 Pas 2: Actualitzar l'oportunitat associada
  IF v_quote.opportunity_id IS NOT NULL THEN
    BEGIN
      -- Trobar l’etapa marcada com LOST dins del mateix pipeline
      SELECT ps_target.id
      INTO v_target_stage_id
      FROM public.opportunities o
      JOIN public.pipeline_stages ps_current 
        ON o.pipeline_stage_id = ps_current.id
      JOIN public.pipeline_stages ps_target 
        ON ps_current.pipeline_id = ps_target.pipeline_id
      WHERE o.id = v_quote.opportunity_id
        AND ps_target.stage_type = 'LOST';

      -- Si existeix, actualitzem l’oportunitat
      IF v_target_stage_id IS NOT NULL THEN
        UPDATE public.opportunities
        SET pipeline_stage_id = v_target_stage_id
        WHERE id = v_quote.opportunity_id;
      END IF;

    EXCEPTION 
      WHEN NO_DATA_FOUND THEN 
        NULL; -- Ignorem si no hi ha etapa LOST
    END;
  END IF;
END;
$$;


ALTER FUNCTION "public"."reject_quote_with_reason"("p_secure_id" "uuid", "p_reason" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "total_amount" numeric NOT NULL,
    "expense_date" "date" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invoice_number" "text",
    "tax_amount" numeric,
    "extra_data" "jsonb",
    "supplier_id" "uuid",
    "subtotal" numeric,
    "discount_amount" numeric,
    "notes" "text",
    "tax_rate" numeric,
    "team_id" "uuid",
    "status" "public"."expense_status" DEFAULT 'pending'::"public"."expense_status" NOT NULL,
    "payment_date" "date",
    "payment_method" "text",
    "is_billable" boolean DEFAULT false NOT NULL,
    "project_id" "uuid",
    "is_reimbursable" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_expense_with_items"("p_expense_id_to_update" bigint, "p_user_id" "uuid", "p_team_id" "uuid", "expense_data" "jsonb", "items_data" "jsonb") RETURNS SETOF "public"."expenses"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    saved_expense_id bigint;
BEGIN
    -- Comprovem si estem actualitzant o inserint una nova despesa
    IF p_expense_id_to_update IS NOT NULL THEN
        -- **MODALITAT ACTUALITZACIÓ**
        UPDATE expenses
        SET
            description = expense_data->>'description',
            total_amount = (expense_data->>'total_amount')::numeric,
            expense_date = (expense_data->>'expense_date')::date,
            category = expense_data->>'category',
            invoice_number = expense_data->>'invoice_number',
            tax_amount = (expense_data->>'tax_amount')::numeric,
            subtotal = (expense_data->>'subtotal')::numeric,
            discount_amount = (expense_data->>'discount_amount')::numeric,
            notes = expense_data->>'notes',
            tax_rate = (expense_data->>'tax_rate')::numeric,
            supplier_id = (expense_data->>'supplier_id')::uuid
        WHERE id = p_expense_id_to_update AND team_id = p_team_id -- Doble check de seguretat
        RETURNING expenses.id INTO saved_expense_id;

    ELSE
        -- **MODALITAT INSERCIÓ**
        INSERT INTO expenses (
            user_id, team_id, description, total_amount, expense_date, category,
            invoice_number, tax_amount, subtotal, discount_amount, notes, tax_rate, supplier_id
        )
        VALUES (
            p_user_id, p_team_id,
            expense_data->>'description',
            (expense_data->>'total_amount')::numeric,
            (expense_data->>'expense_date')::date,
            expense_data->>'category',
            expense_data->>'invoice_number',
            (expense_data->>'tax_amount')::numeric,
            (expense_data->>'subtotal')::numeric,
            (expense_data->>'discount_amount')::numeric,
            expense_data->>'notes',
            (expense_data->>'tax_rate')::numeric,
            (expense_data->>'supplier_id')::uuid
        )
        RETURNING expenses.id INTO saved_expense_id;
    END IF;

    -- Si tenim ítems, els processem (patró "esborrar i recrear")
    IF items_data IS NOT NULL AND jsonb_array_length(items_data) > 0 THEN
        -- Primer, esborrem els ítems antics associats a aquesta despesa
        DELETE FROM expense_items WHERE expense_id = saved_expense_id;

        -- Després, inserim els nous ítems des del JSON
        INSERT INTO expense_items (
            expense_id, user_id, team_id, description, quantity, unit_price, total
        )
        SELECT
            saved_expense_id,
            p_user_id,
            p_team_id,
            (item->>'description'),
            (item->>'quantity')::numeric,
            (item->>'unit_price')::numeric,
            (item->>'total')::numeric
        FROM jsonb_to_recordset(items_data) AS item;
    END IF;

    -- Finalment, retornem la fila completa de la despesa que hem guardat
    RETURN QUERY SELECT * FROM expenses WHERE expenses.id = saved_expense_id;
END;
$$;


ALTER FUNCTION "public"."save_expense_with_items"("p_expense_id_to_update" bigint, "p_user_id" "uuid", "p_team_id" "uuid", "expense_data" "jsonb", "items_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_refresh_token"("provider_name" "text", "refresh_token_value" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  INSERT INTO public.user_credentials (user_id, provider, refresh_token)
  VALUES (auth.uid(), provider_name, refresh_token_value)
  ON CONFLICT (user_id, provider)
  DO UPDATE
  SET refresh_token = EXCLUDED.refresh_token;
END;
$$;


ALTER FUNCTION "public"."save_refresh_token"("provider_name" "text", "refresh_token_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_expenses"("p_team_id" "uuid", "p_search_term" "text", "p_category" "text", "p_status" "text", "p_sort_by" "text", "p_sort_order" "text", "p_limit" integer, "p_offset" integer) RETURNS TABLE("id" bigint, "user_id" "uuid", "description" "text", "total_amount" numeric, "expense_date" "date", "category" "text", "created_at" timestamp with time zone, "invoice_number" "text", "tax_amount" numeric, "extra_data" "jsonb", "supplier_id" "uuid", "subtotal" numeric, "discount_amount" numeric, "notes" "text", "tax_rate" numeric, "team_id" "uuid", "status" "public"."expense_status", "payment_date" "date", "payment_method" "text", "is_billable" boolean, "project_id" "uuid", "is_reimbursable" boolean, "supplier_nom" "text", "full_count" bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    WITH filtered_expenses AS (
        SELECT
            e.*,
            s.nom AS supplier_nom
        FROM public.expenses e
        LEFT JOIN public.suppliers s ON e.supplier_id = s.id
        WHERE
            e.team_id = p_team_id
            AND (
                p_search_term IS NULL OR BTRIM(p_search_term) = '' OR
                e.description ILIKE ('%' || BTRIM(p_search_term) || '%') OR
                s.nom ILIKE ('%' || BTRIM(p_search_term) || '%') OR
                e.invoice_number ILIKE ('%' || BTRIM(p_search_term) || '%')
            )
            AND (p_category IS NULL OR p_category = 'all' OR e.category = p_category)
            AND (p_status IS NULL OR p_status = 'all' OR e.status::text = p_status)
    ),
    counted_expenses AS (
        SELECT *, COUNT(*) OVER()::bigint as full_count FROM filtered_expenses
    )
    SELECT
        ce.id, ce.user_id, ce.description, ce.total_amount, ce.expense_date,
        ce.category, ce.created_at, ce.invoice_number, ce.tax_amount, ce.extra_data,
        ce.supplier_id, -- Aquesta columna ara és 'uuid' i coincideix
        ce.subtotal, ce.discount_amount, ce.notes, ce.tax_rate,
        ce.team_id, ce.status, ce.payment_date, ce.payment_method, ce.is_billable,
        ce.project_id, -- Aquesta columna ara és 'uuid' i coincideix
        ce.is_reimbursable,
        ce.supplier_nom,
        ce.full_count
    FROM counted_expenses ce
    ORDER BY
        CASE WHEN p_sort_by = 'expense_date' AND p_sort_order = 'desc' THEN ce.expense_date END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'expense_date' AND p_sort_order = 'asc' THEN ce.expense_date END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'total_amount' AND p_sort_order = 'desc' THEN ce.total_amount END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'total_amount' AND p_sort_order = 'asc' THEN ce.total_amount END ASC NULLS LAST,
        ce.id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."search_expenses"("p_team_id" "uuid", "p_search_term" "text", "p_category" "text", "p_status" "text", "p_sort_by" "text", "p_sort_order" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_invoices"("search_term" "text" DEFAULT NULL::"text", "status_filter" "text" DEFAULT NULL::"text", "sort_field" "text" DEFAULT 'created_at'::"text", "sort_direction" "text" DEFAULT 'desc'::"text", "page_limit" integer DEFAULT 50, "page_offset" integer DEFAULT 0) RETURNS TABLE("id" bigint, "created_at" timestamp with time zone, "user_id" "uuid", "team_id" "uuid", "contact_id" bigint, "invoice_number" "text", "issue_date" "date", "due_date" "date", "total_amount" numeric, "status" "text", "notes" "text", "secure_id" "text", "client_name" "text", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  trimmed_search TEXT := BTRIM(search_term);
  trimmed_status TEXT := BTRIM(status_filter);
BEGIN
  RETURN QUERY
  WITH filtered_invoices AS (
    SELECT
      i.id,
      i.created_at,
      i.user_id,
      i.team_id,
      i.contact_id,
      i.invoice_number,
      i.issue_date,
      i.due_date,
      i.total_amount,
      i.status,
      i.notes,
      i.verifactu_uuid AS secure_id,
      c.nom AS client_name
    FROM public.invoices i
    LEFT JOIN public.contacts c ON i.contact_id = c.id
    WHERE
      (
        trimmed_search IS NULL OR trimmed_search = '' OR
        (trimmed_search ~ '^[0-9]+$' AND i.id = trimmed_search::BIGINT) OR
        i.invoice_number ILIKE '%' || trimmed_search || '%' OR
        c.nom ILIKE '%' || trimmed_search || '%'
      )
      AND (
        trimmed_status IS NULL OR trimmed_status = 'all' OR
        i.status = trimmed_status
      )
  ),
  counted_invoices AS (
    SELECT fi.*, COUNT(*) OVER() AS full_count
    FROM filtered_invoices fi
  )
  SELECT
    ci.id,
    ci.created_at,
    ci.user_id,
    ci.team_id,
    ci.contact_id,
    ci.invoice_number::TEXT,
    ci.issue_date,
    ci.due_date,
    ci.total_amount,
    ci.status::TEXT,
    ci.notes,
    ci.secure_id,
    ci.client_name::TEXT,
    ci.full_count AS total_count
  FROM counted_invoices ci
  ORDER BY
    CASE WHEN sort_field = 'issue_date' AND sort_direction = 'asc' THEN ci.issue_date END ASC NULLS LAST,
    CASE WHEN sort_field = 'issue_date' AND sort_direction = 'desc' THEN ci.issue_date END DESC NULLS LAST,
    CASE WHEN sort_field = 'client_name' AND sort_direction = 'asc' THEN ci.client_name END ASC NULLS LAST,
    CASE WHEN sort_field = 'client_name' AND sort_direction = 'desc' THEN ci.client_name END DESC NULLS LAST,
    CASE WHEN sort_field = 'total_amount' AND sort_direction = 'asc' THEN ci.total_amount END ASC NULLS LAST,
    CASE WHEN sort_field = 'total_amount' AND sort_direction = 'desc' THEN ci.total_amount END DESC NULLS LAST,
    CASE WHEN sort_field = 'status' AND sort_direction = 'asc' THEN ci.status END ASC NULLS LAST,
    CASE WHEN sort_field = 'status' AND sort_direction = 'desc' THEN ci.status END DESC NULLS LAST,
    ci.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$_$;


ALTER FUNCTION "public"."search_invoices"("search_term" "text", "status_filter" "text", "sort_field" "text", "sort_direction" "text", "page_limit" integer, "page_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_paginated_invoices"("team_id_param" "uuid", "status_param" "text" DEFAULT NULL::"text", "contact_id_param" bigint DEFAULT NULL::bigint, "search_term_param" "text" DEFAULT NULL::"text", "sort_by_param" "text" DEFAULT 'issue_date'::"text", "sort_order_param" "text" DEFAULT 'desc'::"text", "limit_param" integer DEFAULT 50, "offset_param" integer DEFAULT 0) RETURNS TABLE("id" bigint, "invoice_number" "text", "issue_date" "date", "due_date" "date", "total_amount" numeric, "status" "text", "client_name" "text", "contact_id" bigint, "contact_nom" "text", "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH filtered_invoices AS (
    SELECT
      i.id,
      COALESCE(i.invoice_number, i.id::text) AS invoice_number,
      i.issue_date,
      i.due_date,
      i.total_amount,
      i.status,
      i.client_name,
      i.contact_id,
      c.nom AS contact_nom
    FROM public.invoices i
    LEFT JOIN public.contacts c ON i.contact_id = c.id
    WHERE
      i.team_id = team_id_param
      AND (
        status_param IS NULL
        OR status_param = 'all'
        OR i.status = status_param
      )
      AND (
        contact_id_param IS NULL
        OR contact_id_param = 0
        OR i.contact_id = contact_id_param
      )
      AND (
        search_term_param IS NULL OR btrim(search_term_param) = ''
        OR COALESCE(i.invoice_number, i.id::text) ILIKE '%' || btrim(search_term_param) || '%'
        OR i.client_name ILIKE '%' || btrim(search_term_param) || '%'
        OR c.nom ILIKE '%' || btrim(search_term_param) || '%'
        OR CAST(i.id AS text) ILIKE '%' || btrim(search_term_param) || '%'
      )
  ),
  counted_invoices AS (
    SELECT *, COUNT(*) OVER() AS total_count
    FROM filtered_invoices
  )
  SELECT
    ci.id,
    ci.invoice_number,
    ci.issue_date,
    ci.due_date,
    ci.total_amount,
    ci.status,
    ci.client_name,
    ci.contact_id,
    ci.contact_nom,
    ci.total_count
  FROM counted_invoices ci
  ORDER BY
    CASE WHEN sort_by_param = 'invoice_number' AND sort_order_param = 'asc' THEN ci.invoice_number END ASC,
    CASE WHEN sort_by_param = 'invoice_number' AND sort_order_param = 'desc' THEN ci.invoice_number END DESC,
    CASE WHEN sort_by_param = 'client_name' AND sort_order_param = 'asc' THEN ci.contact_nom END ASC,
    CASE WHEN sort_by_param = 'client_name' AND sort_order_param = 'desc' THEN ci.contact_nom END DESC,
    CASE WHEN sort_by_param = 'issue_date' AND sort_order_param = 'asc' THEN ci.issue_date END ASC,
    CASE WHEN sort_by_param = 'issue_date' AND sort_order_param = 'desc' THEN ci.issue_date END DESC NULLS LAST,
    CASE WHEN sort_by_param = 'due_date' AND sort_order_param = 'asc' THEN ci.due_date END ASC,
    CASE WHEN sort_by_param = 'due_date' AND sort_order_param = 'desc' THEN ci.due_date END DESC NULLS LAST,
    CASE WHEN sort_by_param = 'total_amount' AND sort_order_param = 'asc' THEN ci.total_amount END ASC,
    CASE WHEN sort_by_param = 'total_amount' AND sort_order_param = 'desc' THEN ci.total_amount END DESC,
    CASE WHEN sort_by_param = 'status' AND sort_order_param = 'asc' THEN ci.status END ASC,
    CASE WHEN sort_by_param = 'status' AND sort_order_param = 'desc' THEN ci.status END DESC
  LIMIT limit_param
  OFFSET offset_param;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in search_paginated_invoices: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."search_paginated_invoices"("team_id_param" "uuid", "status_param" "text", "contact_id_param" bigint, "search_term_param" "text", "sort_by_param" "text", "sort_order_param" "text", "limit_param" integer, "offset_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_paginated_quotes"("team_id_param" "uuid", "status_param" "text" DEFAULT NULL::"text", "search_term_param" "text" DEFAULT NULL::"text", "sort_by_param" "text" DEFAULT 'issue_date'::"text", "sort_order_param" "text" DEFAULT 'desc'::"text", "limit_param" integer DEFAULT 20, "offset_param" integer DEFAULT 0) RETURNS SETOF "record"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Quotes
    q.id,
    q.sequence_number,
    q.user_id,
    q.contact_id,
    q.team_id,
    q.tax_percent,
    q.show_quantity,
    q.status,
    q.issue_date,
    q.expiry_date,
    q.subtotal,
    q.discount,
    q.tax,
    q.total,
    q.created_at,
    q.opportunity_id,
    q.send_at,
    q.secure_id,
    q.sent_at,
    q.quote_number,
    q.notes,
    q.rejection_reason,
    q.theme_color,
    -- Contactes
    c.nom AS contact_nom,
    c.empresa AS contact_empresa,
    -- Total
    COUNT(*) OVER() AS total_count
  FROM public.quotes q
  LEFT JOIN public.contacts c ON q.contact_id = c.id
  WHERE
    q.team_id = team_id_param
    AND (status_param IS NULL OR q.status = status_param)
    AND (
      search_term_param IS NULL
      OR q.quote_number ILIKE '%' || search_term_param || '%'
      OR c.nom ILIKE '%' || search_term_param || '%'
    )
  ORDER BY
    CASE WHEN sort_by_param = 'issue_date' AND sort_order_param = 'asc' THEN q.issue_date END ASC NULLS LAST,
    CASE WHEN sort_by_param = 'issue_date' AND sort_order_param = 'desc' THEN q.issue_date END DESC NULLS LAST,
    CASE WHEN sort_by_param = 'quote_number' AND sort_order_param = 'asc' THEN q.quote_number END ASC NULLS LAST,
    CASE WHEN sort_by_param = 'quote_number' AND sort_order_param = 'desc' THEN q.quote_number END DESC NULLS LAST,
    CASE WHEN sort_by_param = 'client_name' AND sort_order_param = 'asc' THEN c.nom END ASC NULLS LAST,
    CASE WHEN sort_by_param = 'client_name' AND sort_order_param = 'desc' THEN c.nom END DESC NULLS LAST,
    CASE WHEN sort_by_param = 'total' AND sort_order_param = 'asc' THEN q.total END ASC NULLS LAST,
    CASE WHEN sort_by_param = 'total' AND sort_order_param = 'desc' THEN q.total END DESC NULLS LAST,
    CASE WHEN sort_by_param = 'status' AND sort_order_param = 'asc' THEN q.status::text END ASC NULLS LAST,
    CASE WHEN sort_by_param = 'status' AND sort_order_param = 'desc' THEN q.status::text END DESC NULLS LAST
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;


ALTER FUNCTION "public"."search_paginated_quotes"("team_id_param" "uuid", "status_param" "text", "search_term_param" "text", "sort_by_param" "text", "sort_order_param" "text", "limit_param" integer, "offset_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_pipeline_stage_type"("p_pipeline_id" bigint, "p_team_id" "uuid", "p_stage_id" bigint, "p_stage_type" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- 1️⃣ Neteja qualsevol altra etapa que tingués aquest tipus dins del pipeline
  UPDATE public.pipeline_stages
  SET stage_type = NULL
  WHERE pipeline_id = p_pipeline_id
    AND team_id = p_team_id
    AND stage_type = p_stage_type
    AND id != p_stage_id;

  -- 2️⃣ Assigna el nou tipus a l'etapa seleccionada
  UPDATE public.pipeline_stages
  SET stage_type = p_stage_type
  WHERE id = p_stage_id
    AND pipeline_id = p_pipeline_id
    AND team_id = p_team_id;
END;
$$;


ALTER FUNCTION "public"."set_pipeline_stage_type"("p_pipeline_id" bigint, "p_team_id" "uuid", "p_stage_id" bigint, "p_stage_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_proposal_stage_on_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  stage_id BIGINT;
BEGIN
  -- Si hi ha una oportunitat associada a l'activitat
  IF NEW.opportunity_id IS NOT NULL THEN
    SELECT id
    INTO stage_id
    FROM public.pipeline_stages
    WHERE name = 'Proposta Enviada'
    LIMIT 1;

    -- Si hem trobat l'etapa, actualitzem l'oportunitat
    IF stage_id IS NOT NULL THEN
      UPDATE public.opportunities
      SET pipeline_stage_id = stage_id
      WHERE id = NEW.opportunity_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_proposal_stage_on_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contact_last_interaction"("contact_id_to_update" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  UPDATE public.contacts
  SET last_interaction_at = NOW()
  WHERE id = contact_id_to_update;
END;
$$;


ALTER FUNCTION "public"."update_contact_last_interaction"("contact_id_to_update" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_expense_with_items"("p_expense_id" bigint, "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_details" "jsonb", "p_expense_items" "jsonb") RETURNS SETOF "public"."expenses"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    v_saved_expense_id BIGINT;
    item JSONB;
BEGIN
    -- 🧩 Comprovem si és actualització o creació
    IF p_expense_id IS NOT NULL THEN
        -- 🔁 ACTUALITZACIÓ
        UPDATE public.expenses
        SET
            description     = p_expense_details->>'description',
            total_amount    = (p_expense_details->>'total_amount')::NUMERIC,
            expense_date    = (p_expense_details->>'expense_date')::DATE,
            category        = p_expense_details->>'category',
            invoice_number  = p_expense_details->>'invoice_number',
            tax_amount      = (p_expense_details->>'tax_amount')::NUMERIC,
            extra_data      = (p_expense_details->>'extra_data')::JSONB,
            supplier_id     = NULLIF(p_expense_details->>'supplier_id', '')::UUID,
            subtotal        = (p_expense_details->>'subtotal')::NUMERIC,
            discount_amount = (p_expense_details->>'discount_amount')::NUMERIC,
            notes           = p_expense_details->>'notes',
            tax_rate        = (p_expense_details->>'tax_rate')::NUMERIC
        WHERE expenses.id = p_expense_id
          AND expenses.team_id = p_team_id
        RETURNING expenses.id INTO v_saved_expense_id;
    ELSE
        -- ✳️ CREACIÓ
        INSERT INTO public.expenses (
            team_id, user_id, description, total_amount, expense_date, category,
            invoice_number, tax_amount, extra_data, supplier_id, subtotal,
            discount_amount, notes, tax_rate
        )
        VALUES (
            p_team_id, p_user_id,
            p_expense_details->>'description',
            (p_expense_details->>'total_amount')::NUMERIC,
            (p_expense_details->>'expense_date')::DATE,
            p_expense_details->>'category',
            p_expense_details->>'invoice_number',
            (p_expense_details->>'tax_amount')::NUMERIC,
            (p_expense_details->>'extra_data')::JSONB,
            NULLIF(p_expense_details->>'supplier_id', '')::UUID,
            (p_expense_details->>'subtotal')::NUMERIC,
            (p_expense_details->>'discount_amount')::NUMERIC,
            p_expense_details->>'notes',
            (p_expense_details->>'tax_rate')::NUMERIC
        )
        RETURNING expenses.id INTO v_saved_expense_id;
    END IF;

    -- 🧾 Processem els ítems associats
    IF v_saved_expense_id IS NOT NULL AND p_expense_items IS NOT NULL THEN
        -- Esborrem ítems antics
        DELETE FROM public.expense_items WHERE expense_id = v_saved_expense_id;

        -- Inserim nous ítems recorrent l’array JSON
        FOR item IN SELECT * FROM jsonb_array_elements(p_expense_items)
        LOOP
            INSERT INTO public.expense_items (
                expense_id, team_id, user_id, description, quantity, unit_price, total
            )
            VALUES (
                v_saved_expense_id,
                p_team_id,
                p_user_id,
                item->>'description',
                (item->>'quantity')::NUMERIC,
                (item->>'unit_price')::NUMERIC,
                (item->>'total')::NUMERIC
            );
        END LOOP;
    END IF;

    -- 🔚 Retornem la despesa desada
    RETURN QUERY SELECT * FROM public.expenses WHERE expenses.id = v_saved_expense_id;
END;
$$;


ALTER FUNCTION "public"."upsert_expense_with_items"("p_expense_id" bigint, "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_details" "jsonb", "p_expense_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_invoice_with_items"("invoice_data" "jsonb", "items_data" "jsonb", "user_id" "uuid", "team_id" "uuid") RETURNS TABLE("saved_invoice_id" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  invoice_contact_id BIGINT;
BEGIN
  -- 🧩 Obtenim l'ID del contacte associat
  invoice_contact_id := (invoice_data->>'contact_id')::BIGINT;

  -- 💾 Inserim o actualitzem la factura
  INSERT INTO public.invoices (
      id, contact_id, issue_date, due_date, status,
      subtotal, tax_amount, total_amount, notes, user_id, team_id
  )
  VALUES (
      (invoice_data->>'id')::BIGINT,
      invoice_contact_id,
      (invoice_data->>'issue_date')::timestamptz,
      (invoice_data->>'due_date')::timestamptz,
      'Draft',
      (invoice_data->>'subtotal')::NUMERIC,
      (invoice_data->>'tax_amount')::NUMERIC,
      (invoice_data->>'total_amount')::NUMERIC,
      invoice_data->>'notes',
      user_id,
      team_id
  )
  ON CONFLICT (id) DO UPDATE
  SET contact_id = EXCLUDED.contact_id,
      issue_date = EXCLUDED.issue_date,
      due_date = EXCLUDED.due_date,
      subtotal = EXCLUDED.subtotal,
      tax_amount = EXCLUDED.tax_amount,
      total_amount = EXCLUDED.total_amount,
      notes = EXCLUDED.notes
  RETURNING public.invoices.id INTO saved_invoice_id;

  -- 🧭 Si no s’ha trobat ID, fem fallback
  IF saved_invoice_id IS NULL THEN
    saved_invoice_id := (invoice_data->>'id')::BIGINT;
    IF saved_invoice_id IS NULL THEN
      SELECT i.id INTO saved_invoice_id
      FROM public.invoices i
      WHERE i.user_id = user_id AND i.team_id = team_id
      ORDER BY i.created_at DESC LIMIT 1;
    END IF;
  END IF;

  -- 🗑️ Eliminem items antics
  DELETE FROM public.invoice_items WHERE invoice_id = saved_invoice_id;

  -- 🧾 Inserim els items nous
  IF jsonb_array_length(items_data) > 0 THEN
    INSERT INTO public.invoice_items (
        invoice_id, product_id, description, quantity, unit_price, tax_rate, user_id, team_id
    )
    SELECT
        saved_invoice_id,
        (item->>'product_id')::BIGINT,
        item->>'description',
        (item->>'quantity')::NUMERIC,
        (item->>'unit_price')::NUMERIC,
        (item->>'tax_rate')::NUMERIC,
        user_id,
        team_id
    FROM jsonb_to_recordset(items_data) AS item(
        product_id TEXT,
        description TEXT,
        quantity TEXT,
        unit_price TEXT,
        tax_rate TEXT
    );
  END IF;

  RETURN QUERY SELECT saved_invoice_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en upsert_invoice_with_items: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."upsert_invoice_with_items"("invoice_data" "jsonb", "items_data" "jsonb", "user_id" "uuid", "team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_quote_with_items"("quote_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  final_quote_id bigint;
  user_id uuid := auth.uid();
  
  -- ✅ 2. CORRECCIÓ DE RENDIMENT/SEGURETAT:
  -- Canviem la consulta lenta a 'auth.users' per la nostra funció ràpida.
  v_team_id uuid := public.get_active_team_id();
  
  item_record jsonb;
BEGIN
  -- (La resta del teu codi, que ara fa servir el v_team_id ràpid)
  IF (quote_payload->>'id') = 'new' THEN
    INSERT INTO public.quotes (contact_id, opportunity_id, quote_number, status, issue_date, expiry_date, notes, subtotal, discount, tax, total, tax_percent, show_quantity, user_id, team_id)
    VALUES (
      (quote_payload->>'contact_id')::bigint, (quote_payload->>'opportunity_id')::bigint, quote_payload->>'quote_number',
      (quote_payload->>'status')::quote_status, (quote_payload->>'issue_date')::date, (quote_payload->>'expiry_date')::date,
      quote_payload->>'notes', (quote_payload->>'subtotal')::numeric, (quote_payload->>'discount')::numeric,
      (quote_payload->>'tax')::numeric, (quote_payload->>'total')::numeric, (quote_payload->>'tax_percent')::numeric,
      (quote_payload->>'show_quantity')::boolean, user_id, v_team_id
    ) RETURNING id INTO final_quote_id;
  ELSE
    final_quote_id := (quote_payload->>'id')::bigint;
    UPDATE public.quotes
    SET contact_id = (quote_payload->>'contact_id')::bigint, opportunity_id = (quote_payload->>'opportunity_id')::bigint,
        quote_number = quote_payload->>'quote_number', status = (quote_payload->>'status')::quote_status,
        issue_date = (quote_payload->>'issue_date')::date, expiry_date = (quote_payload->>'expiry_date')::date,
        notes = quote_payload->>'notes', subtotal = (quote_payload->>'subtotal')::numeric,
        discount = (quote_payload->>'discount')::numeric, tax = (quote_payload->>'tax')::numeric,
        total = (quote_payload->>'total')::numeric, tax_percent = (quote_payload->>'tax_percent')::numeric,
        show_quantity = (quote_payload->>'show_quantity')::boolean
    WHERE id = final_quote_id AND quotes.team_id = v_team_id;
    DELETE FROM public.quote_items WHERE quote_id = final_quote_id;
  END IF;

  IF jsonb_typeof(quote_payload->'items') = 'array' AND jsonb_array_length(quote_payload->'items') > 0 THEN
    FOR item_record IN SELECT * FROM jsonb_array_elements(quote_payload->'items') LOOP
      INSERT INTO public.quote_items (
        quote_id, product_id, description, quantity, unit_price, total, user_id, team_id
      )
      VALUES (
        final_quote_id, (item_record->>'product_id')::bigint, item_record->>'description',
        (item_record->>'quantity')::numeric, (item_record->>'unit_price')::numeric,
        (item_record->>'quantity')::numeric * (item_record->>'unit_price')::numeric,
        user_id, v_team_id
      );
    END LOOP;
  END IF;

  IF (quote_payload->>'opportunity_id') IS NOT NULL THEN
    UPDATE public.opportunities SET stage_name = 'Proposta Enviada'
    WHERE id = (quote_payload->>'opportunity_id')::bigint AND opportunities.team_id = v_team_id;
  END IF;

  RETURN jsonb_build_object('quote_id', final_quote_id);
END;
$$;


ALTER FUNCTION "public"."upsert_quote_with_items"("quote_payload" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "contact_id" bigint,
    "quote_id" bigint,
    "opportunity_id" bigint,
    "type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid"
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


ALTER TABLE "public"."activities" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."activities_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."ai_usage_log" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action_type" "text" NOT NULL
);


ALTER TABLE "public"."ai_usage_log" OWNER TO "postgres";


ALTER TABLE "public"."ai_usage_log" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ai_usage_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."audio_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "storage_path" "text" NOT NULL,
    "status" "public"."audio_job_status" DEFAULT 'pending'::"public"."audio_job_status" NOT NULL,
    "transcription_text" "text",
    "summary" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "participants" "jsonb" DEFAULT '[]'::"jsonb",
    "key_moments" "jsonb",
    "speaker_identification" "jsonb",
    "dialogue_flow" "jsonb",
    "assigned_tasks_summary" "jsonb"
);

ALTER TABLE ONLY "public"."audio_jobs" REPLICA IDENTITY FULL;


ALTER TABLE "public"."audio_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blacklist_rules" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "rule_type" "text" NOT NULL,
    "value" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid"
);


ALTER TABLE "public"."blacklist_rules" OWNER TO "postgres";


ALTER TABLE "public"."blacklist_rules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."blacklist_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."campaign_templates" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "goal" "text",
    "target_audience" "text",
    "content" "text",
    "type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."campaign_templates" OWNER TO "postgres";


ALTER TABLE "public"."campaign_templates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."campaign_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text",
    "status" "text" DEFAULT 'Esborrany'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "campaign_date" "date" NOT NULL,
    "goal" "text",
    "target_audience" "text",
    "content" "text",
    "type" "text" NOT NULL,
    "metrics" "jsonb",
    "team_id" "uuid"
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


ALTER TABLE "public"."campaigns" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."campaigns_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."contact_tags" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid"
);


ALTER TABLE "public"."contact_tags" OWNER TO "postgres";


ALTER TABLE "public"."contact_tags" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."contact_tags_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" bigint NOT NULL,
    "nom" "text" NOT NULL,
    "empresa" "text",
    "email" "text" NOT NULL,
    "telefon" "text",
    "estat" "text",
    "valor" numeric,
    "ultim_contacte" "date",
    "ubicacio" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "last_interaction_at" timestamp with time zone,
    "birthday" "date",
    "marital_status" "text",
    "hobbies" "text"[],
    "social_media" "jsonb",
    "job_title" "text",
    "industry" "text",
    "lead_source" "text",
    "notes" "text",
    "address" "jsonb",
    "children_count" smallint,
    "partner_name" "text",
    "team_id" "uuid",
    "supplier_id" "uuid",
    "gender" "text"
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."contacts"."gender" IS 'Gènere del contacte (ex: Home, Dona, Altre) per ajudar a la identificació de lA IA.';



ALTER TABLE "public"."contacts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."contacts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" bigint NOT NULL,
    "team_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


ALTER TABLE "public"."departments" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."departments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" bigint NOT NULL,
    "content" "text",
    "metadata" "jsonb",
    "embedding" "extensions"."vector"(1536)
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."documents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."documents_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."documents_id_seq" OWNED BY "public"."documents"."id";



CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "subject" "text",
    "body" "text",
    "variables" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid"
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


ALTER TABLE "public"."email_templates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."email_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "billing_address" "jsonb",
    "payment_method" "jsonb",
    "logo_url" "text",
    "summary" "text",
    "services" "jsonb",
    "website_url" "text",
    "is_public_profile" boolean DEFAULT true,
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "phone" "text",
    "job_title" "text",
    "email" "text",
    "active_team_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."summary" IS 'Descripció curta o bio de l''empresa.';



COMMENT ON COLUMN "public"."profiles"."services" IS 'Array de serveis o etiquetes que ofereix. Ex: ["Disseny Gràfic", "Consultoria SEO"]';



COMMENT ON COLUMN "public"."profiles"."website_url" IS 'URL del lloc web de l''empresa.';



COMMENT ON COLUMN "public"."profiles"."is_public_profile" IS 'Controla si el perfil és visible al mapa de la xarxa.';



CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "subject" "text",
    "body" "text",
    "status" "text",
    "provider_message_id" "text",
    "type" "text",
    "preview" "text",
    "sent_at" timestamp with time zone,
    "sender_name" "text",
    "sender_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "contact_id" bigint,
    "provider" "text",
    "attachments" "jsonb"
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."enriched_tickets" WITH ("security_invoker"='on') AS
 SELECT "t"."id",
    "t"."user_id",
    "t"."subject",
    "t"."body",
    "t"."status",
    "t"."provider_message_id",
    "t"."type",
    "t"."preview",
    "t"."sent_at",
    "t"."sender_name",
    "t"."sender_email",
    "t"."created_at",
    "t"."contact_id",
    "t"."provider",
    "t"."attachments",
    "c"."nom" AS "contact_nom",
    "c"."email" AS "contact_email",
    "p"."full_name" AS "profile_full_name",
    "p"."avatar_url" AS "profile_avatar_url"
   FROM (("public"."tickets" "t"
     LEFT JOIN "public"."contacts" "c" ON (("t"."contact_id" = "c"."id")))
     LEFT JOIN "public"."profiles" "p" ON (("t"."user_id" = "p"."id")));


ALTER VIEW "public"."enriched_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" bigint NOT NULL,
    "file_path" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "mime_type" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "team_id" "uuid"
);


ALTER TABLE "public"."expense_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" bigint NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "unit_price" numeric DEFAULT 0 NOT NULL,
    "total" numeric GENERATED ALWAYS AS (("quantity" * "unit_price")) STORED,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "team_id" "uuid"
);


ALTER TABLE "public"."expense_items" OWNER TO "postgres";


ALTER TABLE "public"."expenses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."expenses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inbox_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "grantee_user_id" "uuid" NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inbox_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid",
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "token" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "inviter_name" "text",
    "team_name" "text",
    "user_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "invitations_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" bigint NOT NULL,
    "file_path" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "mime_type" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid"
);


ALTER TABLE "public"."invoice_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" bigint NOT NULL,
    "team_id" "uuid" NOT NULL,
    "method" "text" NOT NULL,
    "recipient" "text",
    "delivered_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoice_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "invoice_id" bigint NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "unit_price" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "product_id" bigint,
    "tax_rate" numeric DEFAULT 0.21,
    "team_id" "uuid",
    "total" numeric,
    "discount_percentage" numeric DEFAULT 0,
    "discount_amount" numeric DEFAULT 0,
    "reference_sku" "text",
    CONSTRAINT "invoice_items_discount_percentage_check" CHECK ((("discount_percentage" >= (0)::numeric) AND ("discount_percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."invoice_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "contact_id" bigint,
    "invoice_number" "text",
    "issue_date" "date" NOT NULL,
    "due_date" "date",
    "total_amount" numeric NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subtotal" numeric,
    "tax_rate" numeric DEFAULT 21,
    "tax_amount" numeric,
    "notes" "text",
    "extra_data" "jsonb",
    "discount_amount" numeric,
    "budget_id" bigint,
    "quote_id" bigint,
    "tax" numeric DEFAULT 0,
    "discount" numeric DEFAULT 0,
    "company_name" "text",
    "company_tax_id" "text",
    "company_address" "text",
    "company_email" "text",
    "client_name" "text",
    "client_tax_id" "text",
    "client_address" "text",
    "client_email" "text",
    "verifactu_uuid" "uuid" DEFAULT "gen_random_uuid"(),
    "verifactu_qr_data" "text",
    "verifactu_signature" "text",
    "verifactu_previous_signature" "text",
    "team_id" "uuid",
    "updated_at" timestamp with time zone,
    "project_id" "uuid",
    "terms" "text",
    "currency" character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    "language" character varying(5) DEFAULT 'ca'::character varying NOT NULL,
    "paid_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "shipping_cost" numeric DEFAULT 0,
    "payment_details" "text",
    "company_logo_url" "text",
    "client_reference" "text",
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['Draft'::"text", 'Issued'::"text", 'Paid'::"text", 'Cancelled'::"text", 'Overdue'::"text", 'Sent'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoices" IS 'Taula actualitzada per a la facturació legal amb VERIFACTU.';



ALTER TABLE "public"."invoices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."invoices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."job_postings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "public"."job_status" DEFAULT 'open'::"public"."job_status" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "address_text" "text",
    "required_skills" "text"[],
    "budget" numeric(10,2),
    "expires_at" timestamp with time zone,
    "city" "text",
    "region" "text",
    "postcode" "text",
    "country" "text"
);


ALTER TABLE "public"."job_postings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


ALTER TABLE "public"."notifications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."opportunities" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "contact_id" bigint,
    "name" "text" NOT NULL,
    "value" numeric,
    "close_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stage_name" "text",
    "description" "text",
    "source" "text",
    "probability" integer,
    "last_updated_at" timestamp with time zone DEFAULT "now"(),
    "pipeline_stage_id" bigint,
    "team_id" "uuid"
);


ALTER TABLE "public"."opportunities" OWNER TO "postgres";


ALTER TABLE "public"."opportunities" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."opportunities_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pipeline_stages" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid",
    "pipeline_id" bigint NOT NULL,
    "color" "text" DEFAULT '#808080'::"text" NOT NULL,
    "stage_type" "text",
    CONSTRAINT "chk_stage_type" CHECK ((("stage_type" IS NULL) OR ("stage_type" = ANY (ARRAY['WON'::"text", 'LOST'::"text", 'PROSPECT'::"text", 'CONTACTED'::"text", 'PROPOSAL'::"text"]))))
);


ALTER TABLE "public"."pipeline_stages" OWNER TO "postgres";


ALTER TABLE "public"."pipeline_stages" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pipeline_stages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pipelines" (
    "id" bigint NOT NULL,
    "team_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "position" smallint DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pipelines" OWNER TO "postgres";


ALTER TABLE "public"."pipelines" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pipelines_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."prices" (
    "id" "text" NOT NULL,
    "product_id" "text",
    "active" boolean,
    "description" "text",
    "unit_amount" bigint,
    "currency" "text",
    "type" "text",
    "interval" "text",
    "interval_count" integer,
    "trial_period_days" integer,
    "metadata" "jsonb"
);


ALTER TABLE "public"."prices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "iva" numeric,
    "discount" numeric,
    "description" "text",
    "category" "text",
    "unit" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "team_id" "uuid"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."description" IS 'Descripció detallada del producte o servei.';



COMMENT ON COLUMN "public"."products"."category" IS 'Categoria per organitzar productes (ex: Disseny, Desenvolupament).';



COMMENT ON COLUMN "public"."products"."unit" IS 'Unitat de mesura (ex: hores, unitats, projecte).';



COMMENT ON COLUMN "public"."products"."is_active" IS 'Per arxivar productes sense esborrar-los.';



ALTER TABLE "public"."products" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_layouts" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "node_id" "text" NOT NULL,
    "position_x" real NOT NULL,
    "position_y" real NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_layouts" OWNER TO "postgres";


COMMENT ON TABLE "public"."project_layouts" IS 'Emmagatzema les posicions personalitzades dels nodes del visualitzador d''arquitectura.';



ALTER TABLE "public"."project_layouts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_layouts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text",
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" bigint NOT NULL,
    "quote_id" bigint NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "product_id" bigint,
    "user_id" "uuid",
    "team_id" "uuid" NOT NULL
);


ALTER TABLE "public"."quote_items" OWNER TO "postgres";


ALTER TABLE "public"."quote_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quote_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "contact_id" bigint,
    "quote_number" "text" NOT NULL,
    "status" "public"."quote_status" DEFAULT 'Draft'::"public"."quote_status",
    "issue_date" "date" NOT NULL,
    "expiry_date" "date",
    "notes" "text",
    "subtotal" numeric(10,2) NOT NULL,
    "discount" numeric(10,2) DEFAULT 0,
    "tax" numeric(10,2) DEFAULT 0,
    "total" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "theme_color" "text" DEFAULT '#8A2BE2'::"text",
    "opportunity_id" bigint,
    "send_at" timestamp with time zone,
    "secure_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sent_at" timestamp with time zone,
    "rejection_reason" "text",
    "team_id" "uuid",
    "tax_percent" numeric DEFAULT 21,
    "show_quantity" boolean DEFAULT true NOT NULL,
    "sequence_number" integer
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


ALTER TABLE "public"."quotes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quotes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."services" OWNER TO "postgres";


ALTER TABLE "public"."services" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."services_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."social_posts" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text"[] NOT NULL,
    "content" "text",
    "media_url" "text"[],
    "media_type" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid"
);


ALTER TABLE "public"."social_posts" OWNER TO "postgres";


ALTER TABLE "public"."social_posts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."social_posts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "plan_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "current_period_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "subscriptions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'trialing'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nom" "text" NOT NULL,
    "email" "text",
    "telefon" "text",
    "nif" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "team_id" "uuid"
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "contact_id" bigint,
    "title" "text" NOT NULL,
    "due_date" timestamp with time zone,
    "is_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "team_id" "uuid",
    "description" "text",
    "priority" "public"."task_priority",
    "department_id" bigint,
    "user_asign_id" "uuid",
    "asigned_date" timestamp with time zone,
    "duration" numeric,
    "finish_date" timestamp with time zone,
    "time_tracking_log" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean,
    "description_json" "jsonb",
    "checklist_progress" "jsonb" DEFAULT '{"total": 0, "completed": 0}'::"jsonb",
    "google_calendar_id" "text"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tasks"."user_asign_id" IS 'Usuario asignado';



COMMENT ON COLUMN "public"."tasks"."asigned_date" IS 'Data assignació';



COMMENT ON COLUMN "public"."tasks"."duration" IS 'Duració';



COMMENT ON COLUMN "public"."tasks"."finish_date" IS 'Finish Date';



COMMENT ON COLUMN "public"."tasks"."is_active" IS 'Activa';



COMMENT ON COLUMN "public"."tasks"."checklist_progress" IS 'Emmagatzema el recompte de checkboxes dins la descripció: { "total": number, "completed": number }';



ALTER TABLE "public"."tasks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."tasks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."team_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "refresh_token" "text",
    "connected_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "access_token" "text",
    "expires_at" timestamp with time zone,
    "provider_user_id" "text",
    "user_id" "uuid",
    "provider_page_id" "text",
    "provider_page_name" "text"
);


ALTER TABLE "public"."team_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."team_members_with_profiles" WITH ("security_invoker"='true') AS
 SELECT "tm"."team_id",
    "tm"."role",
    "p"."id" AS "user_id",
    "p"."full_name",
    "p"."email",
    "p"."avatar_url"
   FROM ("public"."team_members" "tm"
     JOIN "public"."profiles" "p" ON (("tm"."user_id" = "p"."id")));


ALTER VIEW "public"."team_members_with_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tax_id" "text",
    "address" "text",
    "phone" "text",
    "email" "text",
    "logo_url" "text",
    "website" "text",
    "street" "text",
    "city" "text",
    "postal_code" "text",
    "region" "text",
    "country" "text",
    "summary" "text",
    "sector" "text",
    "services" "jsonb",
    "latitude" numeric,
    "longitude" numeric,
    "default_pipeline_id" bigint
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_assignments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ticket_id" bigint NOT NULL,
    "team_id" "uuid" NOT NULL,
    "deal_id" bigint
);


ALTER TABLE "public"."ticket_assignments" OWNER TO "postgres";


ALTER TABLE "public"."ticket_assignments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."ticket_assignments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."tickets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tickets_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tickets_id_seq" OWNED BY "public"."tickets"."id";



CREATE TABLE IF NOT EXISTS "public"."user_credentials" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "provider" "text" NOT NULL,
    "refresh_token" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "access_token" "text",
    "expires_at" timestamp with time zone,
    "provider_user_id" "text",
    "provider_page_id" "text",
    "team_id" "uuid",
    "config" "jsonb",
    "encrypted_password" "text"
);


ALTER TABLE "public"."user_credentials" OWNER TO "postgres";


ALTER TABLE "public"."user_credentials" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_credentials_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."documents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."documents_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tickets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tickets_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audio_jobs"
    ADD CONSTRAINT "audio_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blacklist_rules"
    ADD CONSTRAINT "blacklist_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blacklist_rules"
    ADD CONSTRAINT "blacklist_rules_user_id_value_key" UNIQUE ("user_id", "value");



ALTER TABLE ONLY "public"."campaign_templates"
    ADD CONSTRAINT "campaign_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_tags"
    ADD CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_team_id_name_key" UNIQUE ("team_id", "name");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_attachments"
    ADD CONSTRAINT "expense_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_items"
    ADD CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inbox_permissions"
    ADD CONSTRAINT "inbox_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inbox_permissions"
    ADD CONSTRAINT "inbox_permissions_team_id_grantee_user_id_target_user_id_key" UNIQUE ("team_id", "grantee_user_id", "target_user_id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."invoice_attachments"
    ADD CONSTRAINT "invoice_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_deliveries"
    ADD CONSTRAINT "invoice_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_verifactu_uuid_key" UNIQUE ("verifactu_uuid");



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prices"
    ADD CONSTRAINT "prices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_layouts"
    ADD CONSTRAINT "project_layouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_layouts"
    ADD CONSTRAINT "project_layouts_user_id_node_id_key" UNIQUE ("user_id", "node_id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_secure_id_key" UNIQUE ("secure_id");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_team_id_key" UNIQUE ("team_id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_credentials"
    ADD CONSTRAINT "team_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_credentials"
    ADD CONSTRAINT "team_credentials_team_id_provider_key" UNIQUE ("team_id", "provider");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_assignments"
    ADD CONSTRAINT "ticket_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_gmail_message_id_key" UNIQUE ("provider_message_id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_user_id_provider_message_id_key" UNIQUE ("user_id", "provider_message_id");



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_user_id_provider_key" UNIQUE ("user_id", "provider");



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_user_id_provider_team_id_key" UNIQUE ("user_id", "provider", "team_id");



CREATE INDEX "idx_activities_user_id_is_read" ON "public"."activities" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_audio_jobs_participants" ON "public"."audio_jobs" USING "gin" ("participants");



CREATE INDEX "idx_contacts_created_at_desc" ON "public"."contacts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_contacts_team_id" ON "public"."contacts" USING "btree" ("team_id");



CREATE INDEX "idx_contacts_user_id" ON "public"."contacts" USING "btree" ("user_id");



CREATE INDEX "idx_contacts_user_id_created_at" ON "public"."contacts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_contacts_user_id_last_interaction" ON "public"."contacts" USING "btree" ("user_id", "last_interaction_at");



CREATE INDEX "idx_invoices_project_id" ON "public"."invoices" USING "btree" ("project_id");



CREATE INDEX "idx_invoices_user_id_status" ON "public"."invoices" USING "btree" ("user_id", "status");



CREATE INDEX "idx_job_postings_skills" ON "public"."job_postings" USING "gin" ("required_skills");



CREATE INDEX "idx_job_postings_status" ON "public"."job_postings" USING "btree" ("status");



CREATE INDEX "idx_job_postings_team_id" ON "public"."job_postings" USING "btree" ("team_id");



CREATE INDEX "idx_opportunities_user_id" ON "public"."opportunities" USING "btree" ("user_id");



CREATE INDEX "idx_opportunities_user_id_stage_name" ON "public"."opportunities" USING "btree" ("user_id", "stage_name");



CREATE INDEX "idx_pipeline_stages_pipeline_id" ON "public"."pipeline_stages" USING "btree" ("pipeline_id");



CREATE INDEX "idx_pipeline_stages_type" ON "public"."pipeline_stages" USING "btree" ("pipeline_id", "stage_type") WHERE ("stage_type" IS NOT NULL);



CREATE INDEX "idx_pipeline_stages_user_id" ON "public"."pipeline_stages" USING "btree" ("user_id");



CREATE INDEX "idx_pipelines_team_id" ON "public"."pipelines" USING "btree" ("team_id");



CREATE INDEX "idx_quotes_team_id_sequence_number" ON "public"."quotes" USING "btree" ("team_id", "sequence_number" DESC);



CREATE INDEX "idx_quotes_user_id" ON "public"."quotes" USING "btree" ("user_id");



CREATE INDEX "idx_tasks_google_calendar_id" ON "public"."tasks" USING "btree" ("google_calendar_id");



CREATE INDEX "ticket_assignments_deal_id_idx" ON "public"."ticket_assignments" USING "btree" ("deal_id");



CREATE INDEX "ticket_assignments_team_id_idx" ON "public"."ticket_assignments" USING "btree" ("team_id");



CREATE INDEX "ticket_assignments_ticket_id_idx" ON "public"."ticket_assignments" USING "btree" ("ticket_id");



CREATE OR REPLACE TRIGGER "trg_move_opportunity_on_quote_insert" AFTER INSERT ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."handle_opportunity_on_quote_creation"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audio_jobs"
    ADD CONSTRAINT "audio_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audio_jobs"
    ADD CONSTRAINT "audio_jobs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audio_jobs"
    ADD CONSTRAINT "audio_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blacklist_rules"
    ADD CONSTRAINT "blacklist_rules_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."blacklist_rules"
    ADD CONSTRAINT "blacklist_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_templates"
    ADD CONSTRAINT "campaign_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_tags"
    ADD CONSTRAINT "contact_tags_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_tags"
    ADD CONSTRAINT "contact_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_attachments"
    ADD CONSTRAINT "expense_attachments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_items"
    ADD CONSTRAINT "expense_items_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "fk_contact_supplier" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "fk_invoices_quote_id" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inbox_permissions"
    ADD CONSTRAINT "inbox_permissions_grantee_user_id_fkey" FOREIGN KEY ("grantee_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inbox_permissions"
    ADD CONSTRAINT "inbox_permissions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inbox_permissions"
    ADD CONSTRAINT "inbox_permissions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_attachments"
    ADD CONSTRAINT "invoice_attachments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_attachments"
    ADD CONSTRAINT "invoice_attachments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_deliveries"
    ADD CONSTRAINT "invoice_deliveries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_deliveries"
    ADD CONSTRAINT "invoice_deliveries_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_pipeline_stage_id_fkey" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_active_team_id_fkey" FOREIGN KEY ("active_team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_layouts"
    ADD CONSTRAINT "project_layouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."social_posts"
    ADD CONSTRAINT "social_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_asign_id_fkey" FOREIGN KEY ("user_asign_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_credentials"
    ADD CONSTRAINT "team_credentials_connected_by_user_id_fkey" FOREIGN KEY ("connected_by_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_credentials"
    ADD CONSTRAINT "team_credentials_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_credentials"
    ADD CONSTRAINT "team_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_default_pipeline_id_fkey" FOREIGN KEY ("default_pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."ticket_assignments"
    ADD CONSTRAINT "ticket_assignments_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_assignments"
    ADD CONSTRAINT "ticket_assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_assignments"
    ADD CONSTRAINT "ticket_assignments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_credentials"
    ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users to read profiles" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow individual access" ON "public"."user_credentials" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow team members read access" ON "public"."ai_usage_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."team_id" = "ai_usage_log"."team_id") AND ("team_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Allow team members to create pipelines" ON "public"."pipelines" FOR INSERT WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow team members to manage audio jobs" ON "public"."audio_jobs" TO "authenticated" USING (("auth"."uid"() IN ( SELECT "team_members"."user_id"
   FROM "public"."team_members"
  WHERE ("team_members"."team_id" = "audio_jobs"."team_id")))) WITH CHECK (("auth"."uid"() IN ( SELECT "team_members"."user_id"
   FROM "public"."team_members"
  WHERE ("team_members"."team_id" = "audio_jobs"."team_id"))));



CREATE POLICY "Allow team members to read pipelines" ON "public"."pipelines" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow team members to update/delete pipelines" ON "public"."pipelines" USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"())))) WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Els 'admins' poden ACTUALITZAR membres al seu equip actiu" ON "public"."team_members" FOR UPDATE TO "authenticated" USING ((("team_id" = "public"."get_active_team_id"()) AND ("public"."get_active_team_role"() = ANY (ARRAY['owner'::"text", 'admin'::"text"])))) WITH CHECK ((("team_id" = "public"."get_active_team_id"()) AND ("public"."get_active_team_role"() = ANY (ARRAY['owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Els 'admins' poden CREAR invitacions de l'equip actiu" ON "public"."invitations" FOR INSERT TO "authenticated" WITH CHECK ((("team_id" = "public"."get_active_team_id"()) AND ("public"."get_active_team_role"() = ANY (ARRAY['owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Els 'admins' poden ESBORRAR invitacions de l'equip actiu" ON "public"."invitations" FOR DELETE TO "authenticated" USING ((("team_id" = "public"."get_active_team_id"()) AND ("public"."get_active_team_role"() = ANY (ARRAY['owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Els 'admins' poden ESBORRAR membres al seu equip actiu" ON "public"."team_members" FOR DELETE TO "authenticated" USING ((("team_id" = "public"."get_active_team_id"()) AND ("public"."get_active_team_role"() = ANY (ARRAY['owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Els 'admins' poden INSERTAR membres al seu equip actiu" ON "public"."team_members" FOR INSERT TO "authenticated" WITH CHECK ((("team_id" = "public"."get_active_team_id"()) AND ("public"."get_active_team_role"() = ANY (ARRAY['owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Els 'owners' poden ACTUALITZAR el seu equip actiu" ON "public"."teams" FOR UPDATE TO "authenticated" USING ((("id" = "public"."get_active_team_id"()) AND ("public"."get_active_team_role"() = 'owner'::"text"))) WITH CHECK ((("id" = "public"."get_active_team_id"()) AND ("public"."get_active_team_role"() = 'owner'::"text")));



CREATE POLICY "Els membres d'un equip poden crear invitacions" ON "public"."invitations" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_team_member"("team_id"));



CREATE POLICY "Els membres gestionen els adjunts de despesa del seu equip acti" ON "public"."expense_attachments" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els adjunts de factura del seu equip acti" ON "public"."invoice_attachments" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els contactes del seu equip actiu" ON "public"."contacts" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els departaments del seu equip actiu" ON "public"."departments" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els items de despesa del seu equip actiu" ON "public"."expense_items" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els items de factura del seu equip actiu" ON "public"."invoice_items" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els items de pressupost del seu equip act" ON "public"."quote_items" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els pressupostos del seu equip actiu" ON "public"."quotes" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els productes del seu equip actiu" ON "public"."products" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els projectes del seu equip actiu" ON "public"."projects" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els proveïdors del seu equip actiu" ON "public"."suppliers" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen els tags de contacte del seu equip actiu" ON "public"."contact_tags" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen la blacklist del seu equip actiu" ON "public"."blacklist_rules" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen les activitats del seu equip actiu" ON "public"."activities" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen les assignacions de tiquets de l'equip ac" ON "public"."ticket_assignments" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen les campanyes del seu equip actiu" ON "public"."campaigns" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen les despeses del seu equip actiu" ON "public"."expenses" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen les etapes del seu equip actiu" ON "public"."pipeline_stages" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen les ofertes de feina del seu equip actiu" ON "public"."job_postings" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen les oportunitats del seu equip actiu" ON "public"."opportunities" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen les plantilles d'email del seu equip acti" ON "public"."email_templates" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres gestionen les tasques del seu equip actiu" ON "public"."tasks" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres poden ACTUALITZAR factures en 'Draft' del seu equip" ON "public"."invoices" FOR UPDATE TO "authenticated" USING ((("team_id" = "public"."get_active_team_id"()) AND ("status" = 'Draft'::"text"))) WITH CHECK ((("team_id" = "public"."get_active_team_id"()) AND ("status" = 'Draft'::"text")));



CREATE POLICY "Els membres poden CREAR factures pel seu equip actiu" ON "public"."invoices" FOR INSERT TO "authenticated" WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els membres poden ESBORRAR factures en 'Draft' del seu equip" ON "public"."invoices" FOR DELETE TO "authenticated" USING ((("team_id" = "public"."get_active_team_id"()) AND ("status" = 'Draft'::"text")));



CREATE POLICY "Els membres poden VEURE els equips als que pertanyen" ON "public"."teams" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Els membres poden VEURE les factures del seu equip actiu" ON "public"."invoices" FOR SELECT TO "authenticated" USING (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris autenticats poden LLEGIR les subscripcions" ON "public"."team_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Els usuaris poden ACTUALITZAR el seu propi perfil" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Els usuaris poden ACTUALITZAR els seus tiquets o els delegats" ON "public"."tickets" FOR UPDATE TO "authenticated" USING ("public"."can_access_ticket"("user_id")) WITH CHECK ("public"."can_access_ticket"("user_id"));



CREATE POLICY "Els usuaris poden CREAR el seu propi perfil" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Els usuaris poden CREAR els seus propis tiquets" ON "public"."tickets" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Els usuaris poden ESBORRAR els seus tiquets o els delegats" ON "public"."tickets" FOR DELETE TO "authenticated" USING ("public"."can_access_ticket"("user_id"));



CREATE POLICY "Els usuaris poden VEURE el seu propi perfil" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Els usuaris poden VEURE els seus tiquets o els delegats" ON "public"."tickets" FOR SELECT TO "authenticated" USING ("public"."can_access_ticket"("user_id"));



CREATE POLICY "Els usuaris poden crear els seus propis equips" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Els usuaris poden veure les seves pròpies invitacions" ON "public"."invitations" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "La llista de serveis és pública i visible per a tothom" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "Owners and admins can manage inbox permissions." ON "public"."inbox_permissions" TO "authenticated" USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Permetre lectura anònima d'items d'un pressupost públic" ON "public"."quote_items" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_items"."quote_id") AND ("q"."secure_id" IS NOT NULL)))));



CREATE POLICY "Permetre lectura anònima de contactes d'un pressupost públic" ON "public"."contacts" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."contact_id" = "contacts"."id") AND ("q"."secure_id" IS NOT NULL)))));



CREATE POLICY "Permetre lectura anònima de l'equip d'un pressupost públic" ON "public"."teams" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."team_id" = "teams"."id") AND ("q"."secure_id" IS NOT NULL)))));



CREATE POLICY "Permetre lectura anònima de pressupostos públics (secure_id)" ON "public"."quotes" FOR SELECT TO "anon" USING (("secure_id" IS NOT NULL));



CREATE POLICY "Team members can update/insert opportunities" ON "public"."opportunities" USING (("team_id" = "auth"."uid"())) WITH CHECK ((("team_id" = "auth"."uid"()) AND (("pipeline_stage_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."pipeline_stages" "ps"
  WHERE (("ps"."id" = "opportunities"."pipeline_stage_id") AND ("ps"."team_id" = "auth"."uid"())))))));



CREATE POLICY "Team members can view, and admins/owners can manage team creden" ON "public"."team_credentials" USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"())))) WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Team owners and admins can manage subscriptions." ON "public"."subscriptions" TO "authenticated" USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Users can manage their own campaign templates" ON "public"."campaign_templates" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own personal credentials" ON "public"."user_credentials" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own social posts" ON "public"."social_posts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can see contacts from their own team" ON "public"."contacts" FOR SELECT USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users on Plus plans or higher can manage social posts." ON "public"."social_posts" USING ((("team_id" = "public"."get_active_team_id"()) AND ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'active_team_plan'::"text") = ANY (ARRAY['plus'::"text", 'premium'::"text"])))) WITH CHECK ((("team_id" = "public"."get_active_team_id"()) AND ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'active_team_plan'::"text") = ANY (ARRAY['plus'::"text", 'premium'::"text"]))));



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audio_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blacklist_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delete_own_layouts" ON "public"."project_layouts" FOR DELETE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inbox_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_own_layouts" ON "public"."project_layouts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_postings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opportunities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipelines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_layouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_own_layouts" ON "public"."project_layouts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_credentials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "update_own_layouts" ON "public"."project_layouts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."user_credentials" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_invitation"("invitation_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invitation"("invitation_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation"("invitation_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_invitation_and_set_active_team"("invite_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invitation_and_set_active_team"("invite_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation_and_set_active_team"("invite_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_personal_invitation"("invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_personal_invitation"("invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_personal_invitation"("invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_quote_and_create_invoice"("p_secure_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_quote_and_create_invoice"("p_secure_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_quote_and_create_invoice"("p_secure_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_ticket"("ticket_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_ticket"("ticket_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_ticket"("ticket_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_new_organization"("org_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_new_organization"("org_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_new_organization"("org_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_opportunity_on_reply"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_opportunity_on_reply"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_opportunity_on_reply"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_public_profile_for_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_public_profile_for_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_public_profile_for_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_team_with_defaults"("team_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_team_with_defaults"("team_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_team_with_defaults"("team_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_credential"("provider_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_credential"("provider_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_credential"("provider_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_team_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_team_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_team_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_active_team_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_active_team_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_active_team_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_column_valid_values"("p_ref_table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_column_valid_values"("p_ref_table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_column_valid_values"("p_ref_table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_crm_dashboard_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_crm_dashboard_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_crm_dashboard_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_crm_overview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_crm_overview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_crm_overview"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_jwt_claims"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_jwt_claims"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_jwt_claims"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_team_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_team_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_team_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_stats_for_team"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats_for_team"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats_for_team"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_financial_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_financial_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_financial_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_inbox_received_count"("p_visible_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_inbox_received_count"("p_visible_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inbox_received_count"("p_visible_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_inbox_sent_count"("p_visible_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_inbox_sent_count"("p_visible_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inbox_sent_count"("p_visible_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_inbox_tickets"("p_visible_user_ids" "uuid"[], "p_search_term" "text", "p_active_filter" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_inbox_tickets"("p_visible_user_ids" "uuid"[], "p_search_term" "text", "p_active_filter" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inbox_tickets"("p_visible_user_ids" "uuid"[], "p_search_term" "text", "p_active_filter" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_marketing_kpis"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_marketing_kpis"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_marketing_kpis"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_marketing_page_data"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_marketing_page_data"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_marketing_page_data"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_team_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_team_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_team_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quote_details"("p_quote_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_quote_details"("p_quote_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quote_details"("p_quote_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_table_columns"("table_name_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_table_columns"("table_name_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_table_columns"("table_name_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_table_columns_excluding_security"("p_table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_table_columns_excluding_security"("p_table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_table_columns_excluding_security"("p_table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_table_columns_info"("p_table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_table_columns_info"("p_table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_table_columns_info"("p_table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_table_columns_with_types"("p_table_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_table_columns_with_types"("p_table_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_table_columns_with_types"("p_table_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_dashboard_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_dashboard_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_dashboard_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_team_ticket_count"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_team_ticket_count"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_team_ticket_count"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("email_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("email_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("email_to_check" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_team_context"("p_user_id" "uuid", "p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_team_context"("p_user_id" "uuid", "p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_team_context"("p_user_id" "uuid", "p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_team_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_team_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_team_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_lost_opportunity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_lost_opportunity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_lost_opportunity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_onboarding"("p_user_id" "uuid", "p_full_name" "text", "p_company_name" "text", "p_tax_id" "text", "p_website" "text", "p_summary" "text", "p_sector" "text", "p_services" "text"[], "p_phone" "text", "p_email" "text", "p_street" "text", "p_city" "text", "p_postal_code" "text", "p_region" "text", "p_country" "text", "p_latitude" double precision, "p_longitude" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."handle_onboarding"("p_user_id" "uuid", "p_full_name" "text", "p_company_name" "text", "p_tax_id" "text", "p_website" "text", "p_summary" "text", "p_sector" "text", "p_services" "text"[], "p_phone" "text", "p_email" "text", "p_street" "text", "p_city" "text", "p_postal_code" "text", "p_region" "text", "p_country" "text", "p_latitude" double precision, "p_longitude" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_onboarding"("p_user_id" "uuid", "p_full_name" "text", "p_company_name" "text", "p_tax_id" "text", "p_website" "text", "p_summary" "text", "p_sector" "text", "p_services" "text"[], "p_phone" "text", "p_email" "text", "p_street" "text", "p_city" "text", "p_postal_code" "text", "p_region" "text", "p_country" "text", "p_latitude" double precision, "p_longitude" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_onboarding"("p_user_id" "uuid", "p_full_name" "text", "p_email" "text", "p_company_name" "text", "p_tax_id" "text", "p_website" "text", "p_summary" "text", "p_sector" "text", "p_services" "text"[], "p_phone" "text", "p_street" "text", "p_city" "text", "p_postal_code" "text", "p_region" "text", "p_country" "text", "p_latitude" double precision, "p_longitude" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."handle_onboarding"("p_user_id" "uuid", "p_full_name" "text", "p_email" "text", "p_company_name" "text", "p_tax_id" "text", "p_website" "text", "p_summary" "text", "p_sector" "text", "p_services" "text"[], "p_phone" "text", "p_street" "text", "p_city" "text", "p_postal_code" "text", "p_region" "text", "p_country" "text", "p_latitude" double precision, "p_longitude" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_onboarding"("p_user_id" "uuid", "p_full_name" "text", "p_email" "text", "p_company_name" "text", "p_tax_id" "text", "p_website" "text", "p_summary" "text", "p_sector" "text", "p_services" "text"[], "p_phone" "text", "p_street" "text", "p_city" "text", "p_postal_code" "text", "p_region" "text", "p_country" "text", "p_latitude" double precision, "p_longitude" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_opportunity_on_quote_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_opportunity_on_quote_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_opportunity_on_quote_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_quote_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_quote_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_quote_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_invoice_sequence"("p_user_id" "uuid", "p_series" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_invoice_sequence"("p_user_id" "uuid", "p_series" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_invoice_sequence"("p_user_id" "uuid", "p_series" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_contact_on_public_quote"("contact_id_to_check" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."is_contact_on_public_quote"("contact_id_to_check" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_contact_on_public_quote"("contact_id_to_check" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_quote_public"("quote_id_to_check" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."is_quote_public"("quote_id_to_check" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_quote_public"("quote_id_to_check" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_member"("team_id_to_check" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_member"("team_id_to_check" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_member"("team_id_to_check" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_on_public_quote"("team_id_to_check" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_on_public_quote"("team_id_to_check" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_on_public_quote"("team_id_to_check" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_task_activity"("task_id_input" bigint, "new_status_input" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."log_task_activity"("task_id_input" bigint, "new_status_input" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_task_activity"("task_id_input" bigint, "new_status_input" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."log_task_activity"("task_id_input" "uuid", "new_status_input" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."log_task_activity"("task_id_input" "uuid", "new_status_input" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_task_activity"("task_id_input" "uuid", "new_status_input" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_quote_with_reason"("p_secure_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_quote_with_reason"("p_secure_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_quote_with_reason"("p_secure_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON FUNCTION "public"."save_expense_with_items"("p_expense_id_to_update" bigint, "p_user_id" "uuid", "p_team_id" "uuid", "expense_data" "jsonb", "items_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_expense_with_items"("p_expense_id_to_update" bigint, "p_user_id" "uuid", "p_team_id" "uuid", "expense_data" "jsonb", "items_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_expense_with_items"("p_expense_id_to_update" bigint, "p_user_id" "uuid", "p_team_id" "uuid", "expense_data" "jsonb", "items_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_refresh_token"("provider_name" "text", "refresh_token_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_refresh_token"("provider_name" "text", "refresh_token_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_refresh_token"("provider_name" "text", "refresh_token_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_expenses"("p_team_id" "uuid", "p_search_term" "text", "p_category" "text", "p_status" "text", "p_sort_by" "text", "p_sort_order" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_expenses"("p_team_id" "uuid", "p_search_term" "text", "p_category" "text", "p_status" "text", "p_sort_by" "text", "p_sort_order" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_expenses"("p_team_id" "uuid", "p_search_term" "text", "p_category" "text", "p_status" "text", "p_sort_by" "text", "p_sort_order" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_invoices"("search_term" "text", "status_filter" "text", "sort_field" "text", "sort_direction" "text", "page_limit" integer, "page_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_invoices"("search_term" "text", "status_filter" "text", "sort_field" "text", "sort_direction" "text", "page_limit" integer, "page_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_invoices"("search_term" "text", "status_filter" "text", "sort_field" "text", "sort_direction" "text", "page_limit" integer, "page_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_paginated_invoices"("team_id_param" "uuid", "status_param" "text", "contact_id_param" bigint, "search_term_param" "text", "sort_by_param" "text", "sort_order_param" "text", "limit_param" integer, "offset_param" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_paginated_invoices"("team_id_param" "uuid", "status_param" "text", "contact_id_param" bigint, "search_term_param" "text", "sort_by_param" "text", "sort_order_param" "text", "limit_param" integer, "offset_param" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_paginated_invoices"("team_id_param" "uuid", "status_param" "text", "contact_id_param" bigint, "search_term_param" "text", "sort_by_param" "text", "sort_order_param" "text", "limit_param" integer, "offset_param" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."search_paginated_quotes"("team_id_param" "uuid", "status_param" "text", "search_term_param" "text", "sort_by_param" "text", "sort_order_param" "text", "limit_param" integer, "offset_param" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_paginated_quotes"("team_id_param" "uuid", "status_param" "text", "search_term_param" "text", "sort_by_param" "text", "sort_order_param" "text", "limit_param" integer, "offset_param" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_paginated_quotes"("team_id_param" "uuid", "status_param" "text", "search_term_param" "text", "sort_by_param" "text", "sort_order_param" "text", "limit_param" integer, "offset_param" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_pipeline_stage_type"("p_pipeline_id" bigint, "p_team_id" "uuid", "p_stage_id" bigint, "p_stage_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_pipeline_stage_type"("p_pipeline_id" bigint, "p_team_id" "uuid", "p_stage_id" bigint, "p_stage_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_pipeline_stage_type"("p_pipeline_id" bigint, "p_team_id" "uuid", "p_stage_id" bigint, "p_stage_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_proposal_stage_on_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_proposal_stage_on_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_proposal_stage_on_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contact_last_interaction"("contact_id_to_update" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_contact_last_interaction"("contact_id_to_update" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contact_last_interaction"("contact_id_to_update" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_expense_with_items"("p_expense_id" bigint, "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_details" "jsonb", "p_expense_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_expense_with_items"("p_expense_id" bigint, "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_details" "jsonb", "p_expense_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_expense_with_items"("p_expense_id" bigint, "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_details" "jsonb", "p_expense_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_invoice_with_items"("invoice_data" "jsonb", "items_data" "jsonb", "user_id" "uuid", "team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_invoice_with_items"("invoice_data" "jsonb", "items_data" "jsonb", "user_id" "uuid", "team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_invoice_with_items"("invoice_data" "jsonb", "items_data" "jsonb", "user_id" "uuid", "team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_quote_with_items"("quote_payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_quote_with_items"("quote_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_quote_with_items"("quote_payload" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activities_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activities_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activities_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_log" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ai_usage_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ai_usage_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ai_usage_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."audio_jobs" TO "anon";
GRANT ALL ON TABLE "public"."audio_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."audio_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."blacklist_rules" TO "anon";
GRANT ALL ON TABLE "public"."blacklist_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."blacklist_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."blacklist_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."blacklist_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."blacklist_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_templates" TO "anon";
GRANT ALL ON TABLE "public"."campaign_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."campaign_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."campaign_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."campaign_templates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON SEQUENCE "public"."campaigns_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."campaigns_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."campaigns_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contact_tags" TO "anon";
GRANT ALL ON TABLE "public"."contact_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_tags" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contact_tags_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contact_tags_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contact_tags_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contacts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contacts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contacts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."email_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."email_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."email_templates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."enriched_tickets" TO "anon";
GRANT ALL ON TABLE "public"."enriched_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."enriched_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."expense_attachments" TO "anon";
GRANT ALL ON TABLE "public"."expense_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."expense_items" TO "anon";
GRANT ALL ON TABLE "public"."expense_items" TO "authenticated";
GRANT ALL ON TABLE "public"."expense_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inbox_permissions" TO "anon";
GRANT ALL ON TABLE "public"."inbox_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."inbox_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_attachments" TO "anon";
GRANT ALL ON TABLE "public"."invoice_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_attachments" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."invoice_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."job_postings" TO "anon";
GRANT ALL ON TABLE "public"."job_postings" TO "authenticated";
GRANT ALL ON TABLE "public"."job_postings" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."opportunities" TO "anon";
GRANT ALL ON TABLE "public"."opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunities" TO "service_role";



GRANT ALL ON SEQUENCE "public"."opportunities_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."opportunities_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."opportunities_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_stages" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pipeline_stages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pipeline_stages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pipeline_stages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pipelines" TO "anon";
GRANT ALL ON TABLE "public"."pipelines" TO "authenticated";
GRANT ALL ON TABLE "public"."pipelines" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pipelines_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pipelines_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pipelines_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."prices" TO "anon";
GRANT ALL ON TABLE "public"."prices" TO "authenticated";
GRANT ALL ON TABLE "public"."prices" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_layouts" TO "anon";
GRANT ALL ON TABLE "public"."project_layouts" TO "authenticated";
GRANT ALL ON TABLE "public"."project_layouts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_layouts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_layouts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_layouts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."quote_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON SEQUENCE "public"."services_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."services_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."services_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."social_posts" TO "anon";
GRANT ALL ON TABLE "public"."social_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."social_posts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."social_posts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."social_posts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."social_posts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tasks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tasks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tasks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."team_credentials" TO "anon";
GRANT ALL ON TABLE "public"."team_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."team_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."team_members_with_profiles" TO "anon";
GRANT ALL ON TABLE "public"."team_members_with_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members_with_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_assignments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_assignments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_assignments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_assignments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_assignments_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tickets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tickets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tickets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_credentials" TO "anon";
GRANT ALL ON TABLE "public"."user_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."user_credentials" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_credentials_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_credentials_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_credentials_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
