import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronDown, Info, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  customersService,
  findDefaultRetailCustomerGroup,
  type Customer,
  type CustomerGroup,
} from '../services/customersService';
import { useAuth } from '../context/AuthContext';
import { staffService, type StaffProfile } from '../services/staffService';
import { ToastBridge } from '../components/Toast';

interface VNProvince {
  code: number;
  name: string;
  districts?: VNDistrict[];
}

interface VNDistrict {
  code: number;
  name: string;
}

interface VNWard {
  code: number;
  name: string;
}

type AreaOption = {
  code: number;
  provinceName: string;
  districtName: string;
  label: string;
};

type DropdownOption = {
  value: string;
  label: string;
};

const VN_API = 'https://provinces.open-api.vn/api';

async function fetchProvinceDistricts(): Promise<VNProvince[]> {
  const response = await fetch(`${VN_API}/?depth=2`);
  if (!response.ok) {
    throw new Error('Không tải được dữ liệu địa chỉ.');
  }
  return response.json();
}

async function fetchWards(districtCode: number): Promise<VNWard[]> {
  const response = await fetch(`${VN_API}/d/${districtCode}?depth=2`);
  if (!response.ok) {
    throw new Error('Không tải được dữ liệu phường/xã.');
  }
  const data = await response.json();
  return data.wards ?? [];
}

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

