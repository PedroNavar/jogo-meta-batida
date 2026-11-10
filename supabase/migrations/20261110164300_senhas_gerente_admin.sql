-- Funções de senha (hash bcrypt via pgcrypto) para gerente/admin por tenant.
-- Mantêm o hash só dentro do Postgres: a Edge Function nunca lê nem compara
-- o hash diretamente, só chama estas funções via RPC.
create or replace function verificar_senha_gerente(p_tenant_id uuid, p_senha text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select senha_gerente_hash = crypt(p_senha, senha_gerente_hash) from tenant where id = p_tenant_id;
$$;

create or replace function verificar_senha_admin(p_tenant_id uuid, p_senha text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select senha_admin_hash = crypt(p_senha, senha_admin_hash) from tenant where id = p_tenant_id;
$$;

create or replace function definir_senha_gerente(p_tenant_id uuid, p_senha text)
returns void language sql security definer set search_path = public, extensions as $$
  update tenant set senha_gerente_hash = crypt(p_senha, gen_salt('bf')) where id = p_tenant_id;
$$;

create or replace function definir_senha_admin(p_tenant_id uuid, p_senha text)
returns void language sql security definer set search_path = public, extensions as $$
  update tenant set senha_admin_hash = crypt(p_senha, gen_salt('bf')) where id = p_tenant_id;
$$;

-- As senhas de teste da Sipolatti foram definidas à parte (via definir_senha_gerente/
-- definir_senha_admin), fora do controle de versão — repo é público, senha nunca entra
-- em texto puro aqui. Troca o placeholder 'TODO-hash' só se ainda não tiver sido setada.
