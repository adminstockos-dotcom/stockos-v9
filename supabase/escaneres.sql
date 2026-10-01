-- STOCKOS - BODEGAS Y CENTROS (reemplaza a escaneres)
-- Para empresa 9 y todas las empresas

drop table if exists escaneres cascade;

create table public.bodegas_centros (
  id uuid primary key default gen_random_uuid(),
  empresa_id text not null,
  letra text not null,
  sucursal text not null,
  bodega text not null,
  encargado text,
  pistolas text,
  estado text default 'En línea',
  created_at timestamp default now()
);

-- Habilitar RLS
alter table public.bodegas_centros enable row level security;

-- Políticas: todo permitido (luego lo ajustamos por roles)
create policy "Permitir todo bodegas_centros" on public.bodegas_centros for all using (true) with check (true);

-- Indice por empresa
create index idx_bodegas_empresa on public.bodegas_centros(empresa_id);