import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronDown, Info, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  customersService,
  type Customer,
  type CustomerGroup,
} from '../services/customersService';
import { staffService, type StaffProfile } from '../services/staffService';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-2 flex items-center gap-1 text-[13px] text-[#415166]">
      <span>{children}</span>
      {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex min-h-[42px] items-center border-b border-slate-200 px-5">
        <h2 className="text-[15px] font-semibold text-[#182537]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SelectChevron() {
  return <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />;
}

const inputClass =
  'h-8 w-full border border-slate-300 bg-white px-3 text-[13px] text-[#182537] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0088FF]';
const selectClass =
  'h-8 w-full appearance-none border border-slate-300 bg-white px-3 pr-8 text-[13px] text-[#182537] outline-none transition-colors focus:border-[#0088FF]';

export function CustomerCreate() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [groupId, setGroupId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [provinceDistrict, setProvinceDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('Khác');
  const [fax, setFax] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [website, setWebsite] = useState('');
  const [debt, setDebt] = useState('');
  const [totalSpent, setTotalSpent] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [promotionMode, setPromotionMode] = useState<'group' | 'customer'>('group');

  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOwner = useMemo(
    () => staff.find((member) => member.id === ownerId) ?? staff[0] ?? null,
    [ownerId, staff],
  );

  useEffect(() => {
    let mounted = true;

    Promise.all([
      customersService.getGroups(),
      staffService.getActive().catch(() => [] as StaffProfile[]),
    ])
      .then(([groupList, staffList]) => {
        if (!mounted) {
          return;
        }
        setGroups(groupList);
        setStaff(staffList);
        if (staffList[0]) {
          setOwnerId(staffList[0].id);
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Không tải được dữ liệu nhóm khách hàng.');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingLookups(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const combinedAddress = [addressLine.trim(), ward.trim(), provinceDistrict.trim()]
    .filter(Boolean)
    .join(', ');

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError('Vui lòng nhập tên khách hàng.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const noteParts = [
        description.trim(),
        selectedOwner ? `Nhân viên phụ trách: ${selectedOwner.full_name}` : '',
        gender ? `Giới tính: ${gender}` : '',
        fax.trim() ? `Số fax: ${fax.trim()}` : '',
        website.trim() ? `Website: ${website.trim()}` : '',
        tags.trim() ? `Tags: ${tags.trim()}` : '',
        debt.trim() ? `Công nợ ban đầu: ${debt.trim()}` : '',
        totalSpent.trim() ? `Tổng chi tiêu: ${totalSpent.trim()}` : '',
        `Áp dụng ưu đãi: ${promotionMode === 'group' ? 'Theo nhóm khách hàng' : 'Theo khách hàng'}`,
      ].filter(Boolean);

      const created = await customersService.create({
        code: code.trim() || undefined,
        customer_group_id: groupId || undefined,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        birthdate: birthdate || undefined,
        tax_code: taxCode.trim() || undefined,
        address: combinedAddress || undefined,
        notes: noteParts.join('\n') || undefined,
        status: 'active',
      } satisfies Partial<Customer>);

      navigate('/customers', {
        state: {
          selectedCustomerId: created.id,
          message: `Đã thêm khách hàng ${created.full_name}.`,
        },
      });
    } catch (saveError: any) {
      setError(saveError?.message ?? 'Thêm khách hàng thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F4F6F8] pb-6 text-[#182537]">
      <div className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 text-[13px] text-slate-500 transition-colors hover:text-[#0088FF]"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách khách hàng
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            disabled={saving}
            className="h-8 border border-[#0088FF] bg-white px-6 text-[13px] font-medium text-[#0088FF] transition-colors hover:bg-blue-50 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-8 min-w-[64px] items-center justify-center bg-[#0088FF] px-6 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Lưu'}
          </button>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1120px] gap-4 px-6 py-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {error ? (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          ) : null}

          <Panel title="Thông tin chung">
            <div>
              <FieldLabel required>Tên khách hàng</FieldLabel>
              <input
                autoFocus
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nhập tên khách hàng"
                className={inputClass}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Mã khách hàng</FieldLabel>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Nhập mã khách hàng"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Nhóm khách hàng</FieldLabel>
                <div className="relative">
                  <select
                    value={groupId}
                    onChange={(event) => setGroupId(event.target.value)}
                    disabled={loadingLookups}
                    className={selectClass}
                  >
                    <option value="">Chọn nhóm khách hàng</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </div>
              </div>
              <div>
                <FieldLabel>Số điện thoại</FieldLabel>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Nhập số điện thoại"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Nhập địa chỉ email"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-4 border border-slate-300">
              <div className="flex h-10 items-center gap-3 border-b border-slate-300 bg-[#F8F9FA] px-3">
                <span className="h-4 w-4 rounded-full bg-slate-500" />
                <span className="text-[13px] text-[#182537]">Địa chỉ mới</span>
                <Info size={13} className="text-slate-400" />
              </div>
              <div className="grid gap-4 p-3 md:grid-cols-2">
                <div>
                  <FieldLabel required>Khu vực</FieldLabel>
                  <div className="relative">
                    <select
                      value={provinceDistrict}
                      onChange={(event) => setProvinceDistrict(event.target.value)}
                      className={selectClass}
                    >
                      <option value="">Chọn Tỉnh/Thành phố - Quận/Huyện</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                    </select>
                    <SelectChevron />
                  </div>
                </div>
                <div>
                  <FieldLabel required>Phường xã</FieldLabel>
                  <div className="relative">
                    <select
                      value={ward}
                      onChange={(event) => setWard(event.target.value)}
                      className={selectClass}
                    >
                      <option value="">Chọn Phường/Xã</option>
                      <option value="Phường trung tâm">Phường trung tâm</option>
                      <option value="Xã lân cận">Xã lân cận</option>
                    </select>
                    <SelectChevron />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <FieldLabel required>Địa chỉ cụ thể</FieldLabel>
                  <input
                    value={addressLine}
                    onChange={(event) => setAddressLine(event.target.value)}
                    placeholder="Nhập số nhà, tên đường, tên khu vực"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Thông tin bổ sung">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Ngày sinh</FieldLabel>
                <div className="relative">
                  <input
                    type="date"
                    value={birthdate}
                    onChange={(event) => setBirthdate(event.target.value)}
                    className={`${inputClass} pr-9 text-slate-500`}
                  />
                  <CalendarDays size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div>
                <FieldLabel>Giới tính</FieldLabel>
                <div className="relative">
                  <select value={gender} onChange={(event) => setGender(event.target.value)} className={selectClass}>
                    <option value="Khác">Khác</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                  <SelectChevron />
                </div>
              </div>
              <div>
                <FieldLabel>Số fax</FieldLabel>
                <input
                  value={fax}
                  onChange={(event) => setFax(event.target.value)}
                  placeholder="Nhập số fax"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Mã số thuế</FieldLabel>
                <input
                  value={taxCode}
                  onChange={(event) => setTaxCode(event.target.value)}
                  placeholder="Nhập mã số thuế"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Website</FieldLabel>
                <input
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="Nhập tên miền website"
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Công nợ</FieldLabel>
                <input
                  value={debt}
                  onChange={(event) => setDebt(event.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Nhập công nợ khách hàng"
                  className={`${inputClass} text-right`}
                />
              </div>
              <div>
                <FieldLabel>Tổng chi tiêu</FieldLabel>
                <input
                  value={totalSpent}
                  onChange={(event) => setTotalSpent(event.target.value.replace(/[^\d]/g, ''))}
                  placeholder="Nhập tổng chi tiêu khách hàng"
                  className={`${inputClass} text-right`}
                />
              </div>
            </div>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Thông tin khác">
            <div className="space-y-4">
              <div>
                <FieldLabel>Nhân viên phụ trách</FieldLabel>
                <div className="relative">
                  <select
                    value={ownerId}
                    onChange={(event) => setOwnerId(event.target.value)}
                    disabled={loadingLookups || staff.length === 0}
                    className={selectClass}
                  >
                    {staff.length === 0 ? <option value="">Chưa có nhân viên</option> : null}
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                  <SelectChevron />
                </div>
              </div>

              <div>
                <FieldLabel>Mô tả</FieldLabel>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Nhập mô tả"
                  rows={3}
                  className="w-full resize-none border border-slate-300 px-3 py-2 text-[13px] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0088FF]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-1 text-[13px] text-[#415166]">
                  <span>Tags</span>
                  <Info size={13} className="text-[#0088FF]" />
                </div>
                <textarea
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  rows={3}
                  className="w-full resize-none border border-slate-300 px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#0088FF]"
                />
              </div>
            </div>
          </Panel>

          <Panel title="Cài đặt nâng cao">
            <div className="text-[13px] font-semibold text-[#182537]">Áp dụng ưu đãi</div>
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-2 text-[13px] text-[#182537]">
                <input
                  type="radio"
                  checked={promotionMode === 'group'}
                  onChange={() => setPromotionMode('group')}
                  className="h-4 w-4 accent-[#0088FF]"
                />
                Theo nhóm khách hàng
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[#182537]">
                <input
                  type="radio"
                  checked={promotionMode === 'customer'}
                  onChange={() => setPromotionMode('customer')}
                  className="h-4 w-4 accent-[#0088FF]"
                />
                Theo khách hàng
              </label>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
