import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Info,
  Search,
  ShoppingCart,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customersService } from '../services/customersService';

type GroupType = 'fixed' | 'dynamic';
type ConditionId = 'profile' | 'purchase' | 'points';

const conditionTiles: Array<{
  id: ConditionId;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 'profile', title: 'Thông tin cá nhân', icon: UsersRound },
  { id: 'purchase', title: 'Thông tin mua hàng', icon: ShoppingCart },
  { id: 'points', title: 'Thông tin tích điểm', icon: Sparkles },
];

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 block text-[13px] text-slate-600">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-200 px-5 py-3.5">
        <h3 className="text-[15px] font-semibold text-[#182537]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function CustomerGroupCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const groupType: GroupType = searchParams.get('type') === 'dynamic' ? 'dynamic' : 'fixed';
  const isFixedGroup = groupType === 'fixed';

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchMode, setMatchMode] = useState<'any' | 'all'>('any');
  const [selectedCondition, setSelectedCondition] = useState<ConditionId>('profile');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [discountRate, setDiscountRate] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhóm khách hàng.');
      return;
    }

    const parsedDiscountRate = Number(discountRate || 0);
    if (!Number.isFinite(parsedDiscountRate) || parsedDiscountRate < 0 || parsedDiscountRate > 100) {
      setError('Chiết khấu phải nằm trong khoảng từ 0 đến 100.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await customersService.createGroup({
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        group_type: groupType,
        condition_match_mode: isFixedGroup ? matchMode : undefined,
        condition_group: isFixedGroup ? selectedCondition : undefined,
        default_price_type: !isFixedGroup && defaultPrice ? (defaultPrice as 'retail' | 'wholesale') : undefined,
        discount_rate: !isFixedGroup ? parsedDiscountRate : undefined,
        payment_method: !isFixedGroup && paymentMethod ? (paymentMethod as 'cash' | 'bank_transfer' | 'debt') : undefined,
      });
      navigate('/customer-groups');
    } catch (saveError: any) {
      setError(saveError?.message ?? 'Thêm nhóm khách hàng thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F5F6F8]">
      <div className="sticky top-0 z-20 flex h-[56px] items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/customer-groups')}
          className="flex items-center gap-2 text-[13px] text-slate-600 transition-colors hover:text-[#0088FF]"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách nhóm khách hàng
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/customer-groups')}
            className="h-8 rounded border border-[#0088FF] px-5 text-[13px] font-medium text-[#0088FF] transition-colors hover:bg-[#0088FF]/5"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-8 rounded bg-[#0088FF] px-5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {error ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {isFixedGroup ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(520px,1fr)_minmax(480px,1fr)]">
            <div className="flex flex-col gap-4">
              <Panel title="Thông tin chung">
                <div className="px-5 py-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel required>Tên nhóm</FieldLabel>
                      <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Nhập tên nhóm khách hàng"
                        className="h-8 w-full rounded border border-slate-300 px-3 text-[13px] text-[#182537] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0088FF]"
                      />
                    </div>

                    <div>
                      <FieldLabel>Mã nhóm</FieldLabel>
                      <input
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder="Nhập mã nhóm khách hàng"
                        className="h-8 w-full rounded border border-slate-300 px-3 text-[13px] text-[#182537] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0088FF]"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center gap-1 text-[13px] text-slate-600">
                      <span>Mô tả</span>
                      <Info size={13} className="text-[#0088FF]" />
                    </div>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      rows={4}
                      className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-[13px] text-[#182537] outline-none transition-colors focus:border-[#0088FF]"
                    />
                  </div>
                </div>
              </Panel>

              <Panel title="Điều kiện" className="min-h-[318px]">
                <div className="px-5 py-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[13px] text-[#182537]">
                      <input
                        type="radio"
                        checked={matchMode === 'any'}
                        onChange={() => setMatchMode('any')}
                        className="h-4 w-4 accent-[#0088FF]"
                      />
                      Thỏa mãn một trong các điều kiện
                    </label>
                    <label className="flex items-center gap-2 text-[13px] text-[#182537]">
                      <input
                        type="radio"
                        checked={matchMode === 'all'}
                        onChange={() => setMatchMode('all')}
                        className="h-4 w-4 accent-[#0088FF]"
                      />
                      Thỏa mãn tất cả điều kiện
                    </label>
                  </div>

                  <div className="mt-4 text-[13px] font-medium text-[#182537]">Chọn nhóm điều kiện</div>
                  <div className="mt-4 grid gap-5 md:grid-cols-3">
                    {conditionTiles.map((tile) => {
                      const Icon = tile.icon;
                      const active = selectedCondition === tile.id;

                      return (
                        <button
                          key={tile.id}
                          type="button"
                          onClick={() => setSelectedCondition(tile.id)}
                          className={`flex h-[94px] flex-col items-center justify-center gap-3 rounded text-center transition-colors ${
                            active
                              ? 'bg-[#F0FBFF] ring-1 ring-[#0088FF]/25'
                              : 'bg-[#F3FCFC] hover:bg-[#ECFAFF]'
                          }`}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1890FF]">
                            <Icon size={18} className="text-white" />
                          </span>
                          <span className="text-[13px] text-[#182537]">{tile.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Panel>
            </div>

            <Panel title="Danh sách khách hàng thỏa mãn điều kiện" className="min-h-[552px]">
              <div className="flex min-h-[500px] flex-col items-center justify-center px-6 py-8 text-center">
                <Search size={34} className="mb-5 text-slate-300" />
                <div className="text-[15px] font-semibold text-[#182537]">Chưa có khách hàng nào trong nhóm</div>
                <div className="mt-2 text-[13px] text-slate-500">
                  Chọn điều kiện để xem khách hàng phù hợp
                </div>
              </div>
            </Panel>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Thông tin chung" className="min-h-[278px]">
              <div className="grid gap-4 px-5 py-4">
                <div>
                  <FieldLabel required>Tên nhóm</FieldLabel>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nhập tên nhóm khách hàng"
                    className="h-8 w-full rounded border border-slate-300 px-3 text-[13px] text-[#182537] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0088FF]"
                  />
                </div>

                <div>
                  <FieldLabel>Mã nhóm</FieldLabel>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Nhập mã nhóm khách hàng"
                    className="h-8 w-full rounded border border-slate-300 px-3 text-[13px] text-[#182537] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0088FF]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-1 text-[13px] text-slate-600">
                    <span>Mô tả</span>
                    <Info size={13} className="text-[#0088FF]" />
                  </div>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-[13px] text-[#182537] outline-none transition-colors focus:border-[#0088FF]"
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Cài đặt nâng cao" className="min-h-[278px]">
              <div className="grid gap-4 px-5 py-4">
                <div>
                  <div className="mb-2 flex items-center gap-1 text-[13px] text-slate-600">
                    <span>Giá mặc định</span>
                    <Info size={13} className="text-[#0088FF]" />
                  </div>
                  <div className="relative">
                    <select
                      value={defaultPrice}
                      onChange={(event) => setDefaultPrice(event.target.value)}
                      className="h-8 w-full appearance-none rounded border border-slate-300 bg-white px-3 pr-9 text-[13px] text-[#182537] outline-none transition-colors focus:border-[#0088FF]"
                    >
                      <option value="">Chọn giá mặc định</option>
                      <option value="retail">Giá bán lẻ</option>
                      <option value="wholesale">Giá bán buôn</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Chiết khấu (%)</FieldLabel>
                  <input
                    type="number"
                    value={discountRate}
                    onChange={(event) => setDiscountRate(event.target.value)}
                    className="h-8 w-full rounded border border-slate-300 px-3 text-right text-[13px] text-[#182537] outline-none transition-colors focus:border-[#0088FF]"
                  />
                </div>

                <div>
                  <FieldLabel>Hình thức thanh toán</FieldLabel>
                  <div className="relative">
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                      className="h-8 w-full appearance-none rounded border border-slate-300 bg-white px-3 pr-9 text-[13px] text-[#182537] outline-none transition-colors focus:border-[#0088FF]"
                    >
                      <option value="">Chọn hình thức thanh toán</option>
                      <option value="cash">Tiền mặt</option>
                      <option value="bank_transfer">Chuyển khoản</option>
                      <option value="debt">Công nợ</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
