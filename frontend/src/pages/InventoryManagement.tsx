import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  Filter,
  Printer,
  ImageIcon,
  Settings,
} from 'lucide-react';
import {
  productsService,
  type Brand,
  type Product,
  type ProductCategory,
  type ProductStockSummary,
} from '../services/productsService';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, ProductStockSummary>>({});
  const [isListLoading, setIsListLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadListData() {
      setIsListLoading(true);

      try {
        const [productsResponse, stockSummary] = await Promise.all([
          productsService.getAll({
            page: 1,
            limit: 200,
            search: searchTerm || undefined,
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
        }
      }
    }

    loadListData();

    return () => {
      active = false;
    };
  }, [searchTerm]);

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

  return (
    <div className="flex flex-col gap-6">


      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-[14px] font-medium text-slate-600">
          <button className="flex items-center gap-1.5 transition-colors hover:text-[#0088FF]">
            <Printer size={16} /> In tem mã
          </button>
          <div className="h-4 w-px bg-slate-300"></div>
          <button className="transition-colors hover:text-[#0088FF]">
            Loại sản phẩm
          </button>
          <div className="h-4 w-px bg-slate-300"></div>
          <button className="transition-colors hover:text-[#0088FF]">
            Combo
          </button>
          <div className="h-4 w-px bg-slate-300"></div>
          <button className="transition-colors hover:text-[#0088FF]">
            Sản phẩm quy đổi
          </button>
        </div>
        <div>
          <button
            onClick={() => navigate('/products')}
            className="rounded bg-[#0088FF] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-blue-700"
          >
            Xem danh sách sản phẩm
          </button>
        </div>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex border-b border-slate-200 px-5 pt-2">
          <button className="mr-4 border-b-2 border-[#0088FF] px-4 py-3 text-[14px] font-medium text-[#0088FF] transition-colors">
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
              className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none focus:ring-1 focus:ring-[#0088FF]"
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
                  <th className="px-2 py-3 text-right">Có thể bán <ChevronDown size={12} className="inline-block text-slate-400" /></th>
                  <th className="px-2 py-3 text-right">Tồn kho <ChevronDown size={12} className="inline-block text-slate-400" /></th>
                  <th className="px-2 py-3">Ngày khởi tạo <ChevronDown size={12} className="inline-block text-slate-400" /></th>
                  <th className="px-2 py-3 text-right">Giá bán lẻ</th>
                  <th className="px-2 py-3 text-right">Giá nhập</th>
                  <th className="px-5 py-3 text-right">Giá bán buôn</th>
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
                  visibleProducts.map((product) => (
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
                      <td className="px-2 py-4 text-right text-[#182537]">
                        {formatNumber(product.available)}
                      </td>
                      <td className="px-2 py-4 text-right text-[#182537]">
                        {formatNumber(product.instock)}
                      </td>
                      <td className="px-2 py-4 text-[#182537]">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="px-2 py-4 text-right text-[#182537]">
                        {formatNumber(Number(product.sale_price ?? 0))}
                      </td>
                      <td className="px-2 py-4 text-right text-[#182537]">
                        {formatNumber(Number(product.cost_price ?? 0))}
                      </td>
                      <td className="px-5 py-4 text-right text-[#182537]">
                        0
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
