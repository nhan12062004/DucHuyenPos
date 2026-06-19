import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  ChevronDown,
  Loader2,
  MinusCircle,
  PackagePlus,
  Search,
} from 'lucide-react';
import { PageLoader } from '../components/PageLoader';
import { inventoryService, type Branch } from '../services/inventoryService';
import { productsService, type Product } from '../services/productsService';
import { purchaseOrdersService, type PurchaseOrder } from '../services/purchaseOrdersService';
import { suppliersService, type Supplier } from '../services/suppliersService';
import { ToastBridge } from '../components/Toast';

type ImportLine = {
  product: Product;
  quantity: number;
  unit_cost: number;
};

function formatCurrency(value: number) {
  return value.toLocaleString('vi-VN');
}

function formatDateTime(value?: string) {
  if (!value) return '---';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function getPaymentLabel(order: PurchaseOrder) {
  if (order.payment_status === 'paid') return 'Đã thanh toán';
  if (order.payment_status === 'partial') return 'Thanh toán một phần';
  return 'Công nợ';
}

export function PurchaseImport() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<ImportLine[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [note, setNote] = useState('');
  const [createdOrder, setCreatedOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [productsResponse, suppliersResponse, branchesResponse] = await Promise.all([
          productsService.getAll({ page: 1, limit: 200, status: 'active' }),
          suppliersService.getAll({ page: 1, limit: 200, status: 'active' }),
          inventoryService.getBranches(),
        ]);

        if (!active) return;

        setProducts(productsResponse.data);
        setSuppliers(suppliersResponse.data);
        setBranches(branchesResponse);
        setSelectedBranchId(branchesResponse.find((branch) => branch.is_default)?.id ?? branchesResponse[0]?.id ?? '');
        setSelectedSupplierId(suppliersResponse.data[0]?.id ?? '');
      } catch (nextError: any) {
        if (active) setError(nextError?.message ?? 'Không tải được dữ liệu nhập hàng.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return products.slice(0, 8);

    return products
      .filter((product) =>
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.sku?.toLowerCase().includes(normalizedQuery) ||
        product.barcode?.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 8);
  }, [products, query]);

  const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
  const subtotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_cost || 0), 0);
  const debtAmount = Math.max(0, subtotal - paidAmount);

  const addProduct = (product: Product) => {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: Number(line.quantity || 0) + 1 } : line,
        );
      }

      return [
        ...current,
        {
          product,
          quantity: 1,
          unit_cost: Number(product.cost_price ?? 0),
        },
      ];
    });
    setQuery('');
  };

  const updateLine = (productId: string, patch: Partial<Pick<ImportLine, 'quantity' | 'unit_cost'>>) => {
    setLines((current) =>
      current.map((line) => (line.product.id === productId ? { ...line, ...patch } : line)),
    );
  };

  const removeLine = (productId: string) => {
    setLines((current) => current.filter((line) => line.product.id !== productId));
  };

  const handleSave = async () => {
    if (!selectedBranchId) {
      setInfoMessage('Vui lòng chọn chi nhánh nhập kho.');
      return;
    }
    if (!selectedSupplierId) {
      setInfoMessage('Vui lòng chọn nhà cung cấp.');
      return;
    }
    if (!lines.length) {
      setInfoMessage('Vui lòng thêm ít nhất một sản phẩm nhập kho.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const order = await purchaseOrdersService.create({
        branch_id: selectedBranchId,
        supplier_id: selectedSupplierId,
        status: 'received',
        paid_amount: Math.min(paidAmount, subtotal),
        payment_method: 'cash',
        note: note.trim() || undefined,
        items: lines.map((line) => ({
          product_id: line.product.id,
          product_name: line.product.name,
          quantity: Number(line.quantity || 0),
          unit_cost: Number(line.unit_cost || 0),
        })),
      });

      setCreatedOrder(order);
      setLines([]);
      setPaidAmount(0);
      setNote('');
      setInfoMessage(`Đã hoàn tất nhập hàng ${order.order_no} và cập nhật tồn kho.`);
    } catch (nextError: any) {
      setError(nextError?.message ?? 'Không tạo được phiếu nhập hàng.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <PageLoader text="Đang tải nhập hàng..." fullScreen />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <ToastBridge message={infoMessage} onDone={() => setInfoMessage(null)} />
      <ToastBridge message={error} variant="error" onDone={() => setError(null)} />

      <div className="space-y-4">
        <section className="border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-[16px] font-semibold text-[#182537]">Chi tiết phiếu nhập</h2>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm sản phẩm theo tên, SKU hoặc barcode"
                className="h-10 w-full border border-slate-300 bg-white pl-9 pr-4 text-[13px] outline-none focus:border-[#0088FF]"
              />
            </div>

            {query.trim() ? (
              <div className="mt-2 max-h-72 overflow-y-auto border border-slate-200 bg-white shadow-lg">
                {filteredProducts.length ? (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left text-[13px] hover:bg-slate-50"
                    >
                      <span>
                        <span className="block font-medium text-[#182537]">{product.name}</span>
                        <span className="mt-1 block text-[12px] text-slate-500">{product.sku || '---'} - {product.unit_name || 'cái'}</span>
                      </span>
                      <span className="font-semibold text-[#0088FF]">{formatCurrency(Number(product.cost_price ?? 0))} đ</span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-[13px] text-slate-500">Không tìm thấy sản phẩm.</div>
                )}
              </div>
            ) : null}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-[#182537]">
                <tr>
                  <th className="w-12 px-5 py-3 text-center">STT</th>
                  <th className="px-2 py-3">Tên hàng</th>
                  <th className="w-32 px-2 py-3 text-right">Số lượng nhập</th>
                  <th className="w-36 px-2 py-3 text-right">Đơn giá nhập</th>
                  <th className="w-40 px-5 py-3 text-right">Thành tiền</th>
                  <th className="w-12 px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.length ? (
                  lines.map((line, index) => (
                    <tr key={line.product.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-center font-medium text-slate-500">{index + 1}</td>
                      <td className="px-2 py-4">
                        <div className="font-medium text-[#182537]">{line.product.name}</div>
                        <div className="mt-1 text-[12px] text-slate-500">{line.product.sku || '---'} - {line.product.unit_name || 'cái'}</div>
                      </td>
                      <td className="px-2 py-4">
                        <input
                          type="number"
                          min={0.01}
                          value={line.quantity}
                          onChange={(event) => updateLine(line.product.id, { quantity: Number(event.target.value) })}
                          className="h-8 w-full border border-slate-300 px-2 text-right outline-none focus:border-[#0088FF]"
                        />
                      </td>
                      <td className="px-2 py-4">
                        <input
                          type="number"
                          min={0}
                          value={line.unit_cost}
                          onChange={(event) => updateLine(line.product.id, { unit_cost: Number(event.target.value) })}
                          className="h-8 w-full border border-slate-300 px-2 text-right outline-none focus:border-[#0088FF]"
                        />
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-[#182537]">
                        {formatCurrency(Number(line.quantity || 0) * Number(line.unit_cost || 0))} đ
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(line.product.id)}
                          className="text-slate-400 hover:text-red-500"
                          aria-label="Xóa dòng"
                        >
                          <MinusCircle size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                      Tìm và thêm sản phẩm để bắt đầu nhập hàng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {createdOrder ? (
          <section className="border border-emerald-200 bg-emerald-50 px-5 py-4 text-[13px] text-emerald-700">
            <div className="font-semibold">Phiếu nhập vừa tạo: {createdOrder.order_no}</div>
            <div className="mt-1">
              {createdOrder.suppliers?.name ?? 'Nhà cung cấp'} - {formatCurrency(Number(createdOrder.total_amount ?? 0))} đ - {getPaymentLabel(createdOrder)}
            </div>
            <div className="mt-1 text-emerald-600">Ngày tạo: {formatDateTime(createdOrder.ordered_at)}</div>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4">
        <section className="border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-[14px] font-semibold uppercase tracking-wide text-[#182537]">Thông tin nhập hàng</h3>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-slate-600">Chi nhánh nhập</label>
              <div className="relative">
                <select
                  value={selectedBranchId}
                  onChange={(event) => setSelectedBranchId(event.target.value)}
                  className="h-9 w-full appearance-none border border-slate-300 bg-white px-3 pr-8 text-[13px] outline-none focus:border-[#0088FF]"
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-slate-600">Nhà cung cấp</label>
              <div className="relative">
                <select
                  value={selectedSupplierId}
                  onChange={(event) => setSelectedSupplierId(event.target.value)}
                  className="h-9 w-full appearance-none border border-slate-300 bg-white px-3 pr-8 text-[13px] outline-none focus:border-[#0088FF]"
                >
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-medium text-slate-600">Ghi chú</label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="w-full resize-none border border-slate-300 px-3 py-2 text-[13px] outline-none focus:border-[#0088FF]"
              />
            </div>
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-[14px] font-semibold uppercase tracking-wide text-[#182537]">Thanh toán</h3>

          <div className="space-y-3 text-[13px]">
            <div className="flex justify-between text-[#182537]">
              <span>Số mã hàng</span>
              <span>{lines.length} mã</span>
            </div>
            <div className="flex justify-between text-[#182537]">
              <span>Tổng SL nhập</span>
              <span>{formatCurrency(totalQuantity)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-[14px] font-semibold text-[#182537]">
              <span>Tiền hàng</span>
              <span>{formatCurrency(subtotal)} đ</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 py-3 font-medium text-[#182537]">
              <span>Đã trả NCC</span>
              <input
                type="number"
                min={0}
                value={paidAmount}
                onChange={(event) => setPaidAmount(Math.max(0, Number(event.target.value)))}
                className="h-8 w-32 border border-slate-300 px-2 text-right outline-none focus:border-[#0088FF]"
              />
            </div>
            <div className="flex items-center justify-between text-[#182537]">
              <span>Tính vào công nợ</span>
              <span className="text-[14px] font-semibold text-orange-600">{formatCurrency(debtAmount)} đ</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="mt-6 flex h-10 w-full items-center justify-center gap-2 bg-[#0088FF] text-[13px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Hoàn tất nhập hàng
          </button>

          <div className="mt-4 flex items-start gap-2 border border-blue-100 bg-blue-50 p-3 text-[12px] text-blue-700">
            <PackagePlus size={15} className="mt-0.5 shrink-0" />
            <span>Hoàn tất nhập hàng sẽ tạo phiếu nhập, ghi thanh toán nhà cung cấp và cộng tồn kho ngay.</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
