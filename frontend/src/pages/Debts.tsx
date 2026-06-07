import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Info, HandCoins, Loader2 } from 'lucide-react';
import {
  customersService,
  type Customer,
  type CustomerDebtSummary,
} from '../services/customersService';
import { PageLoader } from '../components/PageLoader';

type DebtsRouteState = {
  searchTerm?: string;
  customerId?: string;
  message?: string;
} | null;

type DebtCustomerRow = CustomerDebtSummary & {
  phone?: string;
};

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`;
}

export function Debts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debtRows, setDebtRows] = useState<CustomerDebtSummary[]>([]);
  const [customerMap, setCustomerMap] = useState<Record<string, Customer>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const routeState = location.state as DebtsRouteState;
    if (!routeState) {
      return;
    }

    if (typeof routeState.searchTerm === 'string') {
      setSearchTerm(routeState.searchTerm);
    }
    if (routeState.message) {
      setInfoMessage(routeState.message);
    }
    if (routeState.customerId) {
      navigate('/customers', {
        replace: true,
        state: {
          selectedCustomerId: routeState.customerId,
          detailTab: 'debt',
          message: routeState.message ?? 'Đang mở chi tiết công nợ khách hàng.',
        },
      });
      return;
    }

    navigate('/debts', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    let active = true;

    async function loadDebts() {
      setIsLoading(true);
      setError(null);

      try {
        const [debtSummary, customersResponse] = await Promise.all([
          customersService.getDebtSummary(),
          customersService.getAll({ page: 1, limit: 200 }),
        ]);

        if (!active) {
          return;
        }

        const nextCustomerMap = customersResponse.data.reduce<Record<string, Customer>>((acc, customer) => {
          acc[customer.id] = customer;
          return acc;
        }, {});

        setDebtRows(debtSummary);
        setCustomerMap(nextCustomerMap);
      } catch (nextError: any) {
        if (!active) {
          return;
        }
        setError(nextError?.message ?? 'Không tải được danh sách công nợ.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadDebts();

    return () => {
      active = false;
    };
  }, []);

  const debtors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return debtRows
      .filter((row) => Number(row.current_debt ?? 0) > 0)
      .map<DebtCustomerRow>((row) => ({
        ...row,
        phone: customerMap[row.customer_id]?.phone,
      }))
      .filter((row) => {
        if (!query) {
          return true;
        }

        return (
          row.full_name.toLowerCase().includes(query) ||
          row.customer_code.toLowerCase().includes(query) ||
          row.phone?.toLowerCase().includes(query)
        );
      });
  }, [customerMap, debtRows, searchTerm]);

  const totalDebt = debtors.reduce((sum, customer) => sum + Number(customer.current_debt ?? 0), 0);

  if (isLoading) {
    return <PageLoader text="Đang tải công nợ khách hàng..." minHeight="60vh" />;
  }

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 ui-card overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 shrink-0 bg-white">
          {infoMessage ? (
            <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {infoMessage}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">Danh sách khách nợ</h2>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm tên, SĐT..."
                className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none focus:ring-1 focus:ring-[#0088FF]"
              />
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                  <th className="py-3 px-5 font-semibold">Khách hàng</th>
                  <th className="py-3 px-4 font-semibold">SĐT</th>
                  <th className="py-3 px-4 text-right font-semibold">Tổng nợ</th>
                  <th className="py-3 px-5 text-center font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px] text-[#182537]">
                {debtors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                      Chưa có khách hàng nợ phù hợp.
                    </td>
                  </tr>
                ) : (
                  debtors.map((customer) => (
                    <tr
                      key={customer.customer_id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate('/customers', {
                          state: {
                            selectedCustomerId: customer.customer_id,
                            detailTab: 'debt',
                            message: `Đang mở công nợ của ${customer.full_name}.`,
                          },
                        })
                      }
                    >
                      <td className="py-4 px-5 font-medium text-[#182537]">{customer.full_name}</td>
                      <td className="py-4 px-4 text-slate-500 font-mono text-[13px]">{customer.phone ?? '---'}</td>
                      <td className="py-4 px-4 text-right font-bold text-red-500">{formatCurrency(Number(customer.current_debt ?? 0))}</td>
                      <td className="py-4 px-5 text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate('/customers', {
                              state: {
                                selectedCustomerId: customer.customer_id,
                                detailTab: 'debt',
                                message: `Đang mở công nợ của ${customer.full_name}.`,
                              },
                            });
                          }}
                          className="text-[#0088FF] text-[13px] font-medium hover:underline"
                        >
                          Thu nợ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>
      </div>

      <div className="w-full md:w-80 shrink-0 flex flex-col gap-6">
        <div className="bg-red-50 rounded p-5 border border-red-100">
          <div className="flex items-center gap-3 text-red-600 mb-2">
            <HandCoins size={24} />
            <h3 className="font-semibold text-[13px] uppercase">Tổng khách nợ</h3>
          </div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalDebt)}</p>
          <p className="text-[13px] mt-1 text-red-400 font-medium">Từ {debtors.length} khách hàng</p>
        </div>

        <div className="ui-card p-5">
          <h3 className="font-semibold text-[#182537] mb-4 flex items-center gap-2 text-[14px]">
            <Info size={18} className="text-[#0088FF]" /> Hướng dẫn thu nợ
          </h3>
          <ol className="text-[13px] text-slate-500 space-y-3 list-decimal list-inside leading-relaxed">
            <li>Chọn khách hàng trong danh sách bên trái.</li>
            <li>Bấm Thu nợ để mở chi tiết công nợ khách hàng.</li>
            <li>Kiểm tra tổng doanh số, đã thanh toán và công nợ hiện tại.</li>
            <li>Tiếp tục xử lý giao dịch tại trang Khách hàng hoặc Đơn hàng liên quan.</li>
            <li>Theo dõi lại lịch sử mua hàng trong chi tiết khách hàng.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
