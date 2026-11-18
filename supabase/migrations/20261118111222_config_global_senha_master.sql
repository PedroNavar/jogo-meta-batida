-- Infra pra criar cliente novo pelo admin ("Novo cliente"). Senha MASTER, separada de
-- qualquer tenant (ninguém, nem admin de um cliente, pode criar outro cliente) — mesmo
-- padrão de hash (pgcrypto/bcrypt) já usado pra gerente/admin de tenant.
create table if not exists config_global (
  id boolean primary key default true,
  senha_master_hash text not null,
  constraint config_global_singleton check (id)
);

create or replace function verificar_senha_master(p_senha text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select senha_master_hash = crypt(p_senha, senha_master_hash) from config_global where id = true;
$$;

create or replace function definir_senha_master(p_senha text)
returns void language sql security definer set search_path = public, extensions as $$
  insert into config_global (id, senha_master_hash) values (true, crypt(p_senha, gen_salt('bf')))
  on conflict (id) do update set senha_master_hash = excluded.senha_master_hash;
$$;
