-- ============================================================
-- MIGRATION: Thêm các cột còn thiếu cho bảng products
-- Chạy file này trong: Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================

-- Thêm các cột còn thiếu vào bảng products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source_sku           text,
  ADD COLUMN IF NOT EXISTS wholesale_price      numeric(14,2) NOT NULL DEFAULT 0 CHECK (wholesale_price >= 0),
  ADD COLUMN IF NOT EXISTS weight               numeric(10,3),
  ADD COLUMN IF NOT EXISTS weight_unit          text,
  ADD COLUMN IF NOT EXISTS tags                 text[],
  ADD COLUMN IF NOT EXISTS tax_applicable       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_price_type       text,
  ADD COLUMN IF NOT EXISTS input_tax_rate       numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tax_rate      numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warranty_applicable  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_policy      text,
  ADD COLUMN IF NOT EXISTS expiry_warning_days  integer,
  ADD COLUMN IF NOT EXISTS attributes           jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Thêm các cột còn thiếu vào bảng branch_stocks
ALTER TABLE public.branch_stocks
  ADD COLUMN IF NOT EXISTS max_stock      numeric(14,2),
  ADD COLUMN IF NOT EXISTS reorder_point  numeric(14,2);

-- Index để tìm kiếm nhanh theo source_sku (mã gốc từ phần mềm cũ)
CREATE INDEX IF NOT EXISTS idx_products_source_sku ON public.products(source_sku);
