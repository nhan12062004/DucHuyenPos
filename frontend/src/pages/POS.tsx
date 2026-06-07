import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Box,
  Clock,
  Gift,
  ImageIcon,
  Info,
  Loader2,
  PlusCircle,
  Search,
  Settings,
  Store,
  TruckIcon,
  X,
} from 'lucide-react';
import {
  customersService,
  type Customer,
  type CustomerDebtSummary,
} from '../services/customersService';
import { inventoryService, type Branch } from '../services/inventoryService';
import {
  productsService,
  type Product,
  type ProductStockSummary,
} from '../services/productsService';
import { salesOrdersService, type SalesOrder } from '../services/salesOrdersService';
import { cn } from '../utils/cn';
import { getDeliveryStatusFromTab, parseLegacyDeliveryTab } from '../utils/delivery';

type CartProduct = {
  id: string;
  name: string;
  subName: string;
  code: string;
  qty: number;
  price: number;
  discount: number;
  unitName: string;
};

type DeliveryTab =
  | 'hang_van_chuyen'
  | 'van_chuyen_ngoai'
  | 'nhan_tai_cua_hang'
  | 'giao_hang_sau';

const DELIVERY_MODE_TOKEN = '__DELIVERY_MODE__';

function getDeliveryLabel(tab: DeliveryTab) {
  if (tab === 'hang_van_chuyen') return 'Đẩy qua hãng vận chuyển';
  if (tab === 'van_chuyen_ngoai') return 'Đẩy vận chuyển ngoài';
  if (tab === 'nhan_tai_cua_hang') return 'Khách nhận tại cửa hàng';
  return 'Giao hàng sau';
}

function parseOrderNote(rawNote?: string | null) {
  const lines = (rawNote ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let tags = '';
  let deliveryDue = '';
  let issueInvoice = false;
  let deliveryTab: DeliveryTab = 'hang_van_chuyen';
  const businessLines: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith(`${DELIVERY_MODE_TOKEN}:`)) {
      const value = line.slice(`${DELIVERY_MODE_TOKEN}:`.length).trim() as DeliveryTab;
      if (value === 'hang_van_chuyen' || value === 'van_chuyen_ngoai' || value === 'nhan_tai_cua_hang' || value === 'giao_hang_sau') {
        deliveryTab = value;
      }
      return;
    }

    if (line.startsWith('Tags: ')) {
      tags = line.slice('Tags: '.length).trim();
      return;
    }

    if (line.startsWith('Hẹn giao: ')) {
      deliveryDue = line.slice('Hẹn giao: '.length).trim();
      return;
    }

    if (line === 'Phát hành hóa đơn điện tử') {
      issueInvoice = true;
      return;
    }

    if (line.startsWith('Hình thức giao hàng: ')) {
      const label = line.slice('Hình thức giao hàng: '.length).trim();
      if (label === 'Đẩy qua hãng vận chuyển') deliveryTab = 'hang_van_chuyen';
      else if (label === 'Đẩy vận chuyển ngoài') deliveryTab = 'van_chuyen_ngoai';
      else if (label === 'Khách nhận tại cửa hàng') deliveryTab = 'nhan_tai_cua_hang';
      else if (label === 'Giao hàng sau') deliveryTab = 'giao_hang_sau';
      return;
    }

    businessLines.push(line);
  });

  return {
    note: businessLines.join('\n'),
    tags,
    deliveryDue,
    issueInvoice,
    deliveryTab: parseLegacyDeliveryTab(rawNote) ?? deliveryTab,
  };
}

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN');
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPaymentStatus(totalAmount: number, paidAmount: number): SalesOrder['payment_status'] {
  if (paidAmount <= 0) {
    return 'unpaid';
  }
  if (paidAmount >= totalAmount) {
    return 'paid';
  }
  return 'partial';
}

