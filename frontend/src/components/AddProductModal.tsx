import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Loader2 } from 'lucide-react';
import { productsService, type Product, type ProductCategory } from '../services/productsService';

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
}

export function AddProductModal({ open, onClose, onCreated }: AddProductModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('g');
  const [unitName, setUnitName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockCount, setStockCount] = useState('');

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto reset
  useEffect(() => {
    if (open) {
      setName('');
      setSku('');
      setBarcode('');
      setWeight('0');
      setWeightUnit('g');
      setUnitName('');
      setCategoryId('');
      setSalePrice('0');
      setCostPrice('0');
      setStockCount('0');
      setFormError(null);

      if (categories.length === 0) {
        setLoadingCategories(true);
        productsService.getCategories()
          .then(setCategories)
          .catch(() => {})
          .finally(() => setLoadingCategories(false));
      }
    }
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên sản phẩm.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const dto: Partial<Product> = {
        name: name.trim(),
        sku: sku.trim() || undefined, // Backend should handle default SKU if empty
        barcode: barcode.trim() || undefined,
        unit_name: unitName.trim() || 'Mặc định',
        product_category_id: categoryId || undefined,
        sale_price: Number(salePrice.replace(/,/g, '')) || 0,
        cost_price: Number(costPrice.replace(/,/g, '')) || 0,
        track_inventory: true, // Typically true for POS
        allow_negative_stock: false,
        status: 'active',
        // Description can hold weight info if we want
        description: weight.trim() && weight !== '0' ? `Khối lượng: ${weight}${weightUnit}` : undefined,
      };

      const created = await productsService.create(dto);
      
      // If there's an initial stock, ideally we would do an inventory adjustment here.
      // But since that requires a separate API, we just ignore it or backend handles it via initial_stock param if supported.

      onCreated(created);
    } catch (err: any) {
      setFormError(err?.message ?? 'Tạo sản phẩm thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded border border-slate-300 px-3 py-2 text-[13px] text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const selectCls =
    'w-full rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none';
  const labelCls = 'mb-1 block text-[13px] font-medium text-slate-700';

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-[700px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-[16px] font-semibold text-slate-800">Thêm nhanh sản phẩm</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {formError && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
              {formError}
            </div>
          )}

          {/* Row 1 */}
          <div className="mb-4">
            <label className={labelCls}>
              Tên sản phẩm <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên sản phẩm"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Mã sản phẩm/SKU</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Nhập tay hoặc dùng máy quét"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-[13px] font-medium text-slate-700">
                  Mã vạch/Barcode
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-blue-500 text-[10px] text-blue-500">i</span>
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Nhập tay hoặc dùng máy quét"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Loại sản phẩm</label>
                <div className="relative">
                  <select
                    value={categoryId}
                    disabled={loadingCategories}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Nhập loại sản phẩm</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {loadingCategories ? (
                    <Loader2 size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                  ) : (
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-[13px] font-medium text-slate-700">
                  Giá vốn
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-blue-500 text-[10px] text-blue-500">i</span>
                </label>
                <input
                  type="text"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-right text-[13px] text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Khối lượng (dùng tính phí vận chuyển)</label>
                <div className="flex rounded border border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border-none px-3 py-2 text-right text-[13px] text-slate-800 outline-none"
                  />
                  <div className="relative flex items-center border-l border-slate-300 bg-slate-50">
                    <select
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value)}
                      className="h-full cursor-pointer appearance-none bg-transparent pl-3 pr-7 text-[13px] text-slate-600 outline-none focus:outline-none"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Đơn vị tính</label>
                <input
                  type="text"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Giá bán lẻ</label>
                <input
                  type="text"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-right text-[13px] text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className={labelCls}>Tồn kho</label>
                <input
                  type="text"
                  value={stockCount}
                  onChange={(e) => setStockCount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-right text-[13px] text-slate-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded border border-blue-500 bg-white px-6 py-2 text-[14px] font-medium text-blue-500 transition-colors hover:bg-blue-50 disabled:opacity-50"
          >
            Thoát
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center justify-center min-w-[80px] rounded bg-[#0088ff] px-6 py-2 text-[14px] font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Thêm'}
          </button>
        </div>
      </div>
    </div>
  );
}
