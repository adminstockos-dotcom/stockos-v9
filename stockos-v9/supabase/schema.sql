-- ============================================================
-- STOCKOS v9 — Esquema de base de datos Supabase (PostgreSQL)
-- ============================================================

-- Tabla: empresas
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  rut text,
  direccion text,
  telefono text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabla: productos
CREATE TABLE IF NOT EXISTS public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  sku text NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  stock_actual integer NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo integer NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
  precio_costo numeric(12,2) NOT NULL DEFAULT 0,
  precio_venta numeric(12,2) NOT NULL DEFAULT 0,
  categoria_abc text NOT NULL DEFAULT 'C' CHECK (categoria_abc IN ('A','B','C')),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_productos_empresa ON public.productos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_productos_abc ON public.productos(categoria_abc);

-- Tabla: campañas (Facebook Ads)
CREATE TABLE IF NOT EXISTS public.campanias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  estado text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','pausada','finalizada')),
  presupuesto_diario numeric(12,2) NOT NULL DEFAULT 0,
  gasto_total numeric(12,2) NOT NULL DEFAULT 0,
  impresiones integer NOT NULL DEFAULT 0,
  clics integer NOT NULL DEFAULT 0,
  conversiones integer NOT NULL DEFAULT 0,
  fecha_inicio date NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin date,
  facebook_campaign_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanias_empresa ON public.campanias(empresa_id);

-- Tabla: despachos
CREATE TABLE IF NOT EXISTS public.despachos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES public.productos(id) ON DELETE SET NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_camino','entregado','cancelado')),
  destinatario text NOT NULL,
  direccion text NOT NULL,
  numero_seguimiento text,
  fecha_despacho date NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_despachos_empresa ON public.despachos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_despachos_estado ON public.despachos(estado);

-- Tabla: pagos
CREATE TABLE IF NOT EXISTS public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  monto numeric(12,2) NOT NULL CHECK (monto > 0),
  metodo text NOT NULL DEFAULT 'transferencia' CHECK (metodo IN ('efectivo','tarjeta','transferencia','mercado_pago','webpay')),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completado','fallido','reembolsado')),
  referencia text,
  descripcion text,
  fecha_pago date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagos_empresa ON public.pagos(empresa_id);

-- Tabla: notificaciones_whatsapp
CREATE TABLE IF NOT EXISTS public.notificaciones_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES public.productos(id) ON DELETE SET NULL,
  telefono text NOT NULL,
  mensaje text NOT NULL,
  tipo text NOT NULL DEFAULT 'alerta_stock' CHECK (tipo IN ('alerta_stock','despacho','promo','cobro')),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviada','fallida','leida')),
  fecha_envio timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_empresa ON public.notificaciones_whatsapp(empresa_id);
CREATE INDEX IF NOT EXISTS idx_notif_estado ON public.notificaciones_whatsapp(estado);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trg_empresas_updated_at ON public.empresas;
CREATE TRIGGER trg_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_productos_updated_at ON public.productos;
CREATE TRIGGER trg_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_campanias_updated_at ON public.campanias;
CREATE TRIGGER trg_campanias_updated_at BEFORE UPDATE ON public.campanias FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_despachos_updated_at ON public.despachos;
CREATE TRIGGER trg_despachos_updated_at BEFORE UPDATE ON public.despachos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_pagos_updated_at ON public.pagos;
CREATE TRIGGER trg_pagos_updated_at BEFORE UPDATE ON public.pagos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar Row Level Security
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despachos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones_whatsapp ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (anon key puede leer todo, ajusta según necesidad)
CREATE POLICY "allow_select_empresas" ON public.empresas FOR SELECT USING (true);
CREATE POLICY "allow_insert_empresas" ON public.empresas FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_empresas" ON public.empresas FOR UPDATE USING (true);
CREATE POLICY "allow_delete_empresas" ON public.empresas FOR DELETE USING (true);

CREATE POLICY "allow_select_productos" ON public.productos FOR SELECT USING (true);
CREATE POLICY "allow_insert_productos" ON public.productos FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_productos" ON public.productos FOR UPDATE USING (true);
CREATE POLICY "allow_delete_productos" ON public.productos FOR DELETE USING (true);

CREATE POLICY "allow_select_campanias" ON public.campanias FOR SELECT USING (true);
CREATE POLICY "allow_insert_campanias" ON public.campanias FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_campanias" ON public.campanias FOR UPDATE USING (true);
CREATE POLICY "allow_delete_campanias" ON public.campanias FOR DELETE USING (true);

