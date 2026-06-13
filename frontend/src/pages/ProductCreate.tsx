import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ImagePlus, Info, Loader2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  productsService,
  type Brand,
  type Product,
  type ProductCategory,
} from '../services/productsService';
import { inventoryService, type Branch } from '../services/inventoryService';

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 flex items-center gap-1 text-[13px] text-[#415166]">
      <span>{children}</span>
      <Info size={13} className="text-[#0088FF]" />
      {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex min-h-[42px] items-center justify-between border-b border-slate-200 px-5">
        <h2 className="text-[15px] font-semibold text-[#182537]">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-4 w-8 transition-colors ${checked ? 'bg-[#C8E8FF]' : 'bg-slate-200'}`}
    >
      <span
        className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform ${
          checked ? 'left-[17px] bg-[#0088FF]' : 'left-0.5 bg-slate-500'
        }`}
      />
    </button>
  );
}

function parseMoney(value: string) {
  const numeric = Number(value.replace(/[^\d]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatDigits(value: string) {
  return value.replace(/[^\d]/g, '');
}

const inputClass =
  'h-8 w-full border border-slate-300 bg-white px-3 text-[13px] text-[#182537] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0088FF]';
const selectClass =
  'h-8 w-full appearance-none border border-slate-300 bg-white px-3 pr-8 text-[13px] text-[#182537] outline-none transition-colors focus:border-[#0088FF]';

export function ProductCreate() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('g');
  const [unitName, setUnitName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [tags, setTags] = useState('');
  const [salePrice, setSalePrice] = useState('0');
  const [wholesalePrice, setWholesalePrice] = useState('0');
  const [costPrice, setCostPrice] = useState('0');
  const [allowSale, setAllowSale] = useState(true);
  const [applyTax, setApplyTax] = useState(false);
  const [applyWarranty, setApplyWarranty] = useState(false);
  const [initInventory, setInitInventory] = useState(false);
  const [attributesEnabled, setAttributesEnabled] = useState(false);
  const [conversionEnabled, setConversionEnabled] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultBranch = useMemo(
    () => branches.find((branch) => branch.is_default) ?? branches[0] ?? null,
    [branches],
  );

  useEffect(() => {
    let mounted = true;

    Promise.all([
      productsService.getCategories(),
      productsService.getBrands(),
      inventoryService.getBranches(),
    ])
      .then(([categoryList, brandList, branchList]) => {
        if (!mounted) {
          return;
        }
        setCategories(categoryList);
        setBrands(brandList);
        setBranches(branchList);
      })
      .catch(() => {
        if (mounted) {
          setError('Không tải được dữ liệu loại sản phẩm, nhãn hiệu hoặc chi nhánh.');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingLookups(false);
        }
      });

    return () => {
      mounted = false;
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, []);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (printBarcode = false) => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên sản phẩm.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const descriptionParts = [
        description.trim(),
        weight.trim() ? `Khối lượng: ${weight.trim()}${weightUnit}` : '',
        tags.trim() ? `Tags: ${tags.trim()}` : '',
        applyTax ? 'Áp dụng thuế' : '',
        applyWarranty ? 'Áp dụng bảo hành' : '',
        wholesalePrice && parseMoney(wholesalePrice) > 0
          ? `Giá bán buôn: ${parseMoney(wholesalePrice).toLocaleString('vi-VN')}`
          : '',
      ].filter(Boolean);

      const created = await productsService.create({
        name: name.trim(),
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        unit_name: unitName.trim() || 'cái',
        product_category_id: categoryId || undefined,
        brand_id: brandId || undefined,
        default_branch_id: defaultBranch?.id,
        description: descriptionParts.join('\n') || undefined,
        sale_price: parseMoney(salePrice),
        cost_price: parseMoney(costPrice),
        reorder_level: 0,
        track_inventory: true,
        allow_negative_stock: false,
        status: allowSale ? 'active' : 'inactive',
      } satisfies Partial<Product>);

      navigate('/products', {
        state: {
          selectedProductId: created.id,
          message: printBarcode
            ? `Đã lưu sản phẩm ${created.name}. Bạn có thể in mã vạch sau khi cấu hình mẫu in.`
            : `Đã lưu sản phẩm ${created.name}.`,
        },
      });
    } catch (saveError: any) {
      setError(saveError?.message ?? 'Tạo sản phẩm thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F4F6F8] pb-6 text-[#182537]">
      <div className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-[13px] text-slate-500 transition-colors hover:text-[#0088FF]"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách sản phẩm
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            disabled={saving}
            className="h-8 border border-[#0088FF] bg-white px-5 text-[13px] font-medium text-[#0088FF] transition-colors hover:bg-blue-50 disabled:opacity-60"
          >
            Thoát
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="h-8 border border-[#0088FF] bg-white px-5 text-[13px] font-medium text-[#0088FF] transition-colors hover:bg-blue-50 disabled:opacity-60"
          >
            Lưu và in mã vạch
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex h-8 min-w-[64px] items-center justify-center bg-[#0088FF] px-5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Lưu'}
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1120px] gap-4 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-4">
          {error ? (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          ) : null}

          <Panel
            title="Hình thức quản lý"
            action={
              <button type="button" className="text-[13px] font-medium text-[#0088FF] hover:underline">
                Thiết lập
              </button>
            }
          >
            <label className="flex items-center gap-3 text-[13px] text-[#182537]">
              <input type="radio" checked readOnly className="h-4 w-4 accent-[#0088FF]" />
              Sản phẩm thường
            </label>
          </Panel>

          <Panel title="Thông tin chung">
            <div>
              <FieldLabel required>Tên sản phẩm</FieldLabel>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nhập tên sản phẩm"
                className={inputClass}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <FieldLabel>Mã sản phẩm/SKU</FieldLabel>
                <input value={sku} onChange={(event) => setSku(event.target.value)} className={inputClass} />
              </div>

              <div>
                <FieldLabel>Khối lượng</FieldLabel>
                <div className="flex">
                  <input
                    value={weight}
                    onChange={(event) => setWeight(formatDigits(event.target.value))}
                    className={`${inputClass} text-right`}
                  />
                  <div className="relative w-14 shrink-0">
                    <select
                      value={weightUnit}
                      onChange={(event) => setWeightUnit(event.target.value)}
                      className={`${selectClass} border-l-0 pl-2`}
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel>Mã vạch/Barcode</FieldLabel>
                <input
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="Nhập tay hoặc sử dụng máy để quét mã vạch. (3-15 ký tự)"
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel>Đơn vị tính</FieldLabel>
                <input value={unitName} onChange={(event) => setUnitName(event.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="mt-4">
              <button type="button" className="text-[13px] font-medium text-[#0088FF] hover:underline">
                Mô tả sản phẩm
              </button>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="mt-2 w-full resize-none border border-slate-300 px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#0088FF]"
              />
            </div>
          </Panel>

          <Panel
            title="Giá sản phẩm"
            action={
              <button type="button" className="flex items-center gap-2 text-[13px] font-medium text-[#0088FF] hover:underline">
                <Plus size={14} />
                Thêm chính sách giá
              </button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Giá bán lẻ</FieldLabel>
                <input
                  value={salePrice}
                  onChange={(event) => setSalePrice(formatDigits(event.target.value))}
                  className={`${inputClass} text-right`}
                />
              </div>
              <div>
                <FieldLabel>Giá bán buôn</FieldLabel>
                <input
                  value={wholesalePrice}
                  onChange={(event) => setWholesalePrice(formatDigits(event.target.value))}
                  className={`${inputClass} text-right`}
                />
              </div>
              <div>
                <FieldLabel>Giá nhập</FieldLabel>
                <input
                  value={costPrice}
                  onChange={(event) => setCostPrice(formatDigits(event.target.value))}
                  className={`${inputClass} text-right`}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Ảnh sản phẩm">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[60px] w-full items-center justify-center gap-3 border border-dashed border-slate-300 bg-white px-4 text-[13px] text-slate-500 transition-colors hover:border-[#0088FF] hover:text-[#0088FF]"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Ảnh sản phẩm" className="h-12 w-12 object-cover" />
              ) : (
                <ImagePlus size={18} />
              )}
              <span>Kéo thả hoặc tải ảnh lên từ thiết bị</span>
            </button>
          </Panel>

          <Panel title="Khởi tạo kho hàng">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-semibold">Khởi tạo kho hàng</h3>
              <Toggle checked={initInventory} onChange={setInitInventory} />
            </div>
            <p className="mt-3 text-[13px] text-[#415166]">
              Ghi nhận số lượng Tồn kho ban đầu và Giá vốn của sản phẩm tại các Chi nhánh
            </p>
            {initInventory ? (
              <div className="mt-4 border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-600">
                Chi nhánh mặc định: {defaultBranch?.name ?? 'Chưa có chi nhánh'}
              </div>
            ) : null}
          </Panel>

          <Panel title="Thuộc tính">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-semibold">Thuộc tính</h3>
              <Info size={13} className="text-[#0088FF]" />
              <Toggle checked={attributesEnabled} onChange={setAttributesEnabled} />
            </div>
            <p className="mt-3 text-[13px] text-[#415166]">
              Thêm mới thuộc tính giúp sản phẩm có nhiều lựa chọn, như kích cỡ hay màu sắc
            </p>
          </Panel>

          <Panel title="Thêm đơn vị quy đổi">
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-semibold">Thêm đơn vị quy đổi</h3>
              <Info size={13} className="text-[#0088FF]" />
              <Toggle checked={conversionEnabled} onChange={setConversionEnabled} />
            </div>
            <p className="mt-3 text-[13px] text-[#415166]">Tạo và quy đổi các đơn vị tính khác nhau</p>
          </Panel>

          <div className="flex justify-end gap-3 bg-[#F4F6F8] py-2">
            <button
              type="button"
              onClick={() => navigate('/products')}
              disabled={saving}
              className="h-8 border border-[#0088FF] bg-white px-5 text-[13px] font-medium text-[#0088FF] transition-colors hover:bg-blue-50 disabled:opacity-60"
            >
              Thoát
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="h-8 border border-[#0088FF] bg-white px-5 text-[13px] font-medium text-[#0088FF] transition-colors hover:bg-blue-50 disabled:opacity-60"
            >
              Lưu và in mã vạch
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex h-8 min-w-[64px] items-center justify-center bg-[#0088FF] px-5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Lưu'}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <Panel title="Thông tin bổ sung">
            <div className="space-y-4">
              <div>
                <FieldLabel>Loại sản phẩm</FieldLabel>
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    disabled={loadingLookups}
                    className={selectClass}
                  >
                    <option value="">Chọn loại sản phẩm</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <FieldLabel>Nhãn hiệu</FieldLabel>
                <div className="relative">
                  <select
                    value={brandId}
                    onChange={(event) => setBrandId(event.target.value)}
                    disabled={loadingLookups}
                    className={selectClass}
                  >
                    <option value="">Chọn nhãn hiệu</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <FieldLabel>Nhóm ngành nghề tính thuế GTGT, TNCN</FieldLabel>
                <div className="relative">
                  <select className={selectClass} defaultValue="">
                    <option value="">Chọn nhóm ngành nghề kinh doanh</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div>
                <FieldLabel>Tags</FieldLabel>
                <textarea
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  rows={3}
                  className="w-full resize-none border border-slate-300 px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#0088FF]"
                />
              </div>
            </div>
          </Panel>

          <Panel title="">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-1 text-[13px] font-semibold text-[#182537]">
                    Trạng thái <Info size={13} className="text-[#0088FF]" />
                  </div>
                  <div className="mt-1 text-[13px] text-[#182537]">Cho phép bán</div>
                </div>
                <Toggle checked={allowSale} onChange={setAllowSale} />
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-1 text-[13px] font-semibold text-[#182537]">
                    Thuế <Info size={13} className="text-[#0088FF]" />
                  </div>
                  <div className="mt-1 text-[13px] text-[#182537]">Áp dụng thuế</div>
                </div>
                <Toggle checked={applyTax} onChange={setApplyTax} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-[#182537]">Bảo hành</div>
                  <div className="mt-1 text-[13px] text-[#182537]">Áp dụng bảo hành</div>
                </div>
                <Toggle checked={applyWarranty} onChange={setApplyWarranty} />
              </div>
            </div>
          </Panel>
        </aside>
      </div>

    </div>
  );
}
