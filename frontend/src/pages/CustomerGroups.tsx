import React, { useEffect, useMemo, useState } from 'react';
import { Plus, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  customersService,
  type Customer,
  type CustomerGroup,
} from '../services/customersService';
import { PageLoader } from '../components/PageLoader';
import { CustomerGroupTypeModal } from '../components/CustomerGroupTypeModal';
import { ToastBridge } from '../components/Toast';

type GroupRow = CustomerGroup & {
  count: number;
};

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

export function CustomerGroups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [groupList, firstCustomerPage] = await Promise.all([
          customersService.getGroups(),
          customersService.getAll({ page: 1, limit: 200 }),
        ]);

        const pages = [firstCustomerPage];
        if (firstCustomerPage.totalPages > 1) {
          const remaining = await Promise.all(
            Array.from({ length: firstCustomerPage.totalPages - 1 }, (_, index) =>
              customersService.getAll({ page: index + 2, limit: 200 }),
            ),
          );
          pages.push(...remaining);
        }

        if (!active) {
          return;
        }

        setGroups(groupList);
        setCustomers(pages.flatMap((item) => item.data));
      } catch (loadError: any) {
        if (!active) {
          return;
        }
        setError(loadError?.message ?? 'Không tải được nhóm khách hàng.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo<GroupRow[]>(() => {
    const counts = customers.reduce<Record<string, number>>((acc, customer) => {
      if (!customer.customer_group_id) {
        return acc;
      }
      acc[customer.customer_group_id] = (acc[customer.customer_group_id] ?? 0) + 1;
      return acc;
    }, {});

    return [...groups]
      .map((group) => ({
        ...group,
        count: counts[group.id] ?? 0,
      }))
      .sort((left, right) => {
        const compare = left.name.localeCompare(right.name, 'vi');
        return sortOrder === 'asc' ? compare : -compare;
      });
  }, [customers, groups, sortOrder]);

  const totalPages = Math.max(1, Math.ceil((rows.length || 1) / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = pagedRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = pagedRows.length === 0 ? 0 : pageStart + pagedRows.length - 1;

  const handleUpdateGroup = async (group: CustomerGroup) => {
    const name = window.prompt('Tên nhóm khách hàng', group.name);
    if (!name?.trim()) {
      return;
    }

    const code = window.prompt('Mã nhóm', group.code ?? '');
    if (code === null) {
      return;
    }

    const type = window.prompt('Loại nhóm: fixed hoặc dynamic', group.group_type ?? 'fixed');
    if (type === null) {
      return;
    }

    const description = window.prompt('Mô tả', group.description ?? '');
    if (description === null) {
      return;
    }

    try {
      const updated = await customersService.updateGroup(group.id, {
        name: name.trim(),
        code: code.trim() || undefined,
        group_type: type === 'dynamic' ? 'dynamic' : 'fixed',
        description: description.trim() || undefined,
      });

      setGroups((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
    } catch (updateError: any) {
      setError(updateError?.message ?? 'Cập nhật nhóm khách hàng thất bại.');
    }
  };

  const handleDeleteGroup = async (group: GroupRow) => {
    const confirmed = window.confirm(`Xóa nhóm khách hàng ${group.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await customersService.deleteGroup(group.id);
      setGroups((current) => current.filter((item) => item.id !== group.id));
    } catch (deleteError: any) {
      setError(deleteError?.message ?? 'Xóa nhóm khách hàng thất bại.');
    }
  };

  if (isLoading) {
    return <PageLoader text="Đang tải nhóm khách hàng..." fullScreen />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ToastBridge message={error} variant="error" onDone={() => setError(null)} />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="list-primary-button"
        >
          <Plus size={16} /> Thêm nhóm khách hàng
        </button>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                <th
                  onClick={() => setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
                  className="w-1/5 cursor-pointer px-6 py-3.5 hover:text-[#0088FF]"
                >
                  <span className="flex items-center gap-1">
                    Tên nhóm
                    <div className="flex flex-col">
                      <ChevronDown size={10} className={`-mb-1 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                      <ChevronDown size={10} />
                    </div>
                  </span>
                </th>
                <th className="w-1/6 px-6 py-3.5">Mã nhóm</th>
                <th className="w-1/6 px-6 py-3.5">Loại nhóm</th>
                <th className="px-6 py-3.5">Mô tả</th>
                <th className="w-[150px] px-6 py-3.5 text-right">Số lượng khách hàng</th>
                <th className="w-[150px] px-6 py-3.5 text-right">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13.5px] text-[#182537]">
              {pagedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Chưa có nhóm khách hàng.
                  </td>
                </tr>
              ) : (
                pagedRows.map((group) => (
                  <tr key={group.id} className="transition-colors hover:bg-slate-50">
                    <td
                      onClick={() => handleUpdateGroup(group)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        void handleDeleteGroup(group);
                      }}
                      className="cursor-pointer px-6 py-4 text-[#0088FF] hover:underline"
                    >
                      {group.name}
                    </td>
                    <td className="px-6 py-4 uppercase">{group.code}</td>
                    <td className="px-6 py-4">{group.group_type === 'fixed' ? 'Cố định' : 'Động'}</td>
                    <td className="px-6 py-4 text-slate-500">{group.description || ''}</td>
                    <td className="px-6 py-4 text-right">{group.count}</td>
                    <td className="px-6 py-4 text-right">{formatDate(group.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
            Từ {pageStart} đến {pageEnd} trên tổng {rows.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded bg-[#0088FF] font-medium text-white">
              {safePage}
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={safePage === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <CustomerGroupTypeModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSelect={(type) => {
          setIsCreateModalOpen(false);
          navigate(`/customer-groups/create?type=${type}`);
        }}
      />
    </div>
  );
}
