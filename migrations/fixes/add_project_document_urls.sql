-- Agrega columnas de URL y nombre de archivo para los documentos de proyectos
-- (Orden de Compra, HES, Factura de Venta)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS purchase_order_url      TEXT,
  ADD COLUMN IF NOT EXISTS purchase_order_filename TEXT,
  ADD COLUMN IF NOT EXISTS hes_url                 TEXT,
  ADD COLUMN IF NOT EXISTS hes_filename            TEXT,
  ADD COLUMN IF NOT EXISTS sale_invoice_url        TEXT,
  ADD COLUMN IF NOT EXISTS sale_invoice_filename   TEXT;
