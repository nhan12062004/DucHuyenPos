import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  AlertTriangle,
  ArrowRightLeft,
  ArrowDownToLine,
  CheckCircle,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react';
import {
  inventoryService,
  type Branch,
  type BranchStock,
} from '../services/inventoryService';
import { PageLoader } from '../components/PageLoader';

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
  const [isSavingCheck, setIsSavingCheck] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [checkQuantities, setCheckQuantities] = useState<Record<string, number>>({});
  const [refreshKey, setRefreshKey] = useState(0);
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
        setError(nextError?.message ?? 'KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u tá»“n kho.');
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
  }, [refreshKey, searchTerm, selectedBranchId]);

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

  const openCheckModal = () => {
    if (!selectedBranchId) {
      setInfoMessage('Vui lÃ²ng chá»n má»™t chi nhÃ¡nh cá»¥ thá»ƒ trÆ°á»›c khi kiá»ƒm kho.');
      return;
    }

    const nextQuantities = visibleRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.product_id] = Number(row.on_hand_qty ?? 0);
      return acc;
    }, {});

    setCheckQuantities(nextQuantities);
    setShowCheckModal(true);
  };

  const handleSaveCheck = async () => {
    if (!selectedBranchId) {
      setInfoMessage('Vui lÃ²ng chá»n má»™t chi nhÃ¡nh cá»¥ thá»ƒ trÆ°á»›c khi kiá»ƒm kho.');
      return;
    }

    const items = visibleRows.map((row) => ({
      product_id: row.product_id,
      actual_qty: Number(checkQuantities[row.product_id] ?? row.on_hand_qty ?? 0),
    }));

    if (!items.length) {
      setInfoMessage('KhÃ´ng cÃ³ máº·t hÃ ng nÃ o Ä‘á»ƒ kiá»ƒm kho.');
      return;
    }

    setIsSavingCheck(true);
    setError(null);

    try {
      const result = await inventoryService.createAdjustment({
        branch_id: selectedBranchId,
        note: `Kiem kho ${selectedBranch?.name ?? ''}`.trim(),
        items,
      });

      setShowCheckModal(false);
      setInfoMessage(`ÄÃ£ lÆ°u kiá»ƒm kho ${result.check_code}, Ä‘iá»u chá»‰nh ${result.adjusted_count} máº·t hÃ ng.`);
      setRefreshKey((current) => current + 1);
    } catch (nextError: any) {
      setError(nextError?.message ?? 'KhÃ´ng lÆ°u Ä‘Æ°á»£c phiáº¿u kiá»ƒm kho.');
    } finally {
      setIsSavingCheck(false);
    }
  };

  if (isLoading) {
    return <PageLoader text="Äang táº£i dá»¯ liá»‡u tá»“n kho..." fullScreen />;
  }

  return (
    <div className="flex flex-col gap-4">
      {showCheckModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-10">
          <div className="flex max-h-[90vh] w-full max-w-[920px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-[16px] font-semibold text-[#182537]">Kiá»ƒm kho {selectedBranch?.name ?? ''}</h2>
                <p className="mt-1 text-[13px] text-slate-500">Nháº­p sá»‘ lÆ°á»£ng thá»±c táº¿, há»‡ thá»‘ng sáº½ tá»± Ä‘iá»u chá»‰nh chÃªnh lá»‡ch tá»“n kho.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckModal(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="ÄÃ³ng"
              >
                <X size={22} />
              </button>
            </div>

            <div className="overflow-y-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-[#182537]">
                  <tr>
                    <th className="px-5 py-3">Sáº£n pháº©m</th>
                    <th className="px-3 py-3">SKU</th>
                    <th className="px-3 py-3 text-right">Tá»“n há»‡ thá»‘ng</th>
                    <th className="px-3 py-3 text-right">Thá»±c táº¿</th>
                    <th className="px-5 py-3 text-right">ChÃªnh lá»‡ch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row) => {
                    const systemQty = Number(row.on_hand_qty ?? 0);
                    const actualQty = Number(checkQuantities[row.product_id] ?? systemQty);
                    const diff = actualQty - systemQty;

                    return (
                      <tr key={row.id}>
                        <td className="px-5 py-3 font-medium text-[#182537]">{row.products?.name ?? '---'}</td>
                        <td className="px-3 py-3 font-mono text-slate-500">{row.products?.sku ?? '---'}</td>
                        <td className="px-3 py-3 text-right">{formatNumber(systemQty)}</td>
                        <td className="px-3 py-3 text-right">
                          <input
                            type="number"
                            min={0}
                            value={actualQty}
                            onChange={(event) =>
                              setCheckQuantities((current) => ({
                                ...current,
                                [row.product_id]: Math.max(0, Number(event.target.value)),
                              }))
                            }
                            className="h-8 w-24 border border-slate-300 px-2 text-right outline-none focus:border-[#0088FF]"
                          />
                        </td>
                        <td className={`px-5 py-3 text-right font-semibold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {diff > 0 ? '+' : ''}{formatNumber(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowCheckModal(false)}
                className="h-9 border border-slate-300 bg-white px-5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
              >
                ThoÃ¡t
              </button>
              <button
                type="button"
                onClick={handleSaveCheck}
                disabled={isSavingCheck}
                className="flex h-9 items-center gap-2 bg-[#0088FF] px-5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                {isSavingCheck ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                LÆ°u kiá»ƒm kho
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="ui-card p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tá»•ng sáº£n pháº©m trong kho</p>
            <h4 className="text-2xl font-bold text-slate-800">
              {formatNumber(visibleRows.length)} <span className="text-sm font-normal text-slate-500">mÃ£ hÃ ng</span>
            </h4>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ArrowRightLeft size={24} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLowStockOnly((current) => !current)}
          className="ui-card p-5 flex items-center justify-between text-left transition-colors hover:border-red-200 hover:bg-red-50/40"
        >
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Sáº¯p háº¿t hÃ ng</p>
            <h4 className="text-2xl font-bold text-red-600">
              {formatNumber(lowStockCount)} <span className="text-sm font-normal text-slate-500">máº·t hÃ ng cáº§n nháº­p</span>
            </h4>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
        </button>
        <div className="ui-card p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tá»•ng giÃ¡ trá»‹ tá»“n kho</p>
            <h4 className="text-2xl font-bold text-slate-800">
              {formatNumber(totalStockValue)} <span className="text-sm font-normal text-slate-500">Ä‘</span>
            </h4>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <ArrowDownToLine size={24} />
          </div>
        </div>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 bg-white">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="TÃ¬m máº·t hÃ ng kiá»ƒm kho..."
              className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={selectedBranchId}
                onChange={(event) => setSelectedBranchId(event.target.value)}
                className="appearance-none rounded border border-slate-300 bg-white py-2 pl-3 pr-9 text-[13px] text-slate-700 shadow-sm focus:border-[#0088FF] focus:outline-none focus:ring-1 focus:ring-[#0088FF]"
              >
                <option value="">Táº¥t cáº£ chi nhÃ¡nh</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            </div>
            <button
              type="button"
              onClick={() => setLowStockOnly((current) => !current)}
              className={`rounded px-4 py-2 text-[13px] font-medium transition-colors ${
                lowStockOnly
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {lowStockOnly ? 'Äang lá»c sáº¯p háº¿t hÃ ng' : 'Lá»c sáº¯p háº¿t hÃ ng'}
            </button>
            <button
              type="button"
              onClick={openCheckModal}
              className="rounded bg-[#0088FF] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
            >
              Kiá»ƒm kho
            </button>
          </div>
        </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                  <th className="py-3 px-5 font-semibold">TÃªn sáº£n pháº©m</th>
                  <th className="py-3 px-2 font-semibold">MÃ£ SKU</th>
                  <th className="py-3 px-2 font-semibold">Danh má»¥c</th>
                  <th className="py-3 px-2 font-semibold">NhÃ£n hiá»‡u</th>
                  <th className="py-3 px-2 font-semibold">Chi nhÃ¡nh</th>
                  <th className="py-3 px-2 text-right font-semibold">Tá»“n kho hiá»‡n táº¡i</th>
                  <th className="py-3 px-5 text-center font-semibold">Tráº¡ng thÃ¡i</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px] text-[#182537]">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                      ChÆ°a cÃ³ dá»¯ liá»‡u tá»“n kho phÃ¹ há»£p.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const lowStock = isLowStock(row);

                    return (
                      <tr
                        key={row.id}
                        className={`cursor-pointer hover:bg-slate-50 transition-colors ${
                          lowStock ? 'bg-red-50/30 border-red-100' : ''
                        }`}
                        onClick={() =>
                          navigate('/products', {
                            state: {
                              selectedProductId: row.product_id,
                              detailTab: 'stock',
                              message: `Äang má»Ÿ chi tiáº¿t tá»“n kho cá»§a ${row.products?.name ?? 'sáº£n pháº©m'}.`,
                            },
                          })
                        }
                      >
                        <td className="py-4 px-5 font-medium text-[#182537] hover:text-[#0088FF]">{row.products?.name ?? '---'}</td>
                        <td className="py-4 px-2 text-slate-500 font-mono">{row.products?.sku ?? '---'}</td>
                        <td className="py-4 px-2 text-slate-600">{row.products?.product_categories?.name ?? '---'}</td>
                        <td className="py-4 px-2 text-slate-600">{row.products?.brands?.name ?? '---'}</td>
                        <td className="py-4 px-2 text-slate-600">{row.branches?.name ?? '---'}</td>
                        <td className={`py-4 px-2 text-right font-semibold ${lowStock ? 'text-red-600' : 'text-[#182537]'}`}>
                          {formatNumber(Number(row.on_hand_qty ?? 0))}
                        </td>
                        <td className="py-4 px-5 text-center">
                          {lowStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-red-300 bg-red-50 text-[12px] font-medium text-red-600 w-fit">
                              <AlertTriangle size={12} /> Cáº§n nháº­p
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-[12px] font-medium text-emerald-600 w-fit">
                              Äá»§ hÃ ng
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
      </div>
    </div>
  );
}
