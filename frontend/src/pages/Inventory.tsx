import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  AlertTriangle,
  ArrowRightLeft,
  ArrowDownToLine,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  inventoryService,
  type Branch,
  type BranchStock,
} from '../services/inventoryService';

type InventoryRouteState = {
  branchId?: string;
  searchTerm?: string;
  lowStockOnly?: boolean;
  message?: string;
} | null;

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN');
}

function isLowStock(row: BranchStock) {
  const reorderLevel = Number(row.products?.reorder_level ?? 0);
  return reorderLevel > 0 && Number(row.on_hand_qty ?? 0) <= reorderLevel;
}

export function Inventory() {
  const [stockRows, setStockRows] = useState<BranchStock[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const routeState = location.state as InventoryRouteState;
    if (!routeState) {
      return;
    }

    if (typeof routeState.branchId === 'string') {
      setSelectedBranchId(routeState.branchId);
    }
    if (typeof routeState.searchTerm === 'string') {
      setSearchTerm(routeState.searchTerm);
    }
    if (typeof routeState.lowStockOnly === 'boolean') {
      setLowStockOnly(routeState.lowStockOnly);
    }
    if (routeState.message) {
      setInfoMessage(routeState.message);
    }

    navigate('/inventory', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    let active = true;

    async function loadInventory() {
      setIsLoading(true);
      setError(null);

      try {
        const [stockResponse, branchesResponse] = await Promise.all([
          inventoryService.getStock({
            page: 1,
            limit: 200,
            search: searchTerm || undefined,
            branch_id: selectedBranchId || undefined,
          }),
          inventoryService.getBranches(),
        ]);

        if (!active) {
          return;
        }

        setStockRows(stockResponse.data);
        setBranches(branchesResponse);
      } catch (nextError: any) {
        if (!active) {
          return;
        }
        setError(nextError?.message ?? 'Khong tai duoc du lieu ton kho.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadInventory();

    return () => {
      active = false;
    };
  }, [searchTerm, selectedBranchId]);

  const visibleRows = useMemo(
    () => (lowStockOnly ? stockRows.filter(isLowStock) : stockRows),
    [lowStockOnly, stockRows],
  );

  const totalStockValue = visibleRows.reduce(
    (sum, row) => sum + Number(row.on_hand_qty ?? 0) * Number(row.average_cost ?? 0),
    0,
  );
  const lowStockCount = visibleRows.filter(isLowStock).length;
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);

  return (
    <div className="space-y-6 flex flex-col h-full bg-[#f3f4f6]">
      {infoMessage ? (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {infoMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tong san pham trong kho</p>
            <h4 className="text-2xl font-bold text-slate-800">
              {formatNumber(visibleRows.length)} <span className="text-sm font-normal text-slate-500">ma hang</span>
            </h4>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ArrowRightLeft size={24} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLowStockOnly((current) => !current)}
          className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between text-left transition-colors hover:border-red-200 hover:bg-red-50/40"
        >
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Sap het hang</p>
            <h4 className="text-2xl font-bold text-red-600">
              {formatNumber(lowStockCount)} <span className="text-sm font-normal text-slate-500">mat hang can nhap</span>
            </h4>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
        </button>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tong gia tri ton kho</p>
            <h4 className="text-2xl font-bold text-slate-800">
              {formatNumber(totalStockValue)} <span className="text-sm font-normal text-slate-500">d</span>
            </h4>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <ArrowDownToLine size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-slate-100 shrink-0 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tim mat hang kiem kho..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow shadow-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={selectedBranchId}
                onChange={(event) => setSelectedBranchId(event.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Tat ca chi nhanh</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            <button
              type="button"
              onClick={() => setLowStockOnly((current) => !current)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                lowStockOnly
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lowStockOnly ? 'Dang loc sap het hang' : 'Loc sap het hang'}
            </button>
            <button
              type="button"
              onClick={() => setInfoMessage(`Dang xem ton kho ${selectedBranch?.name ?? 'toan he thong'}.`)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Kiem kho
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0088FF]" />
              <p className="text-sm font-medium">Dang tai du lieu ton kho...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white sticky top-0 z-10 backdrop-blur-sm">
                <tr className="text-[11px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="py-3 px-4 font-semibold">Ten san pham</th>
                  <th className="py-3 px-4 font-semibold">Ma SKU</th>
                  <th className="py-3 px-4 font-semibold">Danh muc</th>
                  <th className="py-3 px-4 font-semibold">Nhan hieu</th>
                  <th className="py-3 px-4 font-semibold">Chi nhanh</th>
                  <th className="py-3 px-4 text-right font-semibold">Ton kho hien tai</th>
                  <th className="py-3 px-4 text-center font-semibold">Trang thai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Chua co du lieu ton kho phu hop.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const lowStock = isLowStock(row);

                    return (
                      <tr
                        key={row.id}
                        className={`cursor-pointer hover:bg-slate-50/80 transition-colors ${
                          lowStock ? 'bg-red-50/30 border-red-100' : ''
                        }`}
                        onClick={() =>
                          navigate('/products', {
                            state: {
                              selectedProductId: row.product_id,
                              detailTab: 'stock',
                              message: `Dang mo chi tiet ton kho cua ${row.products?.name ?? 'san pham'}.`,
                            },
                          })
                        }
                      >
                        <td className="py-3 px-4 font-medium text-slate-900">{row.products?.name ?? '---'}</td>
                        <td className="py-3 px-4 text-sm text-slate-500 font-mono">{row.products?.sku ?? '---'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{row.products?.product_categories?.name ?? '---'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{row.products?.brands?.name ?? '---'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{row.branches?.name ?? '---'}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${lowStock ? 'text-red-600' : 'text-slate-800'}`}>
                          {formatNumber(Number(row.on_hand_qty ?? 0))}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {lowStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-700 w-fit">
                              <AlertTriangle size={12} /> Can nhap
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-700 w-fit">
                              Du hang
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
