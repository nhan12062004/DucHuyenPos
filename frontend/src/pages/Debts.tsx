import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Info, HandCoins, Loader2 } from 'lucide-react';
import {
  customersService,
  type Customer,
  type CustomerDebtSummary,
} from '../services/customersService';

type DebtsRouteState = {
  searchTerm?: string;
  customerId?: string;
  message?: string;
} | null;

type DebtCustomerRow = CustomerDebtSummary & {
  phone?: string;
};

function formatCurrency(value: number) {
  return `${value.toLocaleString('vi-VN')} d`;
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
          message: routeState.message ?? 'Dang mo chi tiet cong no khach hang.',
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
        setError(nextError?.message ?? 'Khong tai duoc danh sach cong no.');
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

  return (
    <div className="flex h-full gap-6 bg-[#f3f4f6]">
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
          {infoMessage ? (
            <div className="mb-3 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {infoMessage}
            </div>
          ) : null}

          {error ? (
            <div className="mb-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex justify-between items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-slate-800">Danh sach khach no</h2>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tim ten, SDT..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded text-sm focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#0088FF]" />
                <p className="text-sm font-medium">Dang tai cong no khach hang...</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-white sticky top-0">
                <tr className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="py-3 px-4 font-semibold">Khach hang</th>
                  <th className="py-3 px-4 font-semibold">SDT</th>
                  <th className="py-3 px-4 text-right font-semibold">Tong no</th>
                  <th className="py-3 px-4 text-center font-semibold">Thao tac</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {debtors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      Chua co khach hang no phu hop.
                    </td>
                  </tr>
                ) : (
                  debtors.map((customer) => (
                    <tr
                      key={customer.customer_id}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate('/customers', {
                          state: {
                            selectedCustomerId: customer.customer_id,
                            detailTab: 'debt',
                            message: `Dang mo cong no cua ${customer.full_name}.`,
                          },
                        })
                      }
                    >
                      <td className="py-3 px-4 font-medium text-slate-800">{customer.full_name}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-sm">{customer.phone ?? '---'}</td>
                      <td className="py-3 px-4 text-right font-bold text-orange-600">{formatCurrency(Number(customer.current_debt ?? 0))}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate('/customers', {
                              state: {
                                selectedCustomerId: customer.customer_id,
                                detailTab: 'debt',
                                message: `Dang mo cong no cua ${customer.full_name}.`,
                              },
                            });
                          }}
                          className="text-blue-600 text-sm font-medium hover:underline"
                        >
                          Thu no
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="w-80 shrink-0 flex flex-col gap-6">
        <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
          <div className="flex items-center gap-3 text-orange-800 mb-2">
            <HandCoins size={24} />
            <h3 className="font-semibold text-sm uppercase">Tong khach no</h3>
          </div>
          <p className="text-3xl font-bold text-orange-700">{formatCurrency(totalDebt)}</p>
          <p className="text-sm mt-1 text-orange-600 font-medium">Tu {debtors.length} khach hang</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex-1">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Info size={18} className="text-blue-600" /> Huong dan thu no
          </h3>
          <ol className="text-sm text-slate-600 space-y-3 list-decimal list-inside">
            <li>Chon khach hang trong danh sach ben trai.</li>
            <li>Bam Thu no de mo chi tiet cong no khach hang.</li>
            <li>Kiem tra tong doanh so, da thanh toan va cong no hien tai.</li>
            <li>Tiep tuc xu ly giao dich tai trang Khach hang hoac Don hang lien quan.</li>
            <li>Theo doi lai lich su mua hang trong chi tiet khach hang.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
