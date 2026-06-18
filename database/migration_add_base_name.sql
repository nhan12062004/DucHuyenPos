-- Thêm cột base_name vào bảng products
-- base_name = tên sản phẩm gốc (ví dụ: "TỦ TRANH DLE")
-- name      = tên phiên bản đầy đủ (ví dụ: "TỦ TRANH DLE - 2/4")
-- Với sản phẩm không có variant: base_name = name

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS base_name text;

-- Index để tìm kiếm/group theo tên gốc
CREATE INDEX IF NOT EXISTS idx_products_base_name ON public.products(base_name);
