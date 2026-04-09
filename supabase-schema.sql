-- Execute esse SQL no Supabase (SQL Editor)

create table clientes (
  id uuid default gen_random_uuid() primary key,
  nome_empresa text not null,
  nome_responsavel text not null,
  whatsapp text not null,
  plano integer not null default 1,
  valor_mensal numeric(10,2) not null,
  locais text[] default '{}',
  created_at timestamp with time zone default now()
);

create table contratos (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clientes(id) on delete cascade,
  data_inicio date not null,
  duracao_meses integer not null,
  data_fim date not null,
  status text default 'ativo',
  created_at timestamp with time zone default now()
);

create table relatorios (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clientes(id) on delete cascade,
  mes_referencia date not null,
  total_exibicoes integer,
  media_diaria numeric(10,2),
  enviado boolean default false,
  data_envio timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Liberar acesso público (sem autenticação por enquanto)
alter table clientes enable row level security;
alter table contratos enable row level security;
alter table relatorios enable row level security;

create policy "acesso total" on clientes for all using (true) with check (true);
create policy "acesso total" on contratos for all using (true) with check (true);
create policy "acesso total" on relatorios for all using (true) with check (true);