CREATE POLICY "allow_select_despachos" ON public.despachos FOR SELECT USING (true);
CREATE POLICY "allow_insert_despachos" ON public.despachos FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_despachos" ON public.despachos FOR UPDATE USING (true);
CREATE POLICY "allow_delete_despachos" ON public.despachos FOR DELETE USING (true);

CREATE POLICY "allow_select_pagos" ON public.pagos FOR SELECT USING (true);
CREATE POLICY "allow_insert_pagos" ON public.pagos FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_pagos" ON public.pagos FOR UPDATE USING (true);
CREATE POLICY "allow_delete_pagos" ON public.pagos FOR DELETE USING (true);

CREATE POLICY "allow_select_notificaciones" ON public.notificaciones_whatsapp FOR SELECT USING (true);
CREATE POLICY "allow_insert_notificaciones" ON public.notificaciones_whatsapp FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_notificaciones" ON public.notificaciones_whatsapp FOR UPDATE USING (true);
CREATE POLICY "allow_delete_notificaciones" ON public.notificaciones_whatsapp FOR DELETE USING (true);

-- Tabla: clients (usada por SuperAdmin)
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rut text,
  owner_name text,
  email text,
  subdomain text,
  status text NOT NULL DEFAULT 'aprobado' CHECK (status IN ('activo','aprobado','pausado','en_espera')),
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_select_clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "allow_insert_clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "allow_delete_clients" ON public.clients FOR DELETE USING (true);

-- Agregar columnas si la tabla ya existía con estructura anterior
DO $$ BEGIN
  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS name text;
  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS rut text;
  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS owner_name text;
  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email text;
  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS subdomain text;
  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status text;
  ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS logo_url text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Migrar datos de columnas viejas a nuevas
UPDATE public.clients SET name = nombre WHERE name IS NULL AND nombre IS NOT NULL;
UPDATE public.clients SET rut = rut WHERE rut IS NULL;
UPDATE public.clients SET owner_name = dueno WHERE owner_name IS NULL AND dueno IS NOT NULL;
UPDATE public.clients SET email = email WHERE email IS NULL;
UPDATE public.clients SET subdomain = subdomain WHERE subdomain IS NULL;
UPDATE public.clients SET status = 'aprobado' WHERE status IS NULL;

-- Tabla: usuarios (para Personas y Roles)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  email text NOT NULL,
  rol text NOT NULL DEFAULT 'vendedor' CHECK (rol IN ('admin','vendedor','bodega')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_select_usuarios" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "allow_insert_usuarios" ON public.usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_usuarios" ON public.usuarios FOR UPDATE USING (true);
CREATE POLICY "allow_delete_usuarios" ON public.usuarios FOR DELETE USING (true);

-- Agregar client_subdomain a tablas existentes para multi-tenant
DO $$ BEGIN
  ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS client_subdomain text;
  ALTER TABLE public.campanias ADD COLUMN IF NOT EXISTS client_subdomain text;
  ALTER TABLE public.despachos ADD COLUMN IF NOT EXISTS client_subdomain text;
  ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS client_subdomain text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Crear bucket de logos si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Insertar empresa de ejemplo
INSERT INTO public.empresas (nombre, rut, direccion, telefono, email)
VALUES ('Mi Empresa SpA', '76.123.456-7', 'Av. Principal 123, Santiago', '+56 9 1234 5678', 'contacto@miempresa.cl')
ON CONFLICT DO NOTHING;

-- Insertar productos de ejemplo con clasificación ABC
INSERT INTO public.productos (empresa_id, sku, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, categoria_abc)
SELECT e.id, 'SKU-001', 'Producto Estrella', 'Alta rotación, alto margen', 150, 20, 5000, 8990, 'A' FROM public.empresas e WHERE e.nombre = 'Mi Empresa SpA'
UNION ALL
SELECT e.id, 'SKU-002', 'Producto Balanceado', 'Rotación media', 80, 15, 8000, 14990, 'B' FROM public.empresas e WHERE e.nombre = 'Mi Empresa SpA'
UNION ALL
SELECT e.id, 'SKU-003', 'Producto Básico', 'Baja rotación', 200, 30, 3000, 4990, 'C' FROM public.empresas e WHERE e.nombre = 'Mi Empresa SpA'
UNION ALL
SELECT e.id, 'SKU-004', 'Producto Crítico', 'Stock bajo', 3, 10, 12000, 21990, 'A' FROM public.empresas e WHERE e.nombre = 'Mi Empresa SpA'
ON CONFLICT DO NOTHING;