export function POS() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { orderId?: string } | null;
  const editingOrderIdFromRoute = routeState?.orderId ?? '';

  const [activeDeliveryTab, setActiveDeliveryTab] = useState<DeliveryTab>('hang_van_chuyen');
  const [issueInvoice, setIssueInvoice] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [cartProducts, setCartProducts] = useState<CartProduct[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [source, setSource] = useState<'pos' | 'web' | 'phone' | 'manual'>('web');
  const [deliveryDue, setDeliveryDue] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [tags, setTags] = useState('');
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [editingOrderId, setEditingOrderId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockSummary, setStockSummary] = useState<Record<string, ProductStockSummary>>({});
  const [debtSummary, setDebtSummary] = useState<Record<string, CustomerDebtSummary>>({});
  const [loading, setLoading] = useState(true);
  const [hydratingOrder, setHydratingOrder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasHydratedRouteOrder, setHasHydratedRouteOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [branchList, customerList, debtList, productList, stockList] = await Promise.all([
          inventoryService.getBranches(),
          customersService.getAll({ page: 1, limit: 100, status: 'active' }),
          customersService.getDebtSummary(),
          productsService.getAll({ page: 1, limit: 100, status: 'active' }),
          productsService.getStockSummary(),
        ]);

        if (!active) {
          return;
        }

        const defaultBranch = branchList.find((branch) => branch.is_default) ?? branchList[0];
        const stockMap = stockList.reduce<Record<string, ProductStockSummary>>((acc, item) => {
          acc[item.product_id] = item;
          return acc;
        }, {});
        const debtMap = debtList.reduce<Record<string, CustomerDebtSummary>>((acc, item) => {
          acc[item.customer_id] = item;
          return acc;
        }, {});

        setBranches(branchList);
        setBranchId(defaultBranch?.id ?? '');
        setCustomers(customerList.data);
        setProducts(productList.data);
        setStockSummary(stockMap);
        setDebtSummary(debtMap);
      } catch (loadError: any) {
        if (!active) {
          return;
        }
        setError(loadError?.message ?? 'Không tải được dữ liệu tạo đơn hàng.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!editingOrderIdFromRoute || loading || hasHydratedRouteOrder) {
      return;
    }

    let active = true;

    async function hydrateOrder() {
      setHydratingOrder(true);
      setError(null);

      try {
        const order = await salesOrdersService.getOne(editingOrderIdFromRoute);
        if (!active) {
          return;
        }

        setEditingOrderId(order.id);
        setCustomerId(order.customer_id ?? '');
        setBranchId(order.branch_id);
        setSource(order.source);
        setOrderNo(order.order_no);
        const parsedNote = parseOrderNote(order.note);
        setOrderNote(parsedNote.note);
        setTags(parsedNote.tags);
        setDeliveryDue(parsedNote.deliveryDue);
        setIssueInvoice(parsedNote.issueInvoice);
        setOrderDiscount(Number(order.discount_amount ?? 0));
        setShippingFee(Number(order.shipping_fee ?? 0));
        setPaidAmount(Number(order.paid_amount ?? 0));
        setActiveDeliveryTab(
          order.delivery_method ??
            parseLegacyDeliveryTab(order.note, order.status) ??
            (order.status === 'completed' ? 'nhan_tai_cua_hang' : parsedNote.deliveryTab),
        );
        setCartProducts(
          (order.sales_order_items ?? []).map((item) => ({
            id: item.product_id,
            name: item.product_name,
            subName: item.unit_name || 'Mặc định',
            code: item.sku ?? '',
            qty: Number(item.quantity ?? 0),
            price: Number(item.unit_price ?? 0),
            discount: Number(item.discount_amount ?? 0),
            unitName: item.unit_name || 'cái',
          })),
        );
      } catch (loadError: any) {
        if (!active) {
          return;
        }
        setError(loadError?.message ?? 'Không tải được đơn hàng để chỉnh sửa.');
      } finally {
        if (active) {
          setHydratingOrder(false);
          setHasHydratedRouteOrder(true);
        }
      }
    }

    hydrateOrder();

    return () => {
      active = false;
    };
  }, [editingOrderIdFromRoute, hasHydratedRouteOrder, loading]);

  const selectedCustomer = customers.find((customer) => customer.id === customerId) ?? null;
  const selectedDebt = selectedCustomer ? debtSummary[selectedCustomer.id] : null;
  const hasCustomer = !!selectedCustomer;

  const filteredCustomers = customers.filter((customer) => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return (
      customer.full_name.toLowerCase().includes(query) ||
      customer.code.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
  });

  const filteredProducts = products.filter((product) => {
    const query = productQuery.trim().toLowerCase();
    if (!query) {
      return false;
    }

    return (
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query)
    );
  });

  const handleCustomerSelect = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerQuery('');
    setSuccessMessage(null);
  };

  const handleProductSelect = (product: Product) => {
    setCartProducts((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          subName: product.unit_name || 'Mặc định',
          code: product.sku,
          qty: 1,
          price: Number(product.sale_price ?? 0),
          discount: 0,
          unitName: product.unit_name || 'cái',
        },
      ];
    });
    setIsDropdownOpen(false);
    setProductQuery('');
    setSuccessMessage(null);
    setError(null);
  };

  const updateCartProduct = (
    productId: string,
    field: 'qty' | 'price' | 'discount',
    value: number,
  ) => {
    setCartProducts((current) =>
      current.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        if (field === 'qty') {
          return { ...item, qty: Math.max(1, value) };
        }

        return { ...item, [field]: Math.max(0, value) };
      }),
    );
  };

  const subtotal = cartProducts.reduce((sum, item) => sum + item.price * item.qty - item.discount, 0);
  const totalAmount = Math.max(0, subtotal - orderDiscount + shippingFee);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  const handleApplyDiscount = () => {
    const nextValue = window.prompt('Nhập chiết khấu đơn hàng', String(orderDiscount));
    if (nextValue === null) {
      return;
    }
    setOrderDiscount(Math.max(0, parseNumber(nextValue)));
  };

  const handleApplyShippingFee = () => {
    const nextValue = window.prompt('Nhập phí giao hàng', String(shippingFee));
    if (nextValue === null) {
      return;
    }
    setShippingFee(Math.max(0, parseNumber(nextValue)));
  };

  const handleSubmit = async () => {
    if (!branchId) {
      setError('Vui lòng chọn chi nhánh bán.');
      return;
    }

    if (cartProducts.length === 0) {
      setError('Bạn cần thêm ít nhất 1 sản phẩm.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const orderStatus: SalesOrder['status'] =
        activeDeliveryTab === 'nhan_tai_cua_hang' ? 'completed' : 'pending';
      const noteParts = [
        orderNote.trim(),
        tags.trim() ? `Tags: ${tags.trim()}` : '',
        deliveryDue.trim() ? `Hẹn giao: ${deliveryDue.trim()}` : '',
        issueInvoice ? 'Phát hành hóa đơn điện tử' : '',
      ].filter(Boolean);

      const payload = {
        branch_id: branchId,
        customer_id: customerId || undefined,
        order_no: orderNo.trim() || undefined,
        source,
        status: orderStatus,
        payment_status: getPaymentStatus(totalAmount, paidAmount),
        paid_amount: paidAmount,
        shipping_fee: shippingFee,
        discount_amount: orderDiscount,
        note: noteParts.join('\n'),
        delivery_address: selectedCustomer?.address || undefined,
        delivery_method: activeDeliveryTab,
        delivery_status: getDeliveryStatusFromTab(activeDeliveryTab),
        items: cartProducts.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          sku: item.code,
          unit_name: item.unitName,
          quantity: item.qty,
          unit_price: item.price,
          discount_amount: item.discount,
        })),
      };

      const savedOrder = editingOrderId
        ? await salesOrdersService.update(editingOrderId, payload)
        : await salesOrdersService.create(payload);

      if (editingOrderId) {
        navigate('/orders', {
          state: {
            selectedOrderId: savedOrder.id,
            message: `Đã cập nhật đơn hàng ${savedOrder.order_no}.`,
          },
        });
        return;
      }

      setSuccessMessage(`Đã tạo đơn hàng ${savedOrder.order_no}.`);
      setCartProducts([]);
      setOrderNo('');
      setOrderNote('');
      setTags('');
      setProductQuery('');
      setOrderDiscount(0);
      setShippingFee(0);
      setPaidAmount(0);
    } catch (submitError: any) {
      setError(submitError?.message ?? 'Tạo đơn hàng thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || hydratingOrder) {
    return (
      <div className="page-shell flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium">
            {hydratingOrder ? 'Đang tải đơn hàng để chỉnh sửa...' : 'Đang tải dữ liệu...'}
          </p>
        </div>
      </div>
    );
  }

  if (error && !branches.length && !customers.length && !products.length) {
    return (
      <div className="page-shell flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-red-500">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-blue-600 underline"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F4F6F8] pb-20 font-sans text-sm">
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <div className="ui-card flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <div>
                  <h2 className="font-semibold text-slate-800">Thông tin khách hàng</h2>
                  {hasCustomer && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-medium text-blue-600">{selectedCustomer.full_name}</span>
                      <button
                        onClick={() => setCustomerId('')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium uppercase text-slate-600">
                  <input
                    type="checkbox"
                    checked={issueInvoice}
                    onChange={(event) => setIssueInvoice(event.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Phát hành hóa đơn điện tử
                  <Info size={14} className="text-slate-400" />
                </label>
              </div>

              {!hasCustomer ? (
                <div className="flex h-full flex-col p-5">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      id="pos-customer-search"
                      type="text"
                      value={customerQuery}
                      onChange={(event) => setCustomerQuery(event.target.value)}
                      placeholder="Tìm theo tên, SĐT, mã khách hàng ... (F4)"
                      className="w-full rounded border border-slate-300 py-2 pl-9 pr-4 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {customerQuery.trim() ? (
                    <div className="mb-4 max-h-56 overflow-auto rounded border border-slate-200 bg-white">
                      {filteredCustomers.length === 0 ? (
                        <div className="px-4 py-6 text-center text-slate-400">
                          Không tìm thấy khách hàng phù hợp
                        </div>
                      ) : (
                        filteredCustomers.slice(0, 8).map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleCustomerSelect(customer)}
                            className="flex w-full items-start justify-between border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                          >
                            <div>
                              <p className="font-medium text-slate-800">{customer.full_name}</p>
                              <p className="mt-0.5 text-[12px] text-slate-500">
                                {customer.code} {customer.phone ? `· ${customer.phone}` : ''}
                              </p>
                              <p className="mt-0.5 text-[12px] text-slate-400">
                                {customer.address || 'Chưa có địa chỉ'}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}

                  <div className="flex flex-1 flex-col items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50/50 py-8 text-slate-400">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded bg-slate-100">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-slate-300"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <p>Chưa có thông tin khách hàng</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between p-5">
                  <div className="flex justify-between gap-6">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold uppercase text-slate-800">Địa chỉ giao hàng</span>
                        <button
                          type="button"
                          onClick={() => setCustomerId('')}
                          className="font-medium text-blue-600 hover:text-blue-700"
                        >
                          Thay đổi
                        </button>
                      </div>
                      <p className="text-slate-800">{selectedCustomer.phone || 'Chưa có số điện thoại'}</p>
                      <p className="text-slate-800">{selectedCustomer.address || 'Chưa có địa chỉ giao hàng'}</p>
                    </div>
                    <div className="w-[300px] space-y-3 rounded border border-dashed border-slate-300 bg-white p-4 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Nợ phải thu</span>
                        <span className="font-medium text-red-500">
                          {formatNumber(Number(selectedDebt?.current_debt ?? 0))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tổng chi tiêu</span>
                        <span className="font-medium text-blue-600">
                          {formatNumber(Number(selectedDebt?.total_sales ?? 0))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Đã thanh toán</span>
                        <span className="font-medium text-blue-600">
                          {formatNumber(Number(selectedDebt?.total_paid ?? 0))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Mã khách hàng</span>
                        <span className="font-medium text-slate-700">{selectedCustomer.code}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-center border-t border-slate-50 pt-4">
                    <button
                      onClick={() => navigate('/customers')}
                      className="flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
                    >
                      Xem thêm
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-1">
            <div className="ui-card h-full p-5">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Thông tin bổ sung</h2>
                <button className="text-slate-400 hover:text-slate-600">
                  <Settings size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="w-20 text-[13px] text-slate-600">Bán tại</label>
                  <select
                    value={branchId}
                    onChange={(event) => setBranchId(event.target.value)}
                    className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none"
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-20 text-[13px] text-slate-600">Bán bởi</label>
                  <select className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none">
                    <option>Nhân viên tại quầy</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-20 text-[13px] text-slate-600">Nguồn</label>
                  <select
                    value={source}
                    onChange={(event) =>
                      setSource(event.target.value as 'pos' | 'web' | 'phone' | 'manual')
                    }
                    className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none"
                  >
                    <option value="web">Web</option>
                    <option value="pos">POS</option>
                    <option value="phone">Điện thoại</option>
                    <option value="manual">Thủ công</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-20 text-[13px] text-slate-600">Hẹn giao</label>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={deliveryDue}
                      onChange={(event) => setDeliveryDue(event.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none"
                    />
                    <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-20 text-[13px] text-slate-600">Mã đơn</label>
                  <input
                    type="text"
                    value={orderNo}
                    onChange={(event) => setOrderNo(event.target.value)}
                    className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-[13px] focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-card relative">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="font-semibold text-slate-800">Thông tin sản phẩm</h2>
            <div className="flex items-center gap-4 text-[13px]">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Tách dòng
              </label>
              <button
                onClick={() => navigate('/inventory')}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Kiểm tra tồn kho
              </button>
              <button className="text-slate-400 hover:text-slate-600">
                <Settings size={16} />
              </button>
            </div>
          </div>

          <div className="relative z-20 flex items-center gap-2 border-b border-slate-100 bg-white p-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm theo tên, mã SKU, hoặc quét mã Barcode...(F3)"
                className={cn(
                  'w-full rounded border py-2 pl-9 pr-8 text-[13px] transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  isDropdownOpen && productQuery ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-300',
                )}
                value={productQuery}
                onChange={(event) => {
                  setProductQuery(event.target.value);
                  setIsDropdownOpen(!!event.target.value);
                }}
              />
              {productQuery && (
                <button
                  onClick={() => {
                    setProductQuery('');
                    setIsDropdownOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              )}

              {isDropdownOpen && productQuery && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => navigate('/products')}
                    className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3 text-left font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <PlusCircle size={16} /> Thêm mới sản phẩm
                  </button>

                  {filteredProducts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[13px] text-slate-400">
                      Không tìm thấy sản phẩm phù hợp
                    </div>
                  ) : (
                    filteredProducts.slice(0, 8).map((product) => {
                      const stock = stockSummary[product.id];

                      return (
                        <button
                          key={product.id}
                          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                          onClick={() => handleProductSelect(product)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-300">
                              <ImageIcon size={20} />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-slate-800">{product.name}</p>
                              <p className="mt-0.5 text-[12px] text-blue-600">
                                {product.sku} <span className="ml-1 text-slate-500">{product.unit_name || 'Mặc định'}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{formatNumber(Number(product.sale_price ?? 0))}</p>
                            <p className="mt-0.5 text-[12px] text-slate-500">
                              Tồn: <span className="text-red-500">{formatNumber(Number(stock?.total_on_hand_qty ?? 0))}</span> | Có thể bán:{' '}
                              <span className="text-red-500">{formatNumber(Number(stock?.total_available_qty ?? 0))}</span>
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsDropdownOpen(true)}
              className="shrink-0 rounded border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Chọn nhanh
            </button>
            <button
              onClick={() => setSuccessMessage('Bạn có thể dùng ô tìm sản phẩm để lọc nhanh theo tên hoặc SKU.')}
              className="flex shrink-0 items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              (F10)
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-400"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <select className="shrink-0 rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-blue-500 focus:outline-none">
              <option>Giá bán lẻ</option>
              <option>Giá bán buôn</option>
            </select>
          </div>

          {cartProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center bg-white py-20 text-slate-400">
              <div className="mb-4">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="#F1F5F9"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </div>
              <p className="mb-4 text-[13px] font-medium">Chưa có thông tin sản phẩm</p>
              <button
                onClick={() => setIsDropdownOpen(true)}
                className="rounded border border-blue-400 bg-white px-6 py-2 text-[13px] font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                Thêm sản phẩm
              </button>
            </div>
          ) : (
            <div className="relative z-10 min-h-[150px] overflow-x-auto bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-white text-[13px] font-semibold text-slate-700">
                    <th className="w-12 px-5 py-3 text-center">STT</th>
                    <th className="w-16 px-2 py-3">Ảnh</th>
                    <th className="min-w-[200px] px-2 py-3">Tên sản phẩm</th>
                    <th className="w-24 px-2 py-3 text-center">Số lượng</th>
                    <th className="w-28 px-2 py-3 text-right">Đơn giá</th>
                    <th className="w-24 px-2 py-3 text-right">Chiết khấu</th>
                    <th className="w-32 px-5 py-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cartProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className="border border-blue-400 bg-blue-50/30 shadow-[inset_0_0_0_1px_#60A5FA]"
                    >
                      <td className="px-5 py-4 text-center font-medium text-slate-600">{index + 1}</td>
                      <td className="px-2 py-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-300">
                          <ImageIcon size={20} />
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-1 text-[13px] font-medium text-[#0A1629]">
                          {product.name}
                          <Info size={12} className="mt-0.5 text-yellow-500" />
                        </div>
                        <div className="mt-0.5 text-[12px] text-slate-500">{product.subName}</div>
                        <div className="text-[12px] text-blue-500">{product.code}</div>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <input
                          type="number"
                          min={1}
                          value={product.qty}
                          onChange={(event) =>
                            updateCartProduct(product.id, 'qty', parseNumber(event.target.value))
                          }
                          className="w-14 border-b-[1.5px] border-blue-500 bg-transparent py-1 text-center font-semibold text-blue-600 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-4 text-right">
                        <input
                          type="number"
                          min={0}
                          value={product.price}
                          onChange={(event) =>
                            updateCartProduct(product.id, 'price', parseNumber(event.target.value))
                          }
                          className="w-full border-b border-transparent bg-transparent py-1 text-right text-slate-800 hover:border-slate-300 focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-4 text-right">
                        <input
                          type="number"
                          min={0}
                          value={product.discount}
                          onChange={(event) =>
                            updateCartProduct(product.id, 'discount', parseNumber(event.target.value))
                          }
                          className="w-full border-b border-transparent bg-transparent py-1 text-right text-slate-800 hover:border-slate-300 focus:outline-none"
                        />
                      </td>
                      <td className="flex h-full items-center justify-end gap-3 px-5 py-4 text-right font-medium text-slate-800">
                        {formatNumber(product.price * product.qty - product.discount)}
                        <button
                          onClick={() =>
                            setCartProducts((current) => current.filter((item) => item.id !== product.id))
                          }
                          className="ml-2 text-slate-400 transition-colors hover:text-red-500"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="relative z-10 flex items-center justify-between border-t border-slate-100 bg-white px-5 py-4">
            <button
              onClick={() =>
                setSuccessMessage('Muốn thêm dịch vụ khác, bạn hãy tạo sản phẩm dịch vụ trong danh mục sản phẩm rồi chọn lại tại đây.')
              }
              className="flex items-center gap-2 font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              <PlusCircle size={16} /> Thêm dịch vụ khác (F9)
            </button>
            <button
              onClick={handleApplyDiscount}
              className="flex items-center gap-2 font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              <Gift size={16} /> Áp dụng chương trình khuyến mại
            </button>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-8 border-t border-slate-100 bg-white p-5 md:grid-cols-2">
            <div className="space-y-5">
              <div>
                <label className="mb-1 flex items-center gap-1 text-[13px] font-medium text-slate-700">
                  Tags <Info size={12} className="text-blue-500" />
                </label>
                <textarea
                  rows={3}
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="Nhập ký tự và ấn enter"
                  className="w-full rounded border border-slate-300 p-3 text-[13px] transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-700">Ghi chú đơn hàng</label>
                <textarea
                  rows={3}
                  value={orderNote}
                  onChange={(event) => setOrderNote(event.target.value)}
                  placeholder="VD: Hàng tặng gói riêng"
                  className="w-full rounded border border-slate-300 p-3 text-[13px] transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-4 text-[13px]">
              <div className="flex items-center justify-between text-slate-700">
                <span>Tổng tiền ({cartProducts.length} sản phẩm)</span>
                <span className="font-semibold">{formatNumber(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <button onClick={handleApplyDiscount} className="text-left">
                  Chiết khấu (F6)
                </button>
                <span className="font-semibold">
                  {formatNumber(orderDiscount + cartProducts.reduce((sum, item) => sum + item.discount, 0))}
                </span>
              </div>
              <div
                onClick={handleApplyShippingFee}
                className="flex cursor-pointer items-center justify-between text-blue-600"
              >
                <span>Phí giao hàng (F7)</span>
                <span className="font-semibold text-slate-700">{formatNumber(shippingFee)}</span>
              </div>
              <div
                onClick={handleApplyDiscount}
                className="flex cursor-pointer items-center justify-between text-blue-600"
              >
                <span className="flex items-center gap-1">
                  Mã giảm giá
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
                <span className="font-semibold text-slate-700">{formatNumber(orderDiscount)}</span>
              </div>

              <div className="flex items-center justify-between pt-2 text-base font-bold text-slate-800">
                <span>Khách phải trả</span>
                <span>{formatNumber(totalAmount)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-slate-700">
                <span>Khách đã trả</span>
                <input
                  type="number"
                  min={0}
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(Math.max(0, parseNumber(event.target.value)))}
                  className="w-28 border-b border-dashed border-slate-300 bg-transparent text-right font-semibold focus:outline-none"
                />
              </div>

              <button
                onClick={() => setPaidAmount(totalAmount)}
                className="flex items-center gap-1 py-1 font-medium text-blue-600 hover:text-blue-700"
              >
                <PlusCircle size={14} /> Thêm phương thức
              </button>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2 font-bold text-slate-800">
                <span>Còn phải trả</span>
                <span>{formatNumber(remainingAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="ui-card p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Đóng gói và giao hàng</h2>

          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveDeliveryTab('hang_van_chuyen')}
              className={cn(
                'flex items-center gap-2 rounded border px-4 py-2 font-medium transition-colors',
                activeDeliveryTab === 'hang_van_chuyen'
                  ? 'border-blue-600 text-blue-600 shadow-[0_4px_0_-1px_#2563EB]'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50',
              )}
            >
              <TruckIcon size={18} /> Đẩy qua hãng vận chuyển
            </button>
            <button
              onClick={() => setActiveDeliveryTab('van_chuyen_ngoai')}
              className={cn(
                'flex items-center gap-2 rounded border px-4 py-2 font-medium transition-colors',
                activeDeliveryTab === 'van_chuyen_ngoai'
                  ? 'border-blue-600 text-blue-600 shadow-[0_4px_0_-1px_#2563EB]'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50',
              )}
            >
              <TruckIcon size={18} /> Đẩy vận chuyển ngoài
            </button>
            <button
              onClick={() => setActiveDeliveryTab('nhan_tai_cua_hang')}
              className={cn(
                'flex items-center gap-2 rounded border px-4 py-2 font-medium transition-colors',
                activeDeliveryTab === 'nhan_tai_cua_hang'
                  ? 'border-blue-600 text-blue-600 shadow-[0_4px_0_-1px_#2563EB]'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50',
              )}
            >
              <Store size={18} /> Khách nhận tại cửa hàng
            </button>
            <button
              onClick={() => setActiveDeliveryTab('giao_hang_sau')}
              className={cn(
                'flex items-center gap-2 rounded border px-4 py-2 font-medium transition-colors',
                activeDeliveryTab === 'giao_hang_sau'
                  ? 'border-blue-600 text-blue-600 shadow-[0_4px_0_-1px_#2563EB]'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50',
              )}
            >
              <Box size={18} /> Giao hàng sau
            </button>
          </div>

          <div className="ui-subtle-panel p-4 text-slate-600">
            {selectedCustomer ? (
              <>
                Giao theo khách hàng: <span className="font-medium text-slate-800">{selectedCustomer.full_name}</span>
                {selectedCustomer.address ? ` - ${selectedCustomer.address}` : ' - Chưa có địa chỉ giao hàng'}
              </>
            ) : (
              <>
                Bạn hãy thêm thông tin khách hàng để sử dụng dịch vụ giao hàng.{' '}
                <button
                  onClick={() => document.getElementById('pos-customer-search')?.focus()}
                  className="text-blue-600 hover:underline"
                >
                  Cập nhật tại đây
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Thoát
          </button>
          <div className="flex">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-l border border-blue-600 bg-blue-600 px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {editingOrderId ? 'Đang cập nhật...' : 'Đang tạo...'}
                </span>
              ) : editingOrderId ? (
                'Cập nhật đơn hàng (F1)'
              ) : (
                'Tạo đơn hàng (F1)'
              )}
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center justify-center rounded-r border-l border-blue-700 bg-blue-600 px-2 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
