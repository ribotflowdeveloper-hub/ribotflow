

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



CREATE TYPE "public"."invoice_status" AS ENUM (
    'Draft',
    'Sent',
    'Paid',
    'Overdue',
    'Cancelled'
);


ALTER TYPE "public"."invoice_status" OWNER TO "postgres";


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


CREATE TYPE "public"."ticket_status" AS ENUM (
    'Obert',
    'En progrés',
    'Esperant resposta',
    'Tancat',
    'Llegit'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_invitation"("invitation_token" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  invitation_record RECORD;
  current_user_id UUID := auth.uid();
  current_user_email TEXT;
BEGIN
  -- Obtenir dades de l'usuari actual
  SELECT email INTO current_user_email FROM auth.users WHERE id = current_user_id;

  -- 1. Trobar la invitació i bloquejar la fila per evitar 'race conditions'
  SELECT * INTO invitation_record FROM public.invitations
  WHERE token = invitation_token FOR UPDATE;

  -- 2. Validar que la invitació existeix i és per a l'usuari correcte
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitació invàlida o caducada';
  END IF;

  IF invitation_record.email <> current_user_email THEN
    RAISE EXCEPTION 'Aquesta invitació està destinada a un altre usuari';
  END IF;

  -- 3. Inserir el nou membre (ignorant si ja existeix)
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (invitation_record.team_id, current_user_id, invitation_record.role)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  -- 4. Esborrar la invitació
  DELETE FROM public.invitations WHERE id = invitation_record.id;
END;
$$;


ALTER FUNCTION "public"."accept_invitation"("invitation_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_invitation_and_set_active_team"("invite_token" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  invitation_data record;
  subscription_data record;
  user_metadata jsonb;
  requesting_user_id uuid := auth.uid();
  requesting_user_email text := auth.jwt()->>'email';
begin
  -- 1. Validar la invitació i que pertany a l'usuari actual.
  select * into invitation_data from public.invitations
  where token = invite_token and status = 'pending';

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;
  
  if invitation_data.email is not null and invitation_data.email != requesting_user_email then
     raise exception 'INVITATION_FOR_DIFFERENT_USER';
  end if;

  -- 2. Afegir l'usuari a l'equip. Si ja existeix, no facis res (evita l'error de duplicat).
  insert into public.team_members (team_id, user_id, role)
  values (invitation_data.team_id, requesting_user_id, invitation_data.role)
  on conflict (team_id, user_id) do nothing;

  -- 3. Obtenir el pla de l'equip per afegir-lo al token de l'usuari.
  select plan_id, status into subscription_data from public.subscriptions
  where team_id = invitation_data.team_id;
  
  -- 4. Actualitzar les metadades (el token) de l'usuari.
  select raw_app_meta_data from auth.users where id = requesting_user_id into user_metadata;
  
  update auth.users set raw_app_meta_data = user_metadata || jsonb_build_object(
      'active_team_id', invitation_data.team_id,
      'active_team_plan', case when subscription_data.status = 'active' then subscription_data.plan_id else 'free' end
  ) where id = requesting_user_id;

  -- 5. Esborrar la invitació un cop processada.
  delete from public.invitations where id = invitation_data.id;

  return json_build_object('success', true, 'team_id', invitation_data.team_id);
end;
$$;


ALTER FUNCTION "public"."accept_invitation_and_set_active_team"("invite_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_personal_invitation"("invitation_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  invitation_data record;
  subscription_data record;
  user_metadata jsonb;
  requesting_user_id uuid := auth.uid();
begin
  -- 1. Validar la invitació i que pertany a l'usuari que fa la petició.
  select * into invitation_data from public.invitations
  where id = invitation_id and user_id = requesting_user_id and status = 'pending';

  if not found then
    raise exception 'INVALID_INVITATION';
  end if;

  -- 2. Afegir l'usuari a l'equip (si ja hi és, no fa res).
  insert into public.team_members (team_id, user_id, role)
  values (invitation_data.team_id, requesting_user_id, invitation_data.role)
  on conflict (team_id, user_id) do nothing;

  -- 3. Obtenir el pla de l'equip.
  select plan_id, status into subscription_data from public.subscriptions
  where team_id = invitation_data.team_id;
  
  -- 4. Actualitzar les metadades de l'usuari.
  select raw_app_meta_data from auth.users where id = requesting_user_id into user_metadata;
  
  update auth.users set raw_app_meta_data = user_metadata || jsonb_build_object(
      'active_team_id', invitation_data.team_id,
      'active_team_plan', case when subscription_data.status = 'active' then subscription_data.plan_id else 'free' end
  ) where id = requesting_user_id;

  -- 5. Esborrar la invitació.
  delete from public.invitations where id = invitation_data.id;

  return json_build_object('success', true);
end;
$$;


ALTER FUNCTION "public"."accept_personal_invitation"("invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_pipeline_stages"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Inserim les etapes per defecte per al NOU usuari
  INSERT INTO public.pipeline_stages (user_id, name, "position")
  VALUES
    (new.id, 'Prospecte', 1),
    (new.id, 'Contactat', 2),
    (new.id, 'Proposta Enviada', 3),
    (new.id, 'Negociació', 4),
    (new.id, 'Guanyat', 5),
    (new.id, 'Perdut', 6);
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."create_default_pipeline_stages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_new_organization"("org_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_org_id UUID;
  user_id UUID := auth.uid();
BEGIN
  -- Creem la nova organització
  INSERT INTO public.organizations (name, owner_id)
  VALUES (org_name, user_id)
  RETURNING id INTO new_org_id;

  -- Afegim l'usuari creador com a 'owner' a la taula de membres
  INSERT INTO public.members (organization_id, user_id, role)
  VALUES (new_org_id, user_id, 'owner');

  RETURN new_org_id;
END;
$$;


ALTER FUNCTION "public"."create_new_organization"("org_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_opportunity_on_reply"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE stage_id BIGINT;
BEGIN
  IF NEW.type = 'enviat' AND NOT EXISTS (SELECT 1 FROM public.opportunities WHERE contact_id = NEW.contact_id AND status NOT IN ('Won', 'Lost')) THEN
    SELECT id INTO stage_id FROM public.pipeline_stages WHERE name = 'Contactat' LIMIT 1;
    IF stage_id IS NOT NULL THEN
      INSERT INTO public.opportunities (user_id, contact_id, name, value, pipeline_stage_id, status)
      VALUES (NEW.user_id, NEW.contact_id, 'Nova oportunitat per a ' || (SELECT nom FROM contacts WHERE id = NEW.contact_id), 0, stage_id, 'Open');
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
    AS $$
declare
  new_team_id uuid;
  -- auth.uid() obté automàticament l'ID de l'usuari que fa la petició.
  requesting_user_id uuid := auth.uid();
begin
  -- 1. Creem l'equip
  insert into public.teams (name, owner_id)
  values (team_name, requesting_user_id)
  returning id into new_team_id;

  -- 2. Afegim el propietari com a membre
  insert into public.team_members (team_id, user_id, role)
  values (new_team_id, requesting_user_id, 'owner');

  -- 3. Afegim les etapes del pipeline per defecte
  insert into public.pipeline_stages (name, position, team_id, user_id)
  values
    ('Prospecte', 1, new_team_id, requesting_user_id),
    ('Contactat', 2, new_team_id, requesting_user_id),
    ('Proposta Enviada', 3, new_team_id, requesting_user_id),
    ('Negociació', 4, new_team_id, requesting_user_id),
    ('Guanyat', 5, new_team_id, requesting_user_id),
    ('Perdut', 6, new_team_id, requesting_user_id);
    
  return new_team_id;
end;
$$;


ALTER FUNCTION "public"."create_team_with_defaults"("team_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_credential"("provider_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.user_credentials
    WHERE user_id = auth.uid() AND provider = provider_name;
END;
$$;


ALTER FUNCTION "public"."delete_user_credential"("provider_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_active_team_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT nullif(
    current_setting('request.jwt.claims', true)::jsonb
    ->'app_metadata'->>'active_team_id',
    ''
  )::uuid;
$$;


ALTER FUNCTION "public"."get_active_team_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_column_valid_values"("p_ref_table_name" "text", "p_column_name" "text") RETURNS TABLE("value" "text")
    LANGUAGE "plpgsql" STABLE
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


ALTER FUNCTION "public"."get_column_valid_values"("p_ref_table_name" "text", "p_column_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_crm_dashboard_data"() RETURNS json
    LANGUAGE "plpgsql"
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
                'opportunities', (SELECT COUNT(*) FROM public.opportunities WHERE team_id = active_team_id AND stage_name NOT IN ('Guanyat', 'Perdut')),
                'pipelineValue', (SELECT COALESCE(SUM(value), 0) FROM public.opportunities WHERE team_id = active_team_id AND stage_name NOT IN ('Guanyat', 'Perdut')),
                'avgRevenuePerClient', (SELECT AVG(total_invoiced) FROM (SELECT SUM(total_amount) AS total_invoiced FROM public.invoices WHERE team_id = active_team_id GROUP BY contact_id) as client_totals),
                'avgConversionTimeDays', (SELECT AVG(EXTRACT(DAY FROM (last_updated_at - created_at))) FROM public.opportunities WHERE team_id = active_team_id AND stage_name = 'Guanyat')
            ) FROM public.contacts WHERE team_id = active_team_id
        ),
        'funnel', (
            SELECT json_build_object(
                'leads', COUNT(*) FILTER (WHERE estat = 'Lead'),
                'quoted', (SELECT COUNT(DISTINCT contact_id) FROM public.quotes WHERE team_id = active_team_id),
                'clients', (SELECT COUNT(DISTINCT contact_id) FROM public.invoices WHERE team_id = active_team_id)
            ) FROM public.contacts WHERE team_id = active_team_id
        ),

        -- ✅ CORRECCIÓ: Si json_agg és NULL, retorna un array buit '[]'
        'topClients', COALESCE((
            SELECT json_agg(c.* ORDER BY c.total_invoiced DESC) FROM (
                SELECT ct.id, ct.nom, SUM(i.total_amount) as total_invoiced
                FROM public.invoices i JOIN public.contacts ct ON i.contact_id = ct.id
                WHERE i.team_id = active_team_id GROUP BY ct.id, ct.nom
                ORDER BY total_invoiced DESC LIMIT 5
            ) as c
        ), '[]'::json),

        -- ✅ CORRECCIÓ: Si json_agg és NULL, retorna un array buit '[]'
        'coldContacts', COALESCE((
            SELECT json_agg(cc.*) FROM (
                SELECT id, nom, last_interaction_at
                FROM public.contacts
                WHERE team_id = active_team_id AND last_interaction_at < (now() - interval '30 days')
                ORDER BY last_interaction_at ASC LIMIT 5
            ) as cc
        ), '[]'::json),

        -- ✅ CORRECCIÓ: Si json_agg és NULL, retorna un array buit '[]'
        'unreadActivities', COALESCE((
            SELECT json_agg(ua.*) FROM (
                SELECT a.id, a.content, a.created_at, a.contact_id, c.nom as contact_name, c.email as contact_email
                FROM public.activities a JOIN public.contacts c ON a.contact_id = c.id
                WHERE a.team_id = active_team_id AND a.is_read = false
                ORDER BY a.created_at DESC LIMIT 5
            ) as ua
        ), '[]'::json),
        
        -- ✅ CORRECCIÓ: Si json_agg és NULL, retorna un array buit '[]'
        'bestMonths', COALESCE((
            SELECT json_agg(bm.*) FROM (
                SELECT to_char(date_trunc('month', issue_date), 'YYYY-MM') as month, SUM(total_amount) as total
                FROM public.invoices
                WHERE team_id = active_team_id
                GROUP BY month ORDER BY total DESC LIMIT 3
            ) as bm
        ), '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_crm_dashboard_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_crm_overview"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    seven_days_ago DATE;
BEGIN
    seven_days_ago := current_date - interval '7 days';

    RETURN (
        SELECT jsonb_build_object(
            'totalContacts', (SELECT count(*) FROM public.contacts WHERE user_id = auth.uid()),
            'activeClients', (SELECT count(*) FROM public.contacts WHERE user_id = auth.uid() AND estat = 'Client'),
            -- Oportunitats: Leads/Actius amb un valor assignat > 0
            'opportunities', (SELECT count(*) FROM public.contacts WHERE user_id = auth.uid() AND (estat = 'Lead' OR estat = 'Actiu') AND valor > 0),
            -- Valor del Pipeline: Suma del valor d'aquestes oportunitats
            'pipelineValue', (SELECT COALESCE(sum(valor), 0) FROM public.contacts WHERE user_id = auth.uid() AND (estat = 'Lead' OR estat = 'Actiu') AND valor > 0),
            -- Pressupostos actius (Enviats o Esborranys)
            'activeQuotes', (SELECT count(*) FROM public.quotes WHERE user_id = auth.uid() AND (status = 'Sent' OR status = 'Draft')),
            -- Contactes que necessiten atenció
            'attentionCount', (SELECT count(*) FROM public.contacts WHERE user_id = auth.uid() AND last_interaction_at < seven_days_ago)
        )
    );
END;
$$;


ALTER FUNCTION "public"."get_crm_overview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_jwt_claims"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  claims text;
BEGIN
  -- Intentem obtenir els claims del token
  claims := current_setting('request.jwt.claims', true);

  -- ✅ AFEGIM UN LOG A LA BASE DE DADES
  -- Aquest missatge apareixerà als logs del teu projecte de Supabase
  -- (Pots veure'ls a "Project Settings" > "Logs" > "Postgres Logs")
  RAISE LOG '[DB_FUNC] get_current_jwt_claims cridada. Claims trobats: %', claims;

  RETURN claims;
END;
$$;


ALTER FUNCTION "public"."get_current_jwt_claims"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_team_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  team_id_val UUID;
BEGIN
  SELECT team_id INTO team_id_val
  FROM public.team_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN team_id_val;
END;
$$;


ALTER FUNCTION "public"."get_current_team_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"() RETURNS TABLE("total_contacts" bigint, "active_clients" bigint, "opportunities" bigint, "invoiced_current_month" numeric, "invoiced_previous_month" numeric, "pending_total" numeric, "expenses_current_month" numeric, "expenses_previous_month" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    active_team_id UUID; -- Variable per guardar l'ID de l'equip actiu
BEGIN
    -- Obtenim l'ID de l'equip actiu UNA SOLA VEGADA a l'inici de la funció
    active_team_id := public.get_active_team_id();

    -- Si no hi ha equip actiu, no podem calcular res.
    IF active_team_id IS NULL THEN
        RETURN;
    END IF;

    -- Retornem els resultats, afegint el filtre WHERE a cada consulta
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.contacts WHERE team_id = active_team_id) AS total_contacts,
        (SELECT COUNT(DISTINCT contact_id) FROM public.invoices WHERE team_id = active_team_id AND status = 'Paid') AS active_clients,
        (SELECT COUNT(*) FROM public.opportunities WHERE team_id = active_team_id AND stage_name <> 'Guanyat' AND stage_name <> 'Perdut') AS opportunities,
        (SELECT COALESCE(SUM(total_amount), 0) FROM public.invoices WHERE team_id = active_team_id AND date_trunc('month', issue_date) = date_trunc('month', now())) AS invoiced_current_month,
        (SELECT COALESCE(SUM(total_amount), 0) FROM public.invoices WHERE team_id = active_team_id AND date_trunc('month', issue_date) = date_trunc('month', now() - interval '1 month')) AS invoiced_previous_month,
        (SELECT COALESCE(SUM(total_amount), 0) FROM public.invoices WHERE team_id = active_team_id AND status IN ('Sent', 'Overdue')) AS pending_total,
        -- Has d'adaptar les consultes d'expenses si tens una taula per a això
        0::NUMERIC AS expenses_current_month,
        0::NUMERIC AS expenses_previous_month;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats_for_team"("p_team_id" "uuid") RETURNS TABLE("total_contacts" bigint, "active_clients" bigint, "opportunities" bigint, "total_value" numeric, "invoiced_current_month" numeric, "invoiced_previous_month" numeric, "pending_total" numeric, "expenses_current_month" numeric, "expenses_previous_month" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    start_of_current_month DATE;
    start_of_previous_month DATE;
BEGIN
    start_of_current_month := date_trunc('month', current_date);
    start_of_previous_month := date_trunc('month', current_date - interval '1 month');

    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.contacts WHERE team_id = p_team_id) AS total_contacts,
        (SELECT count(*) FROM public.contacts WHERE team_id = p_team_id AND estat = 'Client') AS active_clients,
        (SELECT count(*) FROM public.opportunities WHERE team_id = p_team_id AND stage_name <> 'Guanyada' AND stage_name <> 'Perduda') AS opportunities,
        (SELECT COALESCE(sum(value), 0) FROM public.opportunities WHERE team_id = p_team_id) AS total_value,
        (SELECT COALESCE(sum(total_amount), 0) FROM public.invoices WHERE team_id = p_team_id AND status = 'Paid' AND issue_date >= start_of_current_month) AS invoiced_current_month,
        (SELECT COALESCE(sum(total_amount), 0) FROM public.invoices WHERE team_id = p_team_id AND status = 'Paid' AND issue_date >= start_of_previous_month AND issue_date < start_of_current_month) AS invoiced_previous_month,
        (SELECT COALESCE(sum(total_amount), 0) FROM public.invoices WHERE team_id = p_team_id AND (status = 'Sent' OR status = 'Overdue')) AS pending_total,
        (SELECT COALESCE(sum(total_amount), 0) FROM public.expenses WHERE team_id = p_team_id AND expense_date >= start_of_current_month) AS expenses_current_month,
        (SELECT COALESCE(sum(total_amount), 0) FROM public.expenses WHERE team_id = p_team_id AND expense_date >= start_of_previous_month AND expense_date < start_of_current_month) AS expenses_previous_month;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_stats_for_team"("p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_financial_summary"() RETURNS TABLE("facturat" numeric, "pendent" numeric, "despeses" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH combined_transactions AS (
    -- Seleccionem les factures
    SELECT
      'invoice' AS type,
      total_amount AS amount,
      status,
      issue_date
    FROM public.invoices
    WHERE user_id = auth.uid()

    UNION ALL

    -- Seleccionem les despeses
    SELECT
      'expense' AS type,
      amount,
      NULL AS status, -- Les despeses no tenen status
      expense_date AS issue_date
    FROM public.expenses
    WHERE user_id = auth.uid()
  )
  -- Ara calculem els totals sobre les dades combinades
  SELECT
    COALESCE(SUM(CASE WHEN type = 'invoice' AND status = 'Paid' AND date_trunc('month', issue_date) = date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) AS facturat,
    COALESCE(SUM(CASE WHEN type = 'invoice' AND (status = 'Sent' OR status = 'Overdue') THEN amount ELSE 0 END), 0) AS pendent,
    COALESCE(SUM(CASE WHEN type = 'expense' AND date_trunc('month', issue_date) = date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END), 0) AS despeses
  FROM combined_transactions;
END;
$$;


ALTER FUNCTION "public"."get_financial_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inbox_received_count"("p_visible_user_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.tickets
        WHERE
            tickets.user_id = ANY(p_visible_user_ids) AND
            (tickets.type = 'rebut' OR tickets.type IS NULL)
    );
END;
$$;


ALTER FUNCTION "public"."get_inbox_received_count"("p_visible_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inbox_sent_count"("p_visible_user_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.tickets
        WHERE
            tickets.user_id = ANY(p_visible_user_ids) AND
            tickets.type = 'enviat'
    );
END;
$$;


ALTER FUNCTION "public"."get_inbox_sent_count"("p_visible_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inbox_tickets"("p_user_id" "uuid", "p_team_id" "uuid", "p_visible_user_ids" "uuid"[], "p_limit" integer, "p_offset" integer, "p_search_term" "text") RETURNS TABLE("id" bigint, "user_id" "uuid", "subject" "text", "body" "text", "status" "text", "provider_message_id" "text", "type" "text", "preview" "text", "sent_at" timestamp with time zone, "sender_name" "text", "sender_email" "text", "created_at" timestamp with time zone, "contact_id" bigint, "provider" "text", "attachments" "jsonb", "contacts" json, "assignment" json)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id, t.user_id, t.subject, t.body, t.status, t.provider_message_id, t.type, t.preview,
        t.sent_at, t.sender_name, t.sender_email, t.created_at, t.contact_id, t.provider, t.attachments,
        
        -- ✅ LÒGICA CORREGIDA AMB CASE: Si no hi ha contacte (c.id IS NULL), retorna NULL.
        -- Si sí que n'hi ha, construeix l'objecte JSON.
        CASE
            WHEN c.id IS NOT NULL THEN
                json_build_object('id', c.id, 'nom', c.nom, 'email', c.email, 'empresa', c.empresa)
            ELSE
                NULL
        END AS contacts,
        
        json_build_object('deal_id', ta.deal_id) AS assignment
    FROM
        public.tickets AS t
    LEFT JOIN
        public.contacts AS c ON t.contact_id = c.id
    LEFT JOIN
        public.ticket_assignments AS ta ON t.id = ta.ticket_id AND ta.team_id = p_team_id
    WHERE
        t.user_id = ANY(p_visible_user_ids)
        AND (
            p_search_term IS NULL OR p_search_term = '' OR
            t.subject ILIKE '%' || p_search_term || '%' OR
            t.sender_name ILIKE '%' || p_search_term || '%' OR
            t.sender_email ILIKE '%' || p_search_term || '%'
        )
    ORDER BY
        t.sent_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_inbox_tickets"("p_user_id" "uuid", "p_team_id" "uuid", "p_visible_user_ids" "uuid"[], "p_limit" integer, "p_offset" integer, "p_search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_inbox_tickets"("p_user_id" "text", "p_team_id" "text", "p_visible_user_ids" "text"[], "p_limit" integer, "p_offset" integer, "p_search_term" "text", "p_active_filter" "text") RETURNS TABLE("id" bigint, "created_at" timestamp with time zone, "user_id" "uuid", "contact_id" bigint, "provider" "text", "provider_message_id" "text", "subject" "text", "body" "text", "sender_name" "text", "sender_email" "text", "sent_at" timestamp with time zone, "status" "text", "attachments" "jsonb", "preview" "text", "type" "text", "contact_nom" "text", "contact_email" "text", "profile_full_name" "text", "profile_avatar_url" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    -- ✨ CORRECCIÓ CLAU: Llistem explícitament cada columna en l'ordre correcte.
    -- Això assegura que la sortida de la consulta coincideixi amb la definició de RETURNS TABLE.
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
        public.enriched_tickets as et
    WHERE 
        et.user_id = ANY(p_visible_user_ids::uuid[])
        AND (
            p_search_term IS NULL OR p_search_term = '' OR
            et.subject ILIKE '%' || p_search_term || '%' OR
            et.sender_name ILIKE '%' || p_search_term || '%' OR
            et.sender_email ILIKE '%' || p_search_term || '%' OR
            et.preview ILIKE '%' || p_search_term || '%'
        )
        AND (
            (p_active_filter = 'tots') OR
            (p_active_filter = 'rebuts' AND (et.type = 'rebut' OR et.type IS NULL)) OR
            (p_active_filter = 'enviats' AND et.type = 'enviat') OR
            (p_active_filter = 'noLlegits' AND (et.type = 'rebut' OR et.type IS NULL) AND et.status <> 'Llegit')
        )
    ORDER BY et.sent_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_inbox_tickets"("p_user_id" "text", "p_team_id" "text", "p_visible_user_ids" "text"[], "p_limit" integer, "p_offset" integer, "p_search_term" "text", "p_active_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_marketing_kpis"() RETURNS TABLE("total_leads" bigint, "conversion_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    start_of_current_month DATE;
    total_leads_this_month BIGINT;
    opportunities_from_leads BIGINT;
BEGIN
    start_of_current_month := date_trunc('month', current_date);

    -- Leads = nous contactes creats aquest mes
    SELECT count(*)
    INTO total_leads_this_month
    FROM public.contacts
    WHERE user_id = auth.uid() AND created_at >= start_of_current_month;

    -- Oportunitats = quants d'aquests leads s'han convertit en clients o oportunitats actives
    SELECT count(*)
    INTO opportunities_from_leads
    FROM public.contacts
    WHERE user_id = auth.uid()
      AND created_at >= start_of_current_month
      AND (estat = 'Lead' OR estat = 'Actiu' OR estat = 'Client');

    RETURN QUERY
    SELECT
        total_leads_this_month AS total_leads,
        -- Calculem la taxa de conversió
        CASE
            WHEN total_leads_this_month > 0 THEN (opportunities_from_leads::NUMERIC / total_leads_this_month::NUMERIC) * 100
            ELSE 0
        END AS conversion_rate;
END;
$$;


ALTER FUNCTION "public"."get_marketing_kpis"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_marketing_page_data"("p_team_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            -- Clau 'kpis': conté un objecte amb les mètriques
            'kpis', (
                SELECT json_build_object(
                    -- Calculem el total de contactes de l'equip
                    'totalLeads', COALESCE(count(*), 0),
                    -- Calculem la taxa de conversió (exemple)
                    'conversionRate', COALESCE((count(*) FILTER (WHERE estat = 'Client') * 100.0 / NULLIF(count(*), 0)), 0)
                )
                FROM public.contacts
                WHERE team_id = p_team_id -- ✅ Filtrem per l'ID de l'equip rebut
            ),
            -- Clau 'campaigns': conté un array amb les campanyes
            'campaigns', (
                SELECT COALESCE(json_agg(c), '[]'::json)
                FROM (
                    SELECT id, name, type, status, campaign_date, goal, target_audience, content
                    FROM public.campaigns
                    WHERE team_id = p_team_id -- ✅ Filtrem per l'ID de l'equip rebut
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
    AS $$
DECLARE
  team_id_val UUID;
BEGIN
  SELECT team_id INTO team_id_val
  FROM public.team_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN team_id_val;
END;
$$;


ALTER FUNCTION "public"."get_my_team_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_team_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_team_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_teams"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT team_id
  FROM public.team_members
  WHERE user_id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_teams"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_profiles"() RETURNS TABLE("id" "uuid", "company_name" "text", "logo_url" "text", "summary" "text", "services" "jsonb", "website_url" "text", "latitude" double precision, "longitude" double precision)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT
    p.id,
    p.company_name,
    p.logo_url,
    p.summary,
    p.services,
    p.website_url,
    p.latitude,
    p.longitude
  FROM
    public.profiles p
  WHERE
    p.is_public_profile = TRUE AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL;
$$;


ALTER FUNCTION "public"."get_public_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quote_details"("p_quote_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  quote_data jsonb;
  opportunities_data jsonb;
begin
  -- 1. Obtenim les dades del pressupost i els seus items
  select to_jsonb(q) into quote_data
  from (
    select q.*, jsonb_agg(qi) as items
    from public.quotes q
    left join public.quote_items qi on q.id = qi.quote_id
    where q.id = p_quote_id
    group by q.id
  ) q;

  -- 2. Si el pressupost té un contacte, busquem les seves oportunitats
  if (quote_data->>'contact_id') is not null then
    select jsonb_agg(o) into opportunities_data
    from public.opportunities o
    where o.contact_id = (quote_data->>'contact_id')::bigint;
  else
    opportunities_data := '[]'::jsonb;
  end if;

  -- 3. Retornem un únic objecte JSON amb tota la informació
  return jsonb_build_object(
    'quote', quote_data,
    'opportunities', opportunities_data
  );
end;
$$;


ALTER FUNCTION "public"."get_quote_details"("p_quote_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_table_columns"("table_name_param" "text") RETURNS TABLE("column_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT information_schema.columns.column_name
  FROM information_schema.columns
  WHERE information_schema.columns.table_name = table_name_param;
END;
$$;


ALTER FUNCTION "public"."get_table_columns"("table_name_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_table_columns_excluding_security"("p_table_name" "text") RETURNS SETOF "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY 
  SELECT c.column_name::text
  FROM information_schema.columns c
  WHERE c.table_name = p_table_name 
    AND c.table_schema = 'public'
    -- AFEGIM LA CONDICIÓ D'EXCLUSIÓ AQUÍ:
    AND c.column_name NOT IN ('id', 'user_id', 'team_id');
END;
$$;


ALTER FUNCTION "public"."get_table_columns_excluding_security"("p_table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_table_columns_info"("p_table_name" "text") RETURNS TABLE("column_name" "text", "data_type" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$BEGIN
    RETURN QUERY 
    SELECT 
        c.column_name::text, 
        c.data_type::text -- 👈 CORRECCIÓ: Afegeix el data_type
    FROM 
        information_schema.columns c
    WHERE 
        c.table_name = p_table_name 
        AND c.table_schema = 'public'
        -- Exclusió de columnes del sistema/internes
        AND c.column_name NOT IN ('id', 'user_id', 'team_id'); 
END;$$;


ALTER FUNCTION "public"."get_table_columns_info"("p_table_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_id_by_email"("email_to_check" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  user_id uuid;
begin
  select id from auth.users into user_id where email = email_to_check;
  return user_id;
end;
$$;


ALTER FUNCTION "public"."get_user_id_by_email"("email_to_check" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_lost_opportunity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  stage_id_lost BIGINT;
BEGIN
  -- If the quote is declined or expires, mark the opportunity as lost
  IF (NEW.status = 'Declined' AND OLD.status != 'Declined') OR (NEW.expiry_date < NOW() AND OLD.expiry_date >= NOW()) THEN
    SELECT id INTO stage_id_lost FROM public.pipeline_stages WHERE name = 'Perdut' LIMIT 1;
    
    IF stage_id_lost IS NOT NULL AND NEW.opportunity_id IS NOT NULL THEN
      UPDATE public.opportunities
      SET pipeline_stage_id = stage_id_lost, status = 'Lost'
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


CREATE OR REPLACE FUNCTION "public"."handle_quote_acceptance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  stage_id BIGINT;
BEGIN
  -- Només actuem si l'estat del pressupost canvia a 'Accepted'
  -- i estava en un estat anterior diferent
  IF NEW.status = 'Accepted' AND OLD.status != 'Accepted' THEN
    -- Busquem l'ID de l'etapa 'Guanyat'
    SELECT id INTO stage_id FROM public.pipeline_stages WHERE name = 'Guanyat' LIMIT 1;
    
    -- Actualitzem l'oportunitat associada a 'Guanyat'
    IF stage_id IS NOT NULL AND NEW.opportunity_id IS NOT NULL THEN
      UPDATE public.opportunities
      SET pipeline_stage_id = stage_id, status = 'Won'
      WHERE id = NEW.opportunity_id;
    END IF;

    -- BONUS: Creem un esborrany de factura automàticament
    INSERT INTO public.invoices (user_id, contact_id, quote_id, total_amount, status)
    VALUES (NEW.user_id, NEW.contact_id, NEW.id, NEW.total, 'Draft');

  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_quote_acceptance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_quote_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE 
  stage_id_won BIGINT;
  stage_id_lost BIGINT;
BEGIN
  -- Si s'accepta
  IF NEW.status = 'Accepted' AND OLD.status != 'Accepted' THEN
    SELECT id INTO stage_id_won FROM public.pipeline_stages WHERE name = 'Guanyat' LIMIT 1;
    IF stage_id_won IS NOT NULL AND NEW.opportunity_id IS NOT NULL THEN
      UPDATE public.opportunities SET pipeline_stage_id = stage_id_won, status = 'Won' WHERE id = NEW.opportunity_id;
      -- Opcional: Crear esborrany de factura
      INSERT INTO public.invoices (user_id, contact_id, quote_id, total_amount, status)
      VALUES (NEW.user_id, NEW.contact_id, NEW.id, NEW.total, 'Draft');
    END IF;
  END IF;
  
  -- Si es declina o expira
  IF (NEW.status = 'Declined' AND OLD.status != 'Declined') OR (NEW.expiry_date < NOW() AND (OLD.expiry_date IS NULL OR OLD.expiry_date >= NOW())) THEN
    SELECT id INTO stage_id_lost FROM public.pipeline_stages WHERE name = 'Perdut' LIMIT 1;
    IF stage_id_lost IS NOT NULL AND NEW.opportunity_id IS NOT NULL THEN
      UPDATE public.opportunities SET pipeline_stage_id = stage_id_lost, status = 'Lost' WHERE id = NEW.opportunity_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_quote_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_invoice_sequence"("p_user_id" "uuid", "p_series" "text") RETURNS integer
    LANGUAGE "plpgsql"
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


CREATE OR REPLACE FUNCTION "public"."is_team_member"("team_id_to_check" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE
      team_members.user_id = auth.uid() AND
      team_members.team_id = team_id_to_check
  );
$$;


ALTER FUNCTION "public"."is_team_member"("team_id_to_check" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" bigint, "content" "text", "metadata" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where 1 - (d.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;


ALTER FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";

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
    "team_id" "uuid"
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_expense_with_items"("expense_data" "jsonb", "items_data" "jsonb", "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_id_to_update" bigint DEFAULT NULL::bigint) RETURNS SETOF "public"."expenses"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
        -- 'jsonb_to_recordset' converteix un array de JSON en files que podem inserir directament
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


ALTER FUNCTION "public"."save_expense_with_items"("expense_data" "jsonb", "items_data" "jsonb", "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_id_to_update" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_refresh_token"("provider_name" "text", "refresh_token_value" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.user_credentials (user_id, provider, refresh_token)
    VALUES (auth.uid(), provider_name, refresh_token_value)
    ON CONFLICT (user_id, provider)
    DO UPDATE SET refresh_token = EXCLUDED.refresh_token;
END;
$$;


ALTER FUNCTION "public"."save_refresh_token"("provider_name" "text", "refresh_token_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contact_last_interaction"("contact_id_to_update" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.contacts
  SET last_interaction_at = NOW()
  WHERE id = contact_id_to_update;
END;
$$;


ALTER FUNCTION "public"."update_contact_last_interaction"("contact_id_to_update" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pipeline_on_quote_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE stage_id BIGINT;
BEGIN
  IF NEW.opportunity_id IS NOT NULL THEN
    SELECT id INTO stage_id FROM public.pipeline_stages WHERE name = 'Proposta Enviada' LIMIT 1;
    IF stage_id IS NOT NULL THEN
      UPDATE public.opportunities SET pipeline_stage_id = stage_id WHERE id = NEW.opportunity_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pipeline_on_quote_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_expense_with_items"("p_expense_id" bigint, "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_details" "jsonb", "p_expense_items" "jsonb") RETURNS TABLE("id" bigint, "user_id" "uuid", "description" "text", "total_amount" numeric, "expense_date" "date", "category" "text", "created_at" timestamp with time zone, "invoice_number" "text", "tax_amount" numeric, "extra_data" "jsonb", "supplier_id" "uuid", "subtotal" numeric, "discount_amount" numeric, "notes" "text", "tax_rate" numeric, "team_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_saved_expense_id BIGINT;
    item JSONB;
BEGIN
    -- Comprovem si estem actualitzant o creant
    IF p_expense_id IS NOT NULL THEN
        -- ACTUALITZACIÓ
        UPDATE expenses
        SET
            description     = p_expense_details->>'description',
            total_amount    = (p_expense_details->>'total_amount')::NUMERIC,
            expense_date    = (p_expense_details->>'expense_date')::DATE,
            category        = p_expense_details->>'category',
            invoice_number  = p_expense_details->>'invoice_number',
            tax_amount      = (p_expense_details->>'tax_amount')::NUMERIC,
            extra_data      = (p_expense_details->>'extra_data')::JSONB,
            -- Fem servir NULLIF per evitar errors si el camp ve buit enlloc de nul
            supplier_id     = NULLIF(p_expense_details->>'supplier_id', '')::UUID,
            subtotal        = (p_expense_details->>'subtotal')::NUMERIC,
            discount_amount = (p_expense_details->>'discount_amount')::NUMERIC,
            notes           = p_expense_details->>'notes',
            tax_rate        = (p_expense_details->>'tax_rate')::NUMERIC
        WHERE expenses.id = p_expense_id AND expenses.team_id = p_team_id
        RETURNING expenses.id INTO v_saved_expense_id;
    ELSE
        -- CREACIÓ
        INSERT INTO expenses (
            team_id, user_id, description, total_amount, expense_date, category,
            invoice_number, tax_amount, extra_data, supplier_id, subtotal,
            discount_amount, notes, tax_rate
        )
        VALUES (
            p_team_id, p_user_id, p_expense_details->>'description',
            (p_expense_details->>'total_amount')::NUMERIC, (p_expense_details->>'expense_date')::DATE,
            p_expense_details->>'category', p_expense_details->>'invoice_number',
            (p_expense_details->>'tax_amount')::NUMERIC, (p_expense_details->>'extra_data')::JSONB,
            NULLIF(p_expense_details->>'supplier_id', '')::UUID, (p_expense_details->>'subtotal')::NUMERIC,
            (p_expense_details->>'discount_amount')::NUMERIC, p_expense_details->>'notes',
            (p_expense_details->>'tax_rate')::NUMERIC
        )
        RETURNING expenses.id INTO v_saved_expense_id;
    END IF;

    -- Processem els ítems de la despesa
    IF v_saved_expense_id IS NOT NULL AND p_expense_items IS NOT NULL THEN
        -- Primer, esborrem tots els ítems antics associats
        DELETE FROM expense_items WHERE expense_id = v_saved_expense_id;

        -- Després, inserim els nous ítems recorrent l'array JSON
        FOR item IN SELECT * FROM jsonb_array_elements(p_expense_items)
        LOOP
            INSERT INTO expense_items (
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

    -- Finalment, retornem la fila completa de la despesa que hem desat
    RETURN QUERY SELECT * FROM expenses WHERE expenses.id = v_saved_expense_id;
END;
$$;


ALTER FUNCTION "public"."upsert_expense_with_items"("p_expense_id" bigint, "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_details" "jsonb", "p_expense_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_invoice_with_items"("invoice_data" "jsonb", "items_data" "jsonb", "user_id" "uuid", "team_id" "uuid") RETURNS TABLE("generated_invoice_id" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    saved_invoice_id bigint;
    invoice_contact_id bigint;
BEGIN
    invoice_contact_id := (invoice_data->>'contact_id')::bigint;

    INSERT INTO public.invoices (id, contact_id, issue_date, due_date, status, subtotal, tax_amount, total_amount, notes, user_id, team_id)
    VALUES (
        (invoice_data->>'id')::bigint,
        invoice_contact_id,
        (invoice_data->>'issue_date')::timestamptz,
        (invoice_data->>'due_date')::timestamptz,
        'Draft',
        (invoice_data->>'subtotal')::numeric,
        (invoice_data->>'tax_amount')::numeric,
        (invoice_data->>'total_amount')::numeric,
        invoice_data->>'notes',
        user_id,
        team_id
    )
    ON CONFLICT (id) DO UPDATE SET
        contact_id = EXCLUDED.contact_id,
        issue_date = EXCLUDED.issue_date,
        due_date = EXCLUDED.due_date,
        subtotal = EXCLUDED.subtotal,
        tax_amount = EXCLUDED.tax_amount,
        total_amount = EXCLUDED.total_amount,
        notes = EXCLUDED.notes -- <-- ✅ HEM ELIMINAT EL PUNT I COMA D'AQUÍ
    RETURNING public.invoices.id INTO saved_invoice_id;
    
    IF saved_invoice_id IS NULL THEN
        saved_invoice_id := (invoice_data->>'id')::bigint;
        IF saved_invoice_id IS NULL THEN
            SELECT i.id INTO saved_invoice_id 
            FROM public.invoices i
            WHERE i.user_id = user_id AND i.team_id = team_id
            ORDER BY created_at DESC LIMIT 1;
        END IF;
    END IF;

    DELETE FROM public.invoice_items WHERE invoice_id = saved_invoice_id;

    IF jsonb_array_length(items_data) > 0 THEN
        INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, user_id, team_id)
        SELECT
            saved_invoice_id,
            (item->>'product_id')::bigint,
            item->>'description',
            (item->>'quantity')::numeric,
            (item->>'unit_price')::numeric,
            (item->>'tax_rate')::numeric,
            user_id,
            team_id
        FROM jsonb_to_recordset(items_data) AS item(
            product_id text, description text, quantity text, unit_price text, tax_rate text
        );
    END IF;

    RETURN QUERY SELECT saved_invoice_id;
END;
$$;


ALTER FUNCTION "public"."upsert_invoice_with_items"("invoice_data" "jsonb", "items_data" "jsonb", "user_id" "uuid", "team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_quote_with_items"("quote_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  final_quote_id bigint;
  user_id uuid := auth.uid();
  v_team_id uuid := (SELECT raw_app_meta_data->>'active_team_id' FROM auth.users WHERE id = auth.uid())::uuid;
  item_record jsonb;
BEGIN
  -- ... (Tota la primera part de la funció per a inserir/actualitzar el 'quote' principal no canvia) ...
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

  -- ✅ AQUESTA ÉS LA SECCIÓ CORREGIDA
  IF jsonb_typeof(quote_payload->'items') = 'array' AND jsonb_array_length(quote_payload->'items') > 0 THEN
    FOR item_record IN SELECT * FROM jsonb_array_elements(quote_payload->'items') LOOP
      INSERT INTO public.quote_items (
        -- Afegim 'total' a la llista de columnes
        quote_id, product_id, description, quantity, unit_price, total, user_id, team_id
      )
      VALUES (
        final_quote_id, (item_record->>'product_id')::bigint, item_record->>'description',
        (item_record->>'quantity')::numeric, (item_record->>'unit_price')::numeric,
        -- Calculem el total de la línia: quantitat * preu
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
    "team_id" "uuid"
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


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


CREATE OR REPLACE VIEW "public"."enriched_tickets" AS
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
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoice_attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" bigint NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric DEFAULT 1 NOT NULL,
    "unit_price" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "product_id" bigint,
    "tax_rate" numeric DEFAULT 0.21,
    "team_id" "uuid",
    "total" numeric
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
    "team_id" "uuid"
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
    "finish_date" timestamp with time zone
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tasks"."user_asign_id" IS 'Usuario asignado';



COMMENT ON COLUMN "public"."tasks"."asigned_date" IS 'Data assignació';



COMMENT ON COLUMN "public"."tasks"."duration" IS 'Duració';



COMMENT ON COLUMN "public"."tasks"."finish_date" IS 'Finish Date';



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


CREATE OR REPLACE VIEW "public"."team_members_with_profiles" AS
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
    "longitude" numeric
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



ALTER TABLE ONLY "public"."invoice_items"
    ADD CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_verifactu_uuid_key" UNIQUE ("verifactu_uuid");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_contacts_created_at_desc" ON "public"."contacts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_contacts_user_id" ON "public"."contacts" USING "btree" ("user_id");



CREATE INDEX "idx_contacts_user_id_created_at" ON "public"."contacts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_contacts_user_id_last_interaction" ON "public"."contacts" USING "btree" ("user_id", "last_interaction_at");



CREATE INDEX "idx_invoices_user_id_status" ON "public"."invoices" USING "btree" ("user_id", "status");



CREATE INDEX "idx_opportunities_user_id" ON "public"."opportunities" USING "btree" ("user_id");



CREATE INDEX "idx_opportunities_user_id_stage_name" ON "public"."opportunities" USING "btree" ("user_id", "stage_name");



CREATE INDEX "idx_pipeline_stages_user_id" ON "public"."pipeline_stages" USING "btree" ("user_id");



CREATE INDEX "idx_quotes_team_id_sequence_number" ON "public"."quotes" USING "btree" ("team_id", "sequence_number" DESC);



CREATE INDEX "idx_quotes_user_id" ON "public"."quotes" USING "btree" ("user_id");



CREATE INDEX "ticket_assignments_deal_id_idx" ON "public"."ticket_assignments" USING "btree" ("deal_id");



CREATE INDEX "ticket_assignments_team_id_idx" ON "public"."ticket_assignments" USING "btree" ("team_id");



CREATE INDEX "ticket_assignments_ticket_id_idx" ON "public"."ticket_assignments" USING "btree" ("ticket_id");



CREATE OR REPLACE TRIGGER "on_invoices_updated" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_user_credentials_update" BEFORE UPDATE ON "public"."user_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



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
    ADD CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "invoices_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "pipeline_stages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



CREATE POLICY "Allow access based on active team" ON "public"."invoice_items" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Allow access based on active team" ON "public"."products" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Allow members to read their own team" ON "public"."teams" FOR SELECT USING (("id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Allow owner to update their team" ON "public"."teams" FOR UPDATE USING (("id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = 'owner'::"text")))));



CREATE POLICY "Allow public read access to profiles" ON "public"."profiles" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow public read access to quote items" ON "public"."quote_items" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow public read on profiles" ON "public"."profiles" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow public read on quote_items" ON "public"."quote_items" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Allow team members to see each other's profiles" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR (EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."team_id" IN ( SELECT "team_members_1"."team_id"
           FROM "public"."team_members" "team_members_1"
          WHERE ("team_members_1"."user_id" = "profiles"."id"))))))));



CREATE POLICY "Allow users full access to their own attachments" ON "public"."invoice_attachments" USING (("auth"."uid"() = ( SELECT "invoices"."user_id"
   FROM "public"."invoices"
  WHERE ("invoices"."id" = "invoice_attachments"."invoice_id"))));



CREATE POLICY "Allow users full access to their own expense attachments" ON "public"."expense_attachments" USING (("auth"."uid"() = ( SELECT "expenses"."user_id"
   FROM "public"."expenses"
  WHERE ("expenses"."id" = "expense_attachments"."expense_id"))));



CREATE POLICY "Allow users full access to their own invoice items" ON "public"."invoice_items" USING (("auth"."uid"() = ( SELECT "invoices"."user_id"
   FROM "public"."invoices"
  WHERE ("invoices"."id" = "invoice_items"."invoice_id"))));



CREATE POLICY "Authenticated users can view teams." ON "public"."teams" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Els membres d'un equip poden crear invitacions" ON "public"."invitations" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_team_member"("team_id"));



CREATE POLICY "Els membres d'un equip poden gestionar les assignacions" ON "public"."ticket_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."team_id" = "ticket_assignments"."team_id")))));



CREATE POLICY "Els membres d'un equip poden veure les assignacions" ON "public"."ticket_assignments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."team_id" = "ticket_assignments"."team_id")))));



CREATE POLICY "Els membres de l'equip gestionen la seva blacklist" ON "public"."blacklist_rules" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris gestionen els adjunts de despesa del seu equip" ON "public"."expense_attachments" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris gestionen els productes del seu equip actiu" ON "public"."products" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris gestionen els proveïdors del seu equip" ON "public"."suppliers" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris gestionen els ítems de despesa del seu equip" ON "public"."expense_items" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris gestionen les activitats del seu equip actiu" ON "public"."activities" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris gestionen les despeses del seu equip" ON "public"."expenses" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris gestionen les etapes del seu equip actiu" ON "public"."pipeline_stages" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris gestionen les factures del seu equip actiu" ON "public"."invoices" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris gestionen les oportunitats del seu equip actiu" ON "public"."opportunities" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris gestionen les tasques del seu equip actiu" ON "public"."tasks" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Els usuaris només poden veure els seus propis tiquets." ON "public"."tickets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Els usuaris poden actualitzar el seu propi perfil" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Els usuaris poden actualitzar els seus tiquets i els permesos" ON "public"."tickets" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."inbox_permissions"
  WHERE (("inbox_permissions"."grantee_user_id" = "auth"."uid"()) AND ("inbox_permissions"."target_user_id" = "tickets"."user_id"))))));



CREATE POLICY "Els usuaris poden crear els seus propis equips" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Els usuaris poden crear els seus propis tiquets" ON "public"."tickets" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Els usuaris poden eliminar les seves pròpies plantilles" ON "public"."email_templates" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Els usuaris poden esborrar els seus tiquets i els permesos" ON "public"."tickets" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."inbox_permissions"
  WHERE (("inbox_permissions"."grantee_user_id" = "auth"."uid"()) AND ("inbox_permissions"."target_user_id" = "tickets"."user_id"))))));



CREATE POLICY "Els usuaris poden gestionar els contactes del seu equip actiu" ON "public"."contacts" USING (("team_id" = (((("auth"."jwt"() ->> 'app_metadata'::"text"))::"jsonb" ->> 'active_team_id'::"text"))::"uuid")) WITH CHECK (("team_id" = (((("auth"."jwt"() ->> 'app_metadata'::"text"))::"jsonb" ->> 'active_team_id'::"text"))::"uuid"));



CREATE POLICY "Els usuaris poden gestionar les línies dels seus pressupostos" ON "public"."quote_items" USING ((( SELECT "quotes"."user_id"
   FROM "public"."quotes"
  WHERE ("quotes"."id" = "quote_items"."quote_id")) = "auth"."uid"()));



CREATE POLICY "Els usuaris poden veure el seu propi perfil" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Els usuaris poden veure els contactes del seu equip actiu" ON "public"."contacts" FOR SELECT USING (("team_id" = (((("auth"."jwt"() ->> 'app_metadata'::"text"))::"jsonb" ->> 'active_team_id'::"text"))::"uuid"));



CREATE POLICY "Els usuaris poden veure els seus tiquets i els permesos" ON "public"."tickets" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."inbox_permissions"
  WHERE (("inbox_permissions"."grantee_user_id" = "auth"."uid"()) AND ("inbox_permissions"."target_user_id" = "tickets"."user_id"))))));



CREATE POLICY "Els usuaris poden veure les seves pròpies invitacions" ON "public"."invitations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "La llista de serveis és pública i visible per a tothom" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "Owners and admins can manage inbox permissions." ON "public"."inbox_permissions" USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Permetre lectura pública d'equips" ON "public"."teams" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Permetre lectura pública de pressupostos" ON "public"."quotes" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Team members can manage their own departments" ON "public"."departments" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Team members can view, and admins/owners can manage team creden" ON "public"."team_credentials" USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"())))) WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Team owners and admins can manage subscriptions." ON "public"."subscriptions" USING (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"())))) WITH CHECK (("team_id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE (("team_members"."user_id" = "auth"."uid"()) AND ("team_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "Users can create and update their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage activities for their active team." ON "public"."activities" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage activities of their active team." ON "public"."activities" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage campaigns for their active team." ON "public"."campaigns" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage expenses for their active team." ON "public"."expenses" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage expenses of their active team." ON "public"."expenses" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage opportunities for their active team." ON "public"."opportunities" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage opportunities of their active team." ON "public"."opportunities" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage products for their active team." ON "public"."products" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage products of their active team." ON "public"."products" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage quote items for their active team." ON "public"."quote_items" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage quotes for their active team." ON "public"."quotes" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage quotes of their active team." ON "public"."quotes" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage stages for their active team." ON "public"."pipeline_stages" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage suppliers for their active team." ON "public"."suppliers" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage suppliers of their active team." ON "public"."suppliers" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage tags for their active team." ON "public"."contact_tags" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage tasks for their active team." ON "public"."tasks" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage tasks of their active team." ON "public"."tasks" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage templates for their active team." ON "public"."email_templates" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users can manage their own blacklist rules" ON "public"."blacklist_rules" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own campaign templates" ON "public"."campaign_templates" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own campaigns" ON "public"."campaigns" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own email templates" ON "public"."email_templates" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own expense items" ON "public"."expense_items" USING (("auth"."uid"() = ( SELECT "expenses"."user_id"
   FROM "public"."expenses"
  WHERE ("expenses"."id" = "expense_items"."expense_id"))));



CREATE POLICY "Users can manage their own personal credentials" ON "public"."user_credentials" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own pipeline stages" ON "public"."pipeline_stages" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own profile." ON "public"."profiles" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage their own quote items" ON "public"."quote_items" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their own social posts" ON "public"."social_posts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view and update their own profile." ON "public"."profiles" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view members of their own team." ON "public"."team_members" FOR SELECT USING (("team_id" IN ( SELECT "team_members_1"."team_id"
   FROM "public"."team_members" "team_members_1"
  WHERE ("team_members_1"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view teams they are a member of." ON "public"."teams" FOR SELECT USING (("id" IN ( SELECT "team_members"."team_id"
   FROM "public"."team_members"
  WHERE ("team_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own membership." ON "public"."team_members" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users manage quote items for their active team" ON "public"."quote_items" TO "authenticated" USING (("team_id" = "public"."get_active_team_id"())) WITH CHECK (("team_id" = "public"."get_active_team_id"()));



CREATE POLICY "Users on Plus plans or higher can manage social posts." ON "public"."social_posts" USING ((("team_id" = "public"."get_active_team_id"()) AND ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'active_team_plan'::"text") = ANY (ARRAY['plus'::"text", 'premium'::"text"])))) WITH CHECK ((("team_id" = "public"."get_active_team_id"()) AND ((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'active_team_plan'::"text") = ANY (ARRAY['plus'::"text", 'premium'::"text"]))));



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


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



ALTER TABLE "public"."invoice_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opportunities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_layouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select_own_layouts" ON "public"."project_layouts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_credentials" ENABLE ROW LEVEL SECURITY;


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



GRANT ALL ON FUNCTION "public"."create_default_pipeline_stages"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_pipeline_stages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_pipeline_stages"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_column_valid_values"("p_ref_table_name" "text", "p_column_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_column_valid_values"("p_ref_table_name" "text", "p_column_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_column_valid_values"("p_ref_table_name" "text", "p_column_name" "text") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_inbox_tickets"("p_user_id" "uuid", "p_team_id" "uuid", "p_visible_user_ids" "uuid"[], "p_limit" integer, "p_offset" integer, "p_search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_inbox_tickets"("p_user_id" "uuid", "p_team_id" "uuid", "p_visible_user_ids" "uuid"[], "p_limit" integer, "p_offset" integer, "p_search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inbox_tickets"("p_user_id" "uuid", "p_team_id" "uuid", "p_visible_user_ids" "uuid"[], "p_limit" integer, "p_offset" integer, "p_search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_inbox_tickets"("p_user_id" "text", "p_team_id" "text", "p_visible_user_ids" "text"[], "p_limit" integer, "p_offset" integer, "p_search_term" "text", "p_active_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_inbox_tickets"("p_user_id" "text", "p_team_id" "text", "p_visible_user_ids" "text"[], "p_limit" integer, "p_offset" integer, "p_search_term" "text", "p_active_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inbox_tickets"("p_user_id" "text", "p_team_id" "text", "p_visible_user_ids" "text"[], "p_limit" integer, "p_offset" integer, "p_search_term" "text", "p_active_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_marketing_kpis"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_marketing_kpis"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_marketing_kpis"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_marketing_page_data"("p_team_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_marketing_page_data"("p_team_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_marketing_page_data"("p_team_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_team_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_team_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_team_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_team_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_team_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_team_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_teams"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_profiles"() TO "service_role";



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



GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("email_to_check" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("email_to_check" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("email_to_check" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_lost_opportunity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_lost_opportunity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_lost_opportunity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_quote_acceptance"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_quote_acceptance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_quote_acceptance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_quote_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_quote_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_quote_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_invoice_sequence"("p_user_id" "uuid", "p_series" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_invoice_sequence"("p_user_id" "uuid", "p_series" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_invoice_sequence"("p_user_id" "uuid", "p_series" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_team_member"("team_id_to_check" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_team_member"("team_id_to_check" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_team_member"("team_id_to_check" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON FUNCTION "public"."save_expense_with_items"("expense_data" "jsonb", "items_data" "jsonb", "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_id_to_update" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."save_expense_with_items"("expense_data" "jsonb", "items_data" "jsonb", "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_id_to_update" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_expense_with_items"("expense_data" "jsonb", "items_data" "jsonb", "p_team_id" "uuid", "p_user_id" "uuid", "p_expense_id_to_update" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."save_refresh_token"("provider_name" "text", "refresh_token_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_refresh_token"("provider_name" "text", "refresh_token_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_refresh_token"("provider_name" "text", "refresh_token_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contact_last_interaction"("contact_id_to_update" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."update_contact_last_interaction"("contact_id_to_update" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contact_last_interaction"("contact_id_to_update" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_pipeline_on_quote_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_pipeline_on_quote_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_pipeline_on_quote_creation"() TO "service_role";



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



GRANT ALL ON TABLE "public"."invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoices_id_seq" TO "service_role";



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