function DropdownSelect({
  value,
  options,
  placeholder,
  disabled,
  loading,
  searchable = true,
  onChange,
}: {
  value: string;
  options: DropdownOption[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? '';
  const filteredOptions = query.trim()
    ? options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`${selectClass} flex items-center justify-between text-left disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
      >
        <span className={`truncate ${selectedLabel ? 'text-[#182537]' : 'text-slate-400'}`}>
          {selectedLabel || (loading ? 'Đang tải...' : placeholder)}
        </span>
        <ChevronDown size={14} className="ml-2 shrink-0 text-slate-400" />
      </button>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-[34px] z-50 border border-slate-300 bg-white shadow-lg">
          {searchable ? (
            <div className="border-b border-slate-100 p-2">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm nhanh"
                className="h-8 w-full border border-slate-300 px-2 text-[13px] outline-none focus:border-[#0088FF]"
              />
            </div>
          ) : null}
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-[13px] transition-colors hover:bg-blue-50 hover:text-[#0088FF] ${
                    option.value === value ? 'bg-blue-50 text-[#0088FF]' : 'text-[#182537]'
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-[13px] text-slate-500">Không có dữ liệu phù hợp</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClass =
  'h-8 w-full border border-slate-300 bg-white px-3 text-[13px] text-[#182537] outline-none transition-colors placeholder:text-slate-400 focus:border-[#0088FF]';
const selectClass =
  'h-8 w-full appearance-none border border-slate-300 bg-white px-3 pr-8 text-[13px] text-[#182537] outline-none transition-colors focus:border-[#0088FF]';

export function CustomerCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const birthdateInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [groupId, setGroupId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [wardCode, setWardCode] = useState('');
  const [wardName, setWardName] = useState('');
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
  const [provinces, setProvinces] = useState<VNProvince[]>([]);
  const [wards, setWards] = useState<VNWard[]>([]);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUserName = user?.user_metadata?.full_name || user?.email || 'Người dùng';
  const selectedOwner = staff.find((member) => member.id === ownerId);
  const ownerName = selectedOwner?.full_name || currentUserName;

  const areaOptions = useMemo(
    () =>
      provinces.flatMap((province) =>
        (province.districts ?? []).map((district) => ({
          code: district.code,
          provinceName: province.name,
          districtName: district.name,
          label: `${province.name} - ${district.name}`,
        })),
      ),
    [provinces],
  );

  const staffOptions = useMemo(
    () => {
      const options = staff.map((member) => ({
        value: member.id,
        label: member.full_name,
      }));

      if (options.length || !user?.id) {
        return options;
      }

      return [{ value: user.id, label: currentUserName }];
    },
    [currentUserName, staff, user?.id],
  );

  const areaDropdownOptions = useMemo(
    () => areaOptions.map((area) => ({ value: String(area.code), label: area.label })),
    [areaOptions],
  );

  const wardDropdownOptions = useMemo(
    () => wards.map((ward) => ({ value: String(ward.code), label: ward.name })),
    [wards],
  );

  useEffect(() => {
    let mounted = true;

    Promise.all([
      customersService.getGroups(),
      fetchProvinceDistricts(),
      staffService.getAllUsers().catch(() => [] as StaffProfile[]),
    ])
      .then(([groupList, provinceList, staffList]) => {
        if (!mounted) {
          return;
        }
        setGroups(groupList);
        setGroupId((current) => current || findDefaultRetailCustomerGroup(groupList)?.id || '');
        setProvinces(provinceList);
        setStaff(staffList);

        const matchedCurrentUser =
          staffList.find((member) => member.id === user?.id) ??
          staffList.find((member) => member.full_name === currentUserName) ??
          staffList[0];

        if (matchedCurrentUser) {
          setOwnerId(matchedCurrentUser.id);
        } else if (user?.id) {
          setOwnerId(user.id);
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Không tải được dữ liệu nhóm khách hàng, địa chỉ hoặc nhân viên.');
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
  }, [currentUserName, user?.id]);

  const combinedAddress = [addressLine.trim(), wardName, districtName, provinceName]
    .filter(Boolean)
    .join(', ');

  const handleAreaChange = (nextAreaCode: string) => {
    setAreaCode(nextAreaCode);
    setWardCode('');
    setWardName('');
    setWards([]);

    const selectedArea = areaOptions.find((area) => String(area.code) === nextAreaCode);
    setProvinceName(selectedArea?.provinceName ?? '');
    setDistrictName(selectedArea?.districtName ?? '');

    if (!selectedArea) {
      return;
    }

    setLoadingWards(true);
    fetchWards(selectedArea.code)
      .then(setWards)
      .catch(() => setError('Không tải được dữ liệu phường/xã.'))
      .finally(() => setLoadingWards(false));
  };

  const handleWardChange = (nextWardCode: string) => {
    setWardCode(nextWardCode);
    setWardName(wards.find((ward) => String(ward.code) === nextWardCode)?.name ?? '');
  };

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
        ownerName ? `Nhân viên phụ trách: ${ownerName}` : '',
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
      <ToastBridge message={error} variant="error" onDone={() => setError(null)} />

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
                  <DropdownSelect
                    value={areaCode}
                    options={areaDropdownOptions}
                    placeholder="Chọn Tỉnh/Thành phố - Quận/Huyện"
                    loading={loadingLookups}
                    disabled={loadingLookups}
                    onChange={handleAreaChange}
                  />
                </div>
                <div>
                  <FieldLabel required>Phường xã</FieldLabel>
                  <DropdownSelect
                    value={wardCode}
                    options={wardDropdownOptions}
                    placeholder="Chọn Phường/Xã"
                    loading={loadingWards}
                    disabled={!areaCode || loadingWards}
                    onChange={handleWardChange}
                  />
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
                    ref={birthdateInputRef}
                    type="date"
                    value={birthdate}
                    onChange={(event) => setBirthdate(event.target.value)}
                    className={`${inputClass} pr-9 text-slate-500 [&::-webkit-calendar-picker-indicator]:opacity-0`}
                  />
                  <button
                    type="button"
                    onClick={() => birthdateInputRef.current?.showPicker?.()}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-400 transition-colors hover:text-[#0088FF]"
                    aria-label="Chọn ngày sinh"
                  >
                    <CalendarDays size={15} />
                  </button>
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
                <DropdownSelect
                  value={ownerId}
                  options={staffOptions}
                  placeholder="Chọn nhân viên phụ trách"
                  loading={loadingLookups}
                  disabled={loadingLookups || staffOptions.length === 0}
                  searchable={false}
                  onChange={setOwnerId}
                />
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
