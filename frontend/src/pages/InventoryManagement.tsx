import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Printer,
  ImageIcon,
  Loader2,
  Settings,
} from 'lucide-react';
import {
  productsService,
  type Brand,
  type Product,
  type ProductCategory,
  type ProductStockSummary,
} from '../services/productsService';
import { PageLoader } from '../components/PageLoader';

type ProductListItem = Product & {
  typeName: string;
  brandName: string;
  instock: number;
  available: number;
};

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

  // format as DD/MM/YYYY
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function InventoryManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, ProductStockSummary>>({});
  const [isListLoading, setIsListLoading] = useState(true);
  const [hasLoadedList, setHasLoadedList] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let active = true;

    async function loadListData() {
      setIsListLoading(true);

      try {
        const [productsResponse, stockSummary] = await Promise.all([
          productsService.getAll({
            page: 1,
            limit: 200,
            search: debouncedSearchTerm || undefined,
          }),
          productsService.getStockSummary(),
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
      } catch (error: any) {
        if (!active) return;
        // Handle error silently or show a message
      } finally {
        if (active) {
          setIsListLoading(false);
          setHasLoadedList(true);
        }
      }
    }

    loadListData();

    return () => {
      active = false;
    };
  }, [debouncedSearchTerm]);

  const visibleProducts = useMemo(() => {
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
  }, [products, stockMap]);

  const totalPages = Math.max(1, Math.ceil((visibleProducts.length || 1) / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = visibleProducts.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = pagedProducts.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = pagedProducts.length === 0 ? 0 : pageStart + pagedProducts.length - 1;
  if (isListLoading && !hasLoadedList) {
    return <PageLoader text="Đang tải quản lý kho..." fullScreen />;
  }

  return (
    <div className="flex flex-col gap-4">
      {isListLoading ? (
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Đang cập nhật danh sách sản phẩm...
        </div>
      ) : null}


      <div className="list-toolbar">
        <div className="list-toolbar-actions">
          <button className="list-action-button">
            <Printer size={16} /> In tem mã
          </button>
          <div className="list-toolbar-divider"></div>
          <div className="list-link-group">
            <button className="list-link-button">
              Loại sản phẩm
            </button>
            <div className="list-link-separator"></div>
            <button className="list-link-button">
              Combo
            </button>
            <div className="list-link-separator"></div>
            <button className="list-link-button">
              Sản phẩm quy đổi
            </button>
          </div>
        </div>
        <div>
          <button
            onClick={() => navigate('/products')}
            className="list-primary-button"
          >
            Xem danh sách sản phẩm
          </button>
        </div>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex border-b border-slate-200 pr-5 pt-2">
          <button className="border-b-2 border-[#0088FF] px-4 py-3 text-[14px] font-medium text-[#0088FF] transition-colors">
            Tất cả phiên bản sản phẩm
          </button>
        </div>

        <div className="flex items-center gap-3 border-b border-slate-100 p-5 bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm theo mã sản phẩm, tên sản phẩm, barcode"
              className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button className="flex min-w-[130px] items-center justify-between gap-2 whitespace-nowrap rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50">
              <span>Loại sản phẩm</span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>
            <button className="flex min-w-[130px] items-center justify-between gap-2 whitespace-nowrap rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50">
              <span>Nhãn hiệu</span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>
            <button className="flex min-w-[130px] items-center justify-between gap-2 whitespace-nowrap rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50">
              <span>Trạng thái</span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>
            <button className="flex min-w-[130px] items-center justify-between gap-2 whitespace-nowrap rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50">
              <span>Bộ lọc khác</span>
              <Filter size={14} className="text-slate-400 shrink-0" />
            </button>
            <button className="ml-2 rounded border border-slate-200 bg-slate-100 px-5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-200 whitespace-nowrap">
              Lưu bộ lọc
            </button>
          </div>
        </div>

        {isListLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                  <th className="w-12 px-5 py-3">
                    <input type="checkbox" className="rounded border-slate-300 text-[#0088FF] focus:ring-[#0088FF]" />
                  </th>
                  <th className="w-16 px-2 py-3 text-center">
                    <Settings size={16} className="text-slate-400 inline-block" />
                  </th>
                  <th className="px-2 py-3">Ảnh</th>
                  <th className="min-w-[200px] px-2 py-3">Tên phiên bản sản phẩm</th>
                  <th className="px-2 py-3 text-center">Có thể bán <ChevronDown size={12} className="inline-block text-slate-400" /></th>
                  <th className="px-2 py-3 text-center">Tồn kho <ChevronDown size={12} className="inline-block text-slate-400" /></th>
                  <th className="px-2 py-3">Ngày khởi tạo <ChevronDown size={12} className="inline-block text-slate-400" /></th>
                  <th className="px-2 py-3 text-center">Giá bán lẻ</th>
                  <th className="px-2 py-3 text-center">Giá nhập</th>
                  <th className="px-5 py-3 text-center">Giá bán buôn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center text-[13px] text-slate-500">
                      Không có dữ liệu sản phẩm.
                    </td>
                  </tr>
                ) : (
                  pagedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="cursor-pointer text-[13px] transition-colors hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <input type="checkbox" className="rounded border-slate-300 text-[#0088FF] focus:ring-[#0088FF]" />
                      </td>
                      <td className="px-2 py-4 text-center">
                        {/* Empty space for the settings column */}
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-300">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover rounded" />
                          ) : (
                            <ImageIcon size={20} />
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="font-medium text-[#0088FF] hover:underline">
                          {product.name}
                        </div>
                        <div className="text-[12px] text-slate-400">{product.sku || '---'}</div>
                      </td>
                      <td className="px-2 py-4 text-center text-[#182537]">
                        {formatNumber(product.available)}
                      </td>
                      <td className="px-2 py-4 text-center text-[#182537]">
                        {formatNumber(product.instock)}
                      </td>
                      <td className="px-2 py-4 text-[#182537]">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="px-2 py-4 text-center text-[#182537]">
                        {formatNumber(Number(product.sale_price ?? 0))}
                      </td>
                      <td className="px-2 py-4 text-center text-[#182537]">
                        {formatNumber(Number(product.cost_price ?? 0))}
                      </td>
                      <td className="px-5 py-4 text-center text-[#182537]">
                        0
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end border-t border-slate-200 px-5 py-4 text-[13px] text-[#182537]">
          <div className="mr-6 flex items-center gap-2">
            <span className="text-slate-600">Hiển thị</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="appearance-none rounded border border-slate-300 bg-white px-3 py-1 pr-8 text-[#182537] focus:border-[#0088FF] focus:outline-none"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            <span className="text-slate-600">kết quả</span>
          </div>
          <div className="mr-6 text-slate-600">
            Từ {pageStart} đến {pageEnd} trên tổng {visibleProducts.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button className="flex h-7 w-7 items-center justify-center rounded bg-[#0088FF] font-medium text-white">
              {safePage}
            </button>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
