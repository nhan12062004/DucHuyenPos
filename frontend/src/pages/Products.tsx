import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  Filter,
  Settings,
  Download,
  Upload,
  Plus,
  ChevronLeft,
  Copy,
  ImageIcon,
} from 'lucide-react';
import {
  productsService,
  type Brand,
  type Product,
  type ProductCategory,
  type ProductStockSummary,
} from '../services/productsService';

type ProductDetailTab = 'stock' | 'history';

type ProductListItem = Product & {
  typeName: string;
  brandName: string;
  instock: number;
  available: number;
};

const PRODUCT_FILTERS_KEY = 'duc-huyen-pos.products.filters';

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN');
}

function formatDate(value?: string) {
  if (!value) {
    return '---';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN');
}

function formatDateTime(value?: string) {
  if (!value) {
    return '---';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN');
}

function buildProductsData(products: Product[], stockMap: Record<string, ProductStockSummary>): ProductListItem[] {
  return products.map((product) => {
    const stock = stockMap[product.id];
    return {
      ...product,
      typeName: product.product_categories?.name ?? '---',
      brandName: product.brands?.name ?? '---',
      instock: Number(stock?.total_on_hand_qty ?? 0),
      available: Number(stock?.total_available_qty ?? 0),
    };
  });
}

export function Products() {
  const [activeTab, setActiveTab] = useState('all');
  const [detailTab, setDetailTab] = useState<ProductDetailTab>('stock');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilterId, setCategoryFilterId] = useState('all');
  const [brandFilterId, setBrandFilterId] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, ProductStockSummary>>({});
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const savedFilters = window.localStorage.getItem(PRODUCT_FILTERS_KEY);
      if (!savedFilters) {
        return;
      }

      const parsed = JSON.parse(savedFilters) as {
        searchTerm?: string;
        categoryFilterId?: string;
        brandFilterId?: string;
        statusFilter?: 'all' | 'active' | 'inactive';
        sortOrder?: 'newest' | 'oldest';
      };

      if (typeof parsed.searchTerm === 'string') {
        setSearchTerm(parsed.searchTerm);
      }
      if (typeof parsed.categoryFilterId === 'string') {
        setCategoryFilterId(parsed.categoryFilterId);
      }
      if (typeof parsed.brandFilterId === 'string') {
        setBrandFilterId(parsed.brandFilterId);
      }
      if (parsed.statusFilter === 'all' || parsed.statusFilter === 'active' || parsed.statusFilter === 'inactive') {
        setStatusFilter(parsed.statusFilter);
      }
      if (parsed.sortOrder === 'newest' || parsed.sortOrder === 'oldest') {
        setSortOrder(parsed.sortOrder);
      }
    } catch {
      window.localStorage.removeItem(PRODUCT_FILTERS_KEY);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadListData() {
      setIsListLoading(true);
      setListError(null);

      try {
        const [productsResponse, stockSummary, categoriesResponse, brandsResponse] = await Promise.all([
          productsService.getAll({
            page: 1,
            limit: 200,
            search: searchTerm || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter,
          }),
          productsService.getStockSummary(),
          productsService.getCategories(),
          productsService.getBrands(),
        ]);

        if (!active) {
          return;
        }

        const nextStockMap = stockSummary.reduce<Record<string, ProductStockSummary>>((acc, item) => {
          acc[item.product_id] = item;
          return acc;
        }, {});

        setProducts(productsResponse.data);
        setStockMap(nextStockMap);
        setCategories(categoriesResponse);
        setBrands(brandsResponse);
      } catch (error: any) {
        if (!active) {
          return;
        }
        setListError(error?.message ?? 'Không tải được danh sách sản phẩm.');
      } finally {
        if (active) {
          setIsListLoading(false);
        }
      }
    }

    loadListData();

    return () => {
      active = false;
    };
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    let active = true;

    async function loadProductDetail(productId: string) {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const detail = await productsService.getOne(productId);
        if (!active) {
          return;
        }
        setSelectedProductDetail(detail);
      } catch (error: any) {
        if (!active) {
          return;
        }
        setDetailError(error?.message ?? 'Không tải được chi tiết sản phẩm.');
      } finally {
        if (active) {
          setIsDetailLoading(false);
        }
      }
    }

    if (!selectedProductId) {
      setSelectedProductDetail(null);
      return;
    }

    loadProductDetail(selectedProductId);

    return () => {
      active = false;
    };
  }, [selectedProductId]);

  const productsData = useMemo(
    () => buildProductsData(products, stockMap),
    [products, stockMap],
  );

  const visibleProducts = useMemo(() => {
    const filtered = productsData.filter((product) => {
      if (categoryFilterId !== 'all' && product.product_category_id !== categoryFilterId) {
        return false;
      }
      if (brandFilterId !== 'all' && product.brand_id !== brandFilterId) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((left, right) => {
      const leftTime = new Date(left.created_at).getTime();
      const rightTime = new Date(right.created_at).getTime();
      return sortOrder === 'newest' ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [brandFilterId, categoryFilterId, productsData, sortOrder]);

  const selectedProduct =
    selectedProductDetail ??
    productsData.find((product) => product.id === selectedProductId) ??
    null;

  const handleSaveFilters = () => {
    window.localStorage.setItem(
      PRODUCT_FILTERS_KEY,
      JSON.stringify({ searchTerm, categoryFilterId, brandFilterId, statusFilter, sortOrder }),
    );
    setInfoMessage('Đã lưu bộ lọc sản phẩm.');
  };

  const handleCycleCategoryFilter = () => {
    const options = ['all', ...categories.map((category) => category.id)];
    const currentIndex = options.indexOf(categoryFilterId);
    const nextId = options[(currentIndex + 1) % options.length];
    setCategoryFilterId(nextId);
    const nextLabel = nextId === 'all'
      ? 'Tất cả loại sản phẩm'
      : categories.find((category) => category.id === nextId)?.name ?? 'Loại sản phẩm';
    setInfoMessage(`Đang lọc theo: ${nextLabel}.`);
  };

  const handleCycleBrandFilter = () => {
    const options = ['all', ...brands.map((brand) => brand.id)];
    const currentIndex = options.indexOf(brandFilterId);
    const nextId = options[(currentIndex + 1) % options.length];
    setBrandFilterId(nextId);
    const nextLabel = nextId === 'all'
      ? 'Tất cả nhãn hiệu'
      : brands.find((brand) => brand.id === nextId)?.name ?? 'Nhãn hiệu';
    setInfoMessage(`Đang lọc theo: ${nextLabel}.`);
  };

  const handleToggleSortOrder = () => {
    const next = sortOrder === 'newest' ? 'oldest' : 'newest';
    setSortOrder(next);
    setInfoMessage(next === 'newest' ? 'Đang sắp xếp mới nhất trước.' : 'Đang sắp xếp cũ nhất trước.');
  };

  const handleToggleStatusFilter = () => {
    const next =
      statusFilter === 'all'
        ? 'active'
        : statusFilter === 'active'
        ? 'inactive'
        : 'all';
    setStatusFilter(next);
    setInfoMessage(
      next === 'all'
        ? 'Đang hiển thị tất cả trạng thái sản phẩm.'
        : next === 'active'
        ? 'Đang lọc sản phẩm còn hoạt động.'
        : 'Đang lọc sản phẩm đã vô hiệu hóa.',
    );
  };

  const handleExportProducts = () => {
    if (visibleProducts.length === 0) {
      setInfoMessage('Không có sản phẩm phù hợp để xuất file.');
      return;
    }

    const rows = [
      ['SKU', 'Tên sản phẩm', 'Loại', 'Nhãn hiệu', 'Có thể bán', 'Tồn kho', 'Ngày tạo'],
      ...visibleProducts.map((product) => [
        product.sku || '---',
        product.name,
        product.typeName,
        product.brandName,
        String(product.available),
        String(product.instock),
        formatDate(product.created_at),
      ]),
    ];

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setInfoMessage(`Đã xuất ${visibleProducts.length} sản phẩm.`);
  };

  const handleCreateProduct = async () => {
    const name = window.prompt('Nhập tên sản phẩm');
    if (!name?.trim()) {
      return;
    }

    const sku = window.prompt('Nhập mã SKU, để trống để hệ thống tự sinh', '') ?? '';
    const unitName = window.prompt('Đơn vị tính', 'cái') ?? 'cái';
    const salePrice = Number(window.prompt('Giá bán lẻ', '0') ?? '0');
    const costPrice = Number(window.prompt('Giá nhập', '0') ?? '0');

    try {
      const created = await productsService.create({
        name: name.trim(),
        sku: sku.trim() || undefined,
        unit_name: unitName.trim() || 'cái',
        sale_price: Number.isFinite(salePrice) ? salePrice : 0,
        cost_price: Number.isFinite(costPrice) ? costPrice : 0,
        status: 'active',
      });

      setProducts((current) => [created, ...current]);
      setSelectedProductId(created.id);
      setInfoMessage(`Đã thêm sản phẩm ${created.name}.`);
    } catch (error: any) {
      setListError(error?.message ?? 'Thêm sản phẩm thất bại.');
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) {
      return;
    }

    const confirmed = window.confirm(`Vô hiệu hóa sản phẩm ${selectedProduct.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await productsService.delete(selectedProduct.id);
      setProducts((current) =>
        current.map((product) =>
          product.id === selectedProduct.id ? { ...product, status: 'inactive' } : product,
        ),
      );
      setSelectedProductDetail((current) =>
        current ? { ...current, status: 'inactive' } : current,
      );
      setInfoMessage(`Đã vô hiệu hóa sản phẩm ${selectedProduct.name}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Xóa sản phẩm thất bại.');
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) {
      return;
    }

    const name = window.prompt('Tên sản phẩm', selectedProduct.name);
    if (!name?.trim()) {
      return;
    }

    const unitName = window.prompt('Đơn vị tính', selectedProduct.unit_name ?? 'cái');
    if (unitName === null) {
      return;
    }

    const salePrice = window.prompt('Giá bán lẻ', String(selectedProduct.sale_price ?? 0));
    if (salePrice === null) {
      return;
    }

    const costPrice = window.prompt('Giá nhập', String(selectedProduct.cost_price ?? 0));
    if (costPrice === null) {
      return;
    }

    const description = window.prompt('Mô tả', selectedProduct.description ?? '');
    if (description === null) {
      return;
    }

    try {
      const updated = await productsService.update(selectedProduct.id, {
        name: name.trim(),
        unit_name: unitName.trim() || 'cái',
        sale_price: Number(salePrice) || 0,
        cost_price: Number(costPrice) || 0,
        description: description.trim() || undefined,
      });

      setProducts((current) =>
        current.map((product) => (product.id === updated.id ? { ...product, ...updated } : product)),
      );
      setSelectedProductDetail((current) => (current ? { ...current, ...updated } : updated));
      setInfoMessage(`Đã cập nhật sản phẩm ${updated.name}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Cập nhật sản phẩm thất bại.');
    }
  };

  const handleCopyProduct = async () => {
    if (!selectedProduct) {
      return;
    }

    setIsCopying(true);
    setDetailError(null);

    try {
      const duplicated = await productsService.create({
        name: `${selectedProduct.name} (Bản sao)`,
        unit_name: selectedProduct.unit_name,
        barcode: selectedProduct.barcode,
        image_url: selectedProduct.image_url,
        description: selectedProduct.description,
        sale_price: Number(selectedProduct.sale_price ?? 0),
        cost_price: Number(selectedProduct.cost_price ?? 0),
        reorder_level: Number(selectedProduct.reorder_level ?? 0),
        track_inventory: selectedProduct.track_inventory,
        allow_negative_stock: selectedProduct.allow_negative_stock,
        product_category_id: selectedProduct.product_category_id,
        brand_id: selectedProduct.brand_id,
        default_supplier_id: selectedProduct.default_supplier_id,
        status: 'active',
      });

      setProducts((current) => [duplicated, ...current]);
      setSelectedProductId(duplicated.id);
      setSelectedProductDetail(duplicated);
      setInfoMessage(`Đã sao chép sản phẩm sang ${duplicated.name}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Sao chép sản phẩm thất bại.');
    } finally {
      setIsCopying(false);
    }
  };

  if (selectedProduct) {
    return (
      <div className="flex h-full flex-col bg-[#f3f4f6]">
        <div className="z-10 flex shrink-0 items-center justify-between border-b bg-white p-3 px-6">
          <button
            onClick={() => setSelectedProductId(null)}
            className="flex items-center gap-2 text-[14px] font-medium text-slate-600 transition-colors hover:text-[#0088FF]"
          >
            <ChevronLeft size={16} /> Quay lại danh sách sản phẩm
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedProductId(null)}
              className="rounded border border-slate-300 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Thoát
            </button>
            <button
              onClick={handleDeleteProduct}
              className="rounded border border-red-500 bg-white px-4 py-1.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
            >
              Xóa
            </button>
            <button
              onClick={handleUpdateProduct}
              className="rounded bg-[#0088FF] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
            >
              Sửa sản phẩm
            </button>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-auto p-4 pb-20 md:p-6">
          {infoMessage ? (
            <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {infoMessage}
            </div>
          ) : null}

          {detailError ? (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {detailError}
            </div>
          ) : null}

          {isDetailLoading ? (
            <div className="mb-4 rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Đang cập nhật chi tiết sản phẩm...
            </div>
          ) : null}

          <div className="mb-4">
            <h1 className="mb-3 text-[22px] font-semibold text-[#182537]">{selectedProduct.name}</h1>
            <button
              onClick={handleCopyProduct}
              disabled={isCopying}
              className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <Copy size={14} className="text-slate-500" /> {isCopying ? 'Đang sao chép...' : 'Sao chép'}
            </button>
          </div>

          <div className="space-y-6">
            <div className="ui-card">
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <h3 className="text-[15px] font-semibold text-[#182537]">Thông tin sản phẩm</h3>
                <span className="rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-[12px] font-medium text-orange-600">
                  {selectedProduct.status === 'active' ? 'Đang giao dịch' : 'Đã ngừng'}
                </span>
              </div>
              <div className="flex gap-8 p-5">
                <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
                  <div className="flex"><div className="w-40 text-slate-600">Mã SKU</div><div className="text-[#182537]">: {selectedProduct.sku || '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Loại sản phẩm</div><div className="text-[#182537]">: {selectedProduct.product_categories?.name ?? '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Mã barcode</div><div className="text-[#182537]">: {selectedProduct.barcode || '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Nhãn hiệu</div><div className="text-[#182537]">: {selectedProduct.brands?.name ?? '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Khối lượng</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Nhóm ngành nghề tính thuế GTGT, TNCN</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Đơn vị tính</div><div className="text-[#182537]">: {selectedProduct.unit_name || '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Tags</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Phân loại</div><div className="text-[#182537]">: Sản phẩm thường</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Ngày tạo</div><div className="text-[#182537]">: {formatDateTime(selectedProduct.created_at)}</div></div>
                  <div className="flex"><button onClick={() => setInfoMessage(selectedProduct.description || 'Sản phẩm chưa có mô tả.')} className="w-40 cursor-pointer text-[#0088FF] hover:underline">Xem mô tả</button></div>
                  <div className="flex"><div className="w-40 text-slate-600">Ngày cập nhật cuối</div><div className="text-[#182537]">: {formatDateTime(selectedProduct.updated_at)}</div></div>
                </div>

                <div className="flex min-h-[160px] w-[300px] shrink-0 flex-col items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 p-4">
                  <ImageIcon size={48} className="mb-2 text-slate-300" />
                  <p className="text-[13px] text-slate-500">
                    {selectedProduct.image_url ? 'Sản phẩm đã có ảnh liên kết' : 'Sản phẩm chưa có ảnh tải lên'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="ui-card flex-1">
                <div className="border-b border-slate-100 p-4">
                  <h3 className="text-[15px] font-semibold text-[#182537]">Giá sản phẩm</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-5 text-[13px]">
                  <div className="flex"><div className="w-32 text-slate-600">Giá bán lẻ</div><div className="text-[#182537]">: {formatNumber(Number(selectedProduct.sale_price ?? 0))}</div></div>
                  <div className="flex"><div className="w-32 text-slate-600">Giá bán buôn</div><div className="text-[#182537]">: 0</div></div>
                  <div className="flex"><div className="w-32 text-slate-600">Giá nhập</div><div className="text-[#182537]">: {formatNumber(Number(selectedProduct.cost_price ?? 0))}</div></div>
                </div>
              </div>

              <div className="ui-card w-[300px] shrink-0">
                <div className="border-b border-slate-100 p-4">
                  <h3 className="text-[15px] font-semibold text-[#182537]">Thông tin thêm</h3>
                </div>
                <div className="space-y-4 p-5 text-[13px] text-slate-700">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={selectedProduct.status === 'active'} readOnly className="rounded border-slate-300 text-[#0088FF]" />
                    <span>Cho phép bán</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={selectedProduct.track_inventory} readOnly className="rounded border-slate-300 text-[#0088FF]" />
                    <span>Theo dõi tồn kho</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={selectedProduct.allow_negative_stock} readOnly className="rounded border-slate-300 text-[#0088FF]" />
                    <span>Cho phép âm kho</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="ui-card">
              <div className="flex border-b border-slate-200 px-4 pt-1">
                <button
                  onClick={() => setDetailTab('stock')}
                  className={`mr-4 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                    detailTab === 'stock'
                      ? 'border-[#0088FF] text-[#0088FF]'
                      : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                  }`}
                >
                  Tồn kho
                </button>
                <button
                  onClick={() => setDetailTab('history')}
                  className={`border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                    detailTab === 'history'
                      ? 'border-[#0088FF] text-[#0088FF]'
                      : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                  }`}
                >
                  Lịch sử kho
                </button>
              </div>

              {detailTab === 'stock' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                        <th className="px-5 py-3">Chi nhánh</th>
                        <th className="px-2 py-3 text-right">Tồn kho</th>
                        <th className="px-2 py-3 text-right">Giá vốn</th>
                        <th className="px-2 py-3 text-right">Có thể bán</th>
                        <th className="px-2 py-3 text-right">Đang giao dịch</th>
                        <th className="px-2 py-3 text-right">Hàng đang về</th>
                        <th className="px-2 py-3 text-right">Hàng đang giao</th>
                        <th className="px-2 py-3 text-right">Tồn tối thiểu</th>
                        <th className="px-2 py-3 text-right">Tồn tối đa</th>
                        <th className="px-5 py-3 text-right">Điểm lưu kho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!selectedProduct.branch_stocks?.length ? (
                        <tr>
                          <td colSpan={10} className="px-5 py-8 text-center text-[13px] text-slate-500">
                            Chưa có dữ liệu tồn kho chi tiết.
                          </td>
                        </tr>
                      ) : (
                        selectedProduct.branch_stocks.map((stock) => (
                          <tr key={stock.branch_id} className="text-[13px] transition-colors hover:bg-slate-50">
                            <td className="px-5 py-4 text-[#182537]">{stock.branches?.name ?? 'Chi nhánh mặc định'}</td>
                            <td className="px-2 py-4 text-right font-medium text-[#182537]">{formatNumber(Number(stock.on_hand_qty ?? 0))}</td>
                            <td className="px-2 py-4 text-right text-[#182537]">{formatNumber(Number(stock.average_cost ?? 0))}</td>
                            <td className="px-2 py-4 text-right font-medium text-[#182537]">{formatNumber(Number(stock.available_qty ?? 0))}</td>
                            <td className="px-2 py-4 text-right text-[#182537]">0</td>
                            <td className="px-2 py-4 text-right text-[#182537]">0</td>
                            <td className="px-2 py-4 text-right text-[#182537]">0</td>
                            <td className="px-2 py-4 text-right text-[#182537]">{formatNumber(Number(selectedProduct.reorder_level ?? 0))}</td>
                            <td className="px-2 py-4 text-right text-[#182537]">---</td>
                            <td className="px-5 py-4 text-right text-[#182537]">---</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4 p-5 text-[13px] text-[#182537]">
                  <div>Ngày tạo: {formatDateTime(selectedProduct.created_at)}</div>
                  <div>Ngày cập nhật cuối: {formatDateTime(selectedProduct.updated_at)}</div>
                  <div>Nhà cung cấp mặc định: {selectedProduct.suppliers?.name ?? '---'}</div>
                  <button
                    onClick={() => navigate('/inventory')}
                    className="text-[13px] font-medium text-[#0088FF] hover:underline"
                  >
                    Mở trang kho hàng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#f3f4f6]">
      <div className="z-10 flex shrink-0 items-center justify-between border-b bg-white p-3">
        <div className="flex items-center gap-4 text-sm font-medium">
          <button
            onClick={handleExportProducts}
            className="flex items-center gap-1.5 text-slate-600 transition-colors hover:text-[#0088FF]"
          >
            <Download size={16} /> Xuất file <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setInfoMessage('Nhập file sản phẩm chưa có luồng backend riêng. Bạn có thể thêm trực tiếp bằng nút Thêm sản phẩm.')}
            className="flex items-center gap-1.5 text-slate-600 transition-colors hover:text-[#0088FF]"
          >
            <Upload size={16} /> Nhập file
          </button>
          <div className="mx-1 h-4 w-px bg-slate-300"></div>
          <button
            onClick={() => setInfoMessage('Danh sách này đang hiển thị sản phẩm thường theo backend hiện tại.')}
            className="text-slate-600 transition-colors hover:text-[#0088FF]"
          >
            Loại sản phẩm
          </button>
          <button
            onClick={() => setInfoMessage('Combo chưa có luồng backend riêng, mình đang giữ nguyên nút và thông báo trạng thái.')}
            className="text-slate-600 transition-colors hover:text-[#0088FF]"
          >
            Combo
          </button>
          <button
            onClick={() => setInfoMessage('Sản phẩm quy đổi chưa có backend riêng, mình đang giữ nguyên nút và thông báo trạng thái.')}
            className="text-slate-600 transition-colors hover:text-[#0088FF]"
          >
            Sản phẩm quy đổi
          </button>
        </div>
        <div className="flex rounded border border-blue-600">
          <button
            onClick={handleCreateProduct}
            className="flex items-center gap-2 border-r border-blue-700 bg-[#0088FF] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={16} /> Thêm sản phẩm
          </button>
          <button
            onClick={handleCreateProduct}
            className="flex items-center bg-[#0088FF] px-2 text-white transition-colors hover:bg-blue-700"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto p-0">
        <div className="mb-4 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          {infoMessage ? (
            <div className="border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {infoMessage}
            </div>
          ) : null}

          {listError ? (
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {listError}
            </div>
          ) : null}

          <div className="flex border-b border-slate-200 px-4 pt-1">
            <button
              className={`mr-4 border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-[#0088FF] text-[#0088FF]'
                  : 'border-transparent text-slate-600 hover:text-[#0088FF]'
              }`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả sản phẩm
            </button>
          </div>

          <div className="flex items-center gap-3 border-b border-slate-100 p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm kiếm theo mã sản phẩm, tên sản phẩm, barcode"
                className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none focus:ring-1 focus:ring-[#0088FF]"
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleCycleCategoryFilter}
                className="flex w-32 items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Loại sản phẩm</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <button
                onClick={handleToggleSortOrder}
                className="flex w-32 items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Ngày tạo</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <button
                onClick={handleCycleBrandFilter}
                className="flex w-32 items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Nhãn hiệu</span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <button
                onClick={handleToggleStatusFilter}
                className="flex w-32 items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Bộ lọc khác</span>
                <Filter size={14} className="text-slate-400" />
              </button>
              <button
                onClick={handleSaveFilters}
                className="ml-2 rounded bg-slate-100 px-5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-200"
              >
                Lưu bộ lọc
              </button>
            </div>
          </div>

          {isListLoading ? (
            <div className="flex min-h-[500px] items-center justify-center text-slate-500">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0088FF] border-t-transparent" />
                <p className="text-sm font-medium">Đang tải danh sách sản phẩm...</p>
              </div>
            </div>
          ) : (
            <div className="min-h-[500px] w-full overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                    <th className="w-12 border-r border-slate-100 px-4 py-3 text-center">
                      <Settings size={16} className="mx-auto cursor-pointer text-slate-400 hover:text-slate-600" />
                    </th>
                    <th className="w-10 px-2 py-3 text-center"><input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" /></th>
                    <th className="w-16 px-4 py-3">Ảnh</th>
                    <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-4 py-3 text-center font-semibold">Loại</th>
                    <th className="mt-1 block px-4 py-3 text-center font-semibold">Nhãn hiệu</th>
                    <th className="px-4 py-3 text-center font-semibold">Có thể bán</th>
                    <th className="px-4 py-3 text-center font-semibold">Tồn kho</th>
                    <th className="flex items-center justify-end gap-1 px-4 py-3 font-semibold">Ngày khởi tạo <div className="flex flex-col"><ChevronDown size={10} className="-mb-1 rotate-180" /><ChevronDown size={10} /></div></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13.5px] text-[#182537]">
                  {visibleProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                        Chưa có sản phẩm phù hợp.
                      </td>
                    </tr>
                  ) : (
                    visibleProducts.map((product) => (
                      <tr key={product.id} className="group transition-colors hover:bg-slate-50">
                        <td className="border-r border-slate-100 px-4 py-3 text-center text-slate-400"></td>
                        <td className="px-2 py-3 text-center"><input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" /></td>
                        <td className="px-4 py-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-200">
                            <ImageIcon size={20} />
                          </div>
                        </td>
                        <td
                          className="cursor-pointer px-4 py-3 font-medium text-[#0088FF] hover:underline"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setDetailTab('stock');
                          }}
                        >
                          {product.name}
                        </td>
                        <td className="px-4 py-3 text-center">{product.typeName !== '---' ? product.typeName : ''}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{product.brandName !== '---' ? product.brandName : ''}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="font-semibold text-[#182537]">{formatNumber(product.available)}</div>
                          <div className="mt-0.5 text-[12px] text-slate-500">(1 phiên bản)</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="font-semibold text-[#182537]">{formatNumber(product.instock)}</div>
                          <div className="mt-0.5 text-[12px] text-slate-500">(1 phiên bản)</div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatDate(product.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
