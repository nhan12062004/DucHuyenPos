import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Box,
  Calendar,
  CheckCircle,
  ChevronDown,
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
  findDefaultRetailCustomerGroup,
  type Customer,
  type CustomerDebtSummary,
  type CustomerGroup,
} from '../services/customersService';
import { PageLoader } from '../components/PageLoader';
import { inventoryService, type Branch } from '../services/inventoryService';
import {
  productsService,
  type Product,
  type ProductStockSummary,
} from '../services/productsService';
import { salesOrdersService, type SalesOrder } from '../services/salesOrdersService';
import { staffService, type StaffProfile } from '../services/staffService';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { getDeliveryStatusFromTab, parseLegacyDeliveryTab } from '../utils/delivery';
import { AddProductModal } from '../components/AddProductModal';

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
  return Math.round(value).toLocaleString('en-US');
}

function parseNumber(value: string) {
  const normalizedValue = value.replace(/,/g, '').trim();
  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

function MoneyInput({
  value,
  onChange,
  className,
  onFocus,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  onFocus?: () => void;
}) {
  const [draftValue, setDraftValue] = useState(formatNumber(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraftValue(formatNumber(value));
    }
  }, [isFocused, value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draftValue}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.();
        if (value === 0) {
          setDraftValue('');
          return;
        }
        event.currentTarget.select();
      }}
      onChange={(event) => {
        const nextDraft = event.target.value.replace(/[^\d,]/g, '');
        const nextValue = Math.max(0, parseNumber(nextDraft));
        setDraftValue(nextDraft ? formatNumber(nextValue) : '');
        onChange(nextValue);
      }}
      onBlur={() => {
        setIsFocused(false);
        setDraftValue(formatNumber(parseNumber(draftValue)));
      }}
      className={className}
    />
  );
}

function toDateInputValue(value?: string | null) {
  if (!value) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toIsoDateTimeValue(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
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

// ─── Vietnam Address API ──────────────────────────────────────────────────────

interface VNProvince { code: number; name: string; }
interface VNDistrict { code: number; name: string; }
interface VNWard     { code: number; name: string; }

const VN_API = 'https://provinces.open-api.vn/api';

async function vnFetchProvinces(): Promise<VNProvince[]> {
  const res = await fetch(`${VN_API}/p/`);
  return res.json();
}
async function vnFetchDistricts(provinceCode: number): Promise<VNDistrict[]> {
  const res = await fetch(`${VN_API}/p/${provinceCode}?depth=2`);
  const data = await res.json();
  return data.districts ?? [];
}
async function vnFetchWards(districtCode: number): Promise<VNWard[]> {
  const res = await fetch(`${VN_API}/d/${districtCode}?depth=2`);
  const data = await res.json();
  return data.wards ?? [];
}
// ─── AddressSelect: custom searchable dropdown ───────────────────────────────

interface AddressOption { code: number; name: string; }

interface AddressSelectProps {
  options: AddressOption[];
  value: string;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (code: string, name: string) => void;
}

function AddressSelect({ options, value, placeholder, disabled, loading, onChange }: AddressSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => String(o.code) === value)?.name ?? '';

  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-left text-[13px] text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
      >
        <span className={selectedLabel ? 'text-slate-800' : 'text-slate-400'}>
          {loading ? 'Đang tải...' : selectedLabel || placeholder}
        </span>
        {loading
          ? <Loader2 size={14} className="shrink-0 animate-spin text-slate-400" />
          : <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        }
      </button>

      {open && !loading && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
          {/* Search input */}
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full rounded border border-slate-200 py-1.5 pl-7 pr-3 text-[12px] focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
          {/* Options list */}
          <ul className="max-h-48 overflow-y-auto">
            <li>
              <button
                type="button"
                onClick={() => { onChange('', ''); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-[13px] text-slate-400 hover:bg-slate-50"
              >
                {placeholder}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-[12px] text-slate-400">Không tìm thấy</li>
            ) : (
              filtered.map((o) => (
                <li key={o.code}>
                  <button
                    type="button"
                    onClick={() => { onChange(String(o.code), o.name); setOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-[13px] hover:bg-blue-50 ${String(o.code) === value ? 'bg-blue-50 font-medium text-blue-600' : 'text-slate-700'}`}
                  >
                    {o.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── AddCustomerModal ────────────────────────────────────────────────────────

interface AddCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

function AddCustomerModal({ open, onClose, onCreated }: AddCustomerModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Basic fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Vietnam Address API state
  const [provinces, setProvinces]       = useState<VNProvince[]>([]);
  const [districts, setDistricts]       = useState<VNDistrict[]>([]);
  const [wards, setWards]               = useState<VNWard[]>([]);
  const [provinceCode, setProvinceCode] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [wardCode, setWardCode]         = useState('');
  const [wardName, setWardName]         = useState('');
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards]         = useState(false);
  const [addressLine, setAddressLine]   = useState('');

  // Extra fields
  const [customerCode, setCustomerCode] = useState('');
  const [assignee, setAssignee] = useState('');
  const [showExtra, setShowExtra] = useState(false);
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('other');
  const [email, setEmail] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [customerGroup, setCustomerGroup] = useState('');
  const [website, setWebsite] = useState('');
  const [customerTags, setCustomerTags] = useState('');
  // Groups
  const [customerGroupsList, setCustomerGroupsList] = useState<CustomerGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  // Staff
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  // Saving
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch provinces and groups on first open
  useEffect(() => {
    if (!open) return;
    
    if (provinces.length === 0) {
      setLoadingProvinces(true);
      vnFetchProvinces()
        .then(setProvinces)
        .catch(() => {})
        .finally(() => setLoadingProvinces(false));
    }

    if (customerGroupsList.length === 0) {
      setLoadingGroups(true);
      customersService.getGroups()
        .then((groups) => {
          setCustomerGroupsList(groups);
          setCustomerGroup((current) => current || findDefaultRetailCustomerGroup(groups)?.id || '');
        })
        .catch(() => {})
        .finally(() => setLoadingGroups(false));
    } else {
      setCustomerGroup((current) => current || findDefaultRetailCustomerGroup(customerGroupsList)?.id || '');
    }
  }, [open]);

  // Fetch staff on first open → auto-select current user
  useEffect(() => {
    if (!open || !user) return;

    // Luôn tạo fallback từ session data (không cần profiles table)
    const currentUserFallback: StaffProfile = {
      id: user.id,
      full_name:
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split('@')[0] ||
        'Tôi',
      role: 'staff',
      is_active: true,
    };

    if (staffList.length === 0) {
      setLoadingStaff(true);
      staffService.getActive()
        .then((list) => {
          // Nếu user hiện tại chưa có trong list, thêm vào đầu
          const hasCurrentUser = list.some((s) => s.id === user.id);
          const finalList = hasCurrentUser ? list : [currentUserFallback, ...list];
          setStaffList(finalList);
          setAssignee(user.id);
        })
        .catch(() => {
          // API lỗi → dùng fallback chỉ có user hiện tại
          setStaffList([currentUserFallback]);
          setAssignee(user.id);
        })
        .finally(() => setLoadingStaff(false));
    } else if (!assignee) {
      // Đã có list, chỉ set mặc định nếu chưa chọn
      setAssignee(user.id);
    }
  }, [open]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setFullName(''); setPhone('');
      setProvinceCode(''); setProvinceName('');
      setDistrictCode(''); setDistrictName('');
      setWardCode(''); setWardName('');
      setDistricts([]); setWards([]);
      setAddressLine('');
      setCustomerCode(''); setAssignee('');
      setShowExtra(false); setBirthdate('');
      setGender('other'); setEmail('');
      setTaxCode(''); setCustomerGroup('');
      setWebsite(''); setCustomerTags('');
      setFormError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleProvinceChange = async (code: string, name: string) => {
    setProvinceCode(code); setProvinceName(name);
    setDistrictCode(''); setDistrictName('');
    setWardCode(''); setWardName('');
    setDistricts([]); setWards([]);
    if (!code) return;
    setLoadingDistricts(true);
    try { setDistricts(await vnFetchDistricts(Number(code))); } catch {}
    finally { setLoadingDistricts(false); }
  };

  const handleDistrictChange = async (code: string, name: string) => {
    setDistrictCode(code); setDistrictName(name);
    setWardCode(''); setWardName('');
    setWards([]);
    if (!code) return;
    setLoadingWards(true);
    try { setWards(await vnFetchWards(Number(code))); } catch {}
    finally { setLoadingWards(false); }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setFormError('Vui lòng nhập tên khách hàng.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const addrParts = [addressLine.trim(), wardName, districtName, provinceName].filter(Boolean);
      
      let extraNotes = customerTags.trim() ? `Nhãn: ${customerTags.trim()}` : '';
      if (gender !== 'other') extraNotes += (extraNotes ? ' | ' : '') + `Giới tính: ${gender === 'male' ? 'Nam' : 'Nữ'}`;
      if (website.trim()) extraNotes += (extraNotes ? ' | ' : '') + `Website: ${website.trim()}`;

      const dto: Partial<Customer> = {
        full_name: fullName.trim(),
        phone:     phone.trim() || undefined,
        address:   addrParts.join(', ') || undefined,
        email:     email.trim() || undefined,
        birthdate: birthdate.trim() || undefined,
        tax_code:  taxCode.trim() || undefined,
        notes:     extraNotes || undefined,
        customer_group_id: customerGroup || undefined,
      };
      
      if (customerCode.trim()) dto.code = customerCode.trim();
      const created = await customersService.create(dto);
      onCreated(created);
    } catch (err: any) {
      setFormError(err?.message ?? 'Tạo khách hàng thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded border border-slate-300 px-3 py-2 text-[13px] text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const selectCls =
    'w-full rounded border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none';
  const labelCls = 'mb-1 block text-[13px] font-medium text-slate-700';

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-slate-800">Thêm mới khách hàng</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {formError && (
            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-600">
              {formError}
            </div>
          )}

          {/* Row 1: Name + Phone */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Tên khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder=""
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Số điện thoại</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder=""
                className={inputCls}
              />
            </div>
          </div>

          {/* Address section */}
          <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-400">
                <div className="h-2.5 w-2.5 rounded-full bg-white" />
              </div>
              <span className="text-[13px] font-medium text-slate-700">Địa chỉ mới</span>
              <Info size={14} className="text-slate-400" />
            </div>

            {/* Tỉnh / Quận */}
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Tỉnh / Thành phố</label>
                <AddressSelect
                  options={provinces}
                  value={provinceCode}
                  placeholder="Chọn Tỉnh/Thành phố"
                  loading={loadingProvinces}
                  onChange={handleProvinceChange}
                />
              </div>
              <div>
                <label className={labelCls}>Quận / Huyện</label>
                <AddressSelect
                  options={districts}
                  value={districtCode}
                  placeholder="Chọn Quận/Huyện"
                  disabled={!provinceCode}
                  loading={loadingDistricts}
                  onChange={handleDistrictChange}
                />
              </div>
            </div>

            {/* Phường / Xã */}
            <div className="mb-3">
              <label className={labelCls}>Phường / Xã</label>
              <AddressSelect
                options={wards}
                value={wardCode}
                placeholder="Chọn Phường/Xã"
                disabled={!districtCode}
                loading={loadingWards}
                onChange={(code, name) => { setWardCode(code); setWardName(name); }}
              />
            </div>

            {/* Địa chỉ cụ thể */}
            <div>
              <label className={labelCls}>
                Địa chỉ cụ thể <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Nhập số nhà, tên đường, tên khu vực"
                className={inputCls}
              />
            </div>

            {/* Preview full address */}
            {(addressLine || wardName || districtName || provinceName) && (
              <p className="mt-2 text-[12px] text-slate-500">
                📍{' '}
                {[addressLine, wardName, districtName, provinceName]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
          </div>

          {/* Row: Customer code + Assignee */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Mã khách hàng</label>
              <input
                type="text"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="Mã mặc định"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Nhân viên phụ trách</label>
              <div className="relative">
                <select
                  value={assignee}
                  disabled={loadingStaff}
                  onChange={(e) => setAssignee(e.target.value)}
                  className={selectCls}
                >
                  <option value="">
                    {loadingStaff ? 'Đang tải...' : '-- Chọn nhân viên --'}
                  </option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                      {s.role === 'owner' ? ' (Chủ)' : s.role === 'manager' ? ' (Quản lý)' : ''}
                    </option>
                  ))}
                </select>
                {loadingStaff
                  ? <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                  : <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                }
              </div>
            </div>
          </div>

          {/* Toggle extra info */}
          <button
            type="button"
            onClick={() => setShowExtra((v) => !v)}
            className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:text-blue-700"
          >
            <PlusCircle size={15} />
            Thông tin thêm
          </button>

          {/* Extra fields */}
          {showExtra && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Ngày sinh</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Giới tính</label>
                  <div className="relative">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className={selectCls}
                    >
                      <option value="other">Khác</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="abc@gmail.com"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Mã số thuế</label>
                  <input
                    type="text"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    placeholder=""
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nhóm khách hàng</label>
                  <div className="relative">
                    <select
                      value={customerGroup}
                      disabled={loadingGroups}
                      onChange={(e) => setCustomerGroup(e.target.value)}
                      className={selectCls}
                    >
                      <option value="">
                        {loadingGroups ? 'Đang tải...' : 'Chọn nhóm khách hàng'}
                      </option>
                      {customerGroupsList.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    {loadingGroups ? (
                      <Loader2 size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                    ) : (
                      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Nhập website"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-[13px] font-medium text-slate-700">
                  Tags <Info size={13} className="text-blue-400" />
                </label>
                <textarea
                  rows={3}
                  value={customerTags}
                  onChange={(e) => setCustomerTags(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-[13px] text-slate-800 placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Thoát
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              Thêm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── POS ─────────────────────────────────────────────────────────────────────

export function POS() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const routeState = location.state as { orderId?: string } | null;
  const editingOrderIdFromRoute = routeState?.orderId ?? '';

  const [activeDeliveryTab, setActiveDeliveryTab] = useState<DeliveryTab>('hang_van_chuyen');
  const [issueInvoice, setIssueInvoice] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCustomerDetailsExpanded, setIsCustomerDetailsExpanded] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);
  
  // Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [cartProducts, setCartProducts] = useState<CartProduct[]>([]);
  const [activeCartProductId, setActiveCartProductId] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [branchId, setBranchId] = useState('');
  const [cashierId, setCashierId] = useState('');
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
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasHydratedRouteOrder, setHasHydratedRouteOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (productSearchRef.current && !productSearchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      setLoadingStaff(true);

      try {
        const [branchList, customerList, debtList, productList, stockList, activeStaff] = await Promise.all([
          inventoryService.getBranches(),
          customersService.getAll({ page: 1, limit: 100, status: 'active' }),
          customersService.getDebtSummary(),
          productsService.getAll({ page: 1, limit: 100, status: 'active' }),
          productsService.getStockSummary(),
          staffService.getActive().catch(() => [] as StaffProfile[]),
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
        const currentUserFallback = user
          ? {
              id: user.id,
              full_name:
                (user.user_metadata?.full_name as string | undefined) ||
                user.email?.split('@')[0] ||
                'Tôi',
              role: 'staff' as const,
              is_active: true,
            }
          : null;
        const hasCurrentUser = currentUserFallback
          ? activeStaff.some((staff) => staff.id === currentUserFallback.id)
          : false;
        const finalStaffList =
          currentUserFallback && !hasCurrentUser ? [currentUserFallback, ...activeStaff] : activeStaff;

        setBranches(branchList);
        setStaffList(finalStaffList);
        setBranchId((current) => current || defaultBranch?.id || '');
        setCashierId((current) => current || currentUserFallback?.id || finalStaffList[0]?.id || '');
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
          setLoadingStaff(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [user]);

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
        setCashierId(order.cashier_id ?? user?.id ?? '');
        setSource(order.source);
        setOrderNo(order.order_no);
        const parsedNote = parseOrderNote(order.note);
        setOrderNote(parsedNote.note);
        setTags(parsedNote.tags);
        setDeliveryDue(toDateInputValue(order.delivery_due_at ?? parsedNote.deliveryDue));
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
        setActiveCartProductId(order.sales_order_items?.[0]?.product_id ?? '');
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
  }, [editingOrderIdFromRoute, hasHydratedRouteOrder, loading, user]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

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
      return true;
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
    setActiveCartProductId(product.id);
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
    setActiveCartProductId(productId);
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
      const deliveryDueAt = toIsoDateTimeValue(deliveryDue);
      const noteParts = [
        orderNote.trim(),
        tags.trim() ? `Tags: ${tags.trim()}` : '',
        deliveryDue.trim() ? `Hẹn giao: ${deliveryDue.trim()}` : '',
        issueInvoice ? 'Phát hành hóa đơn điện tử' : '',
      ].filter(Boolean);

      const payload = {
        branch_id: branchId,
        customer_id: customerId || undefined,
        cashier_id: cashierId || null,
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
        delivery_due_at: deliveryDueAt ?? null,
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

      navigate('/orders', {
        state: {
          selectedOrderId: savedOrder.id,
          message: `Đã tạo đơn hàng ${savedOrder.order_no}.`,
        },
      });
    } catch (submitError: any) {
      setError(submitError?.message ?? 'Tạo đơn hàng thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || hydratingOrder) {
    return (
      <PageLoader 
        text={hydratingOrder ? 'Đang tải đơn hàng để chỉnh sửa...' : 'Đang tải dữ liệu...'} 
        fullScreen
      />
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
    <>
      {successMessage ? (
        <div className="fixed right-5 top-5 z-[70] flex max-w-[360px] items-start gap-3 border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl shadow-slate-200/80">
          <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-500" />
          <div className="font-medium">{successMessage}</div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            aria-label="Đóng thông báo"
            className="ml-2 text-slate-400 transition-colors hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
      <div className="min-h-full bg-[#F4F6F8] pb-20 font-sans text-sm">
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
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
                  <div className="relative" ref={customerSearchRef}>
                    <div className="flex items-center rounded border border-blue-400">
                      <div className="pl-3 text-slate-400">
                        <Search size={16} />
                      </div>
                      <input
                        id="pos-customer-search"
                        type="text"
                        value={customerQuery}
                        onChange={(event) => setCustomerQuery(event.target.value)}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        placeholder="Tìm theo tên, SĐT, mã khách hàng ... (F4)"
                        className="w-full py-2 pl-2 pr-4 text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                        autoComplete="off"
                      />
                    </div>

                    {isCustomerDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-0.5 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
                        <div className="max-h-80 overflow-y-auto pb-1">
                          <button
                            type="button"
                            onClick={() => {
                               setIsCustomerDropdownOpen(false);
                               setIsAddCustomerOpen(true);
                            }}
                            className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3 text-left font-medium text-blue-500 hover:bg-slate-50"
                          >
                            <PlusCircle size={18} />
                            Thêm mới khách hàng
                          </button>
                          
                          {filteredCustomers.length === 0 && customerQuery.trim() ? (
                            <div className="px-4 py-6 text-center text-[13px] text-slate-400">
                              Không tìm thấy khách hàng phù hợp
                            </div>
                          ) : (
                            filteredCustomers.slice(0, 10).map((customer) => (
                              <button
                                key={customer.id}
                                type="button"
                                onClick={() => {
                                   handleCustomerSelect(customer);
                                   setIsCustomerDropdownOpen(false);
                                }}
                                className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 last:border-b-0"
                              >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-500">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                  </svg>
                                </div>
                                <div>
                                  <div className="text-[13px] font-medium text-slate-700">{customer.full_name}</div>
                                  <div className="text-[13px] text-slate-500">{customer.phone}</div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className="mt-8 flex flex-1 flex-col items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50/50 py-8 text-slate-400"
                  >
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
                      <p>Khách lẻ</p>
                    </div>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between p-5">
                  <div className="flex justify-between gap-6">
                    {/* Left Column */}
                    <div className="flex-1 space-y-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold uppercase text-slate-800">Địa chỉ giao hàng</span>
                          <button
                            type="button"
                            className="font-medium text-blue-500 hover:text-blue-600"
                          >
                            Thay đổi
                          </button>
                        </div>
                        <p className="text-[13px] text-slate-800">{selectedCustomer.phone || 'Chưa có số điện thoại'}</p>
                        <p className="text-[13px] text-slate-800">{selectedCustomer.address || 'Chưa có địa chỉ giao hàng'}</p>
                      </div>

                      {isCustomerDetailsExpanded && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold uppercase text-slate-800">Địa chỉ nhận hóa đơn</span>
                            <button
                              type="button"
                              className="font-medium text-blue-500 hover:text-blue-600"
                            >
                              Thay đổi
                            </button>
                          </div>
                          <p className="text-[13px] text-slate-800">{selectedCustomer.phone || 'Chưa có số điện thoại'}</p>
                          <p className="text-[13px] text-slate-800">{selectedCustomer.address || 'Chưa có địa chỉ giao hàng'}</p>
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="w-[320px] space-y-4">
                      <div className="space-y-3 rounded border border-dashed border-slate-300 bg-white p-4 text-[13px]">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Nợ phải thu</span>
                          <span className="font-medium text-red-500">
                            {formatNumber(Number(selectedDebt?.current_debt ?? 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Tổng chi tiêu (0 đơn)</span>
                          <span className="font-medium text-blue-500">
                            {formatNumber(Number(selectedDebt?.total_sales ?? 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Trả hàng (0 sản phẩm)</span>
                          <span className="font-medium text-red-500">0</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Giao hàng thất bại (0 đơn)</span>
                          <span className="font-medium text-red-500">0</span>
                        </div>
                      </div>

                      {isCustomerDetailsExpanded && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold uppercase text-slate-800">Liên hệ</span>
                            <button
                              type="button"
                              className="font-medium text-blue-500 hover:text-blue-600"
                            >
                              Thêm mới
                            </button>
                          </div>
                          <p className="text-[13px] text-slate-400">Chưa có thông tin liên hệ</p>
                          <input
                            type="text"
                            placeholder="Email"
                            className="w-full rounded border border-slate-300 py-1.5 px-3 text-[13px] outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-center border-t border-slate-50 pt-4">
                    <button
                      onClick={() => setIsCustomerDetailsExpanded(!isCustomerDetailsExpanded)}
                      className="flex items-center gap-1 font-medium text-blue-500 hover:text-blue-600"
                    >
                      {isCustomerDetailsExpanded ? 'Rút gọn' : 'Mở rộng'}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-200 ${isCustomerDetailsExpanded ? '' : 'rotate-180'}`}
                      >
                        <path d="m18 15-6-6-6 6" />
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
                <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-4">
                  <label className="text-[13px] text-slate-600">Bán tại</label>
                  <select
                    value={branchId}
                    onChange={(event) => setBranchId(event.target.value)}
                    className="h-8 w-full rounded border border-slate-300 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none"
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}{branch.is_default ? ' (Mặc định)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-4">
                  <label className="text-[13px] text-slate-600">Bán bởi</label>
                  <select
                    value={cashierId}
                    onChange={(event) => setCashierId(event.target.value)}
                    className="h-8 w-full rounded border border-slate-300 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">{loadingStaff ? 'Đang tải nhân viên...' : 'Chọn người bán'}</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-4">
                  <label className="text-[13px] text-slate-600">Nguồn</label>
                  <select
                    value={source}
                    onChange={(event) =>
                      setSource(event.target.value as 'pos' | 'web' | 'phone' | 'manual')
                    }
                    className="h-8 w-full rounded border border-slate-300 bg-white px-3 text-[13px] focus:border-blue-500 focus:outline-none"
                  >
                    <option value="web">Web</option>
                    <option value="pos">POS</option>
                    <option value="phone">Điện thoại</option>
                    <option value="manual">Thủ công</option>
                  </select>
                </div>
                <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-4">
                  <label className="text-[13px] text-slate-600">Hẹn giao</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={deliveryDue}
                      onChange={(event) => setDeliveryDue(event.target.value)}
                      className="h-8 w-full rounded border border-slate-300 px-3 pr-9 text-[13px] focus:border-blue-500 focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-0"
                    />
                    <Calendar size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="grid grid-cols-[76px_minmax(0,1fr)] items-center gap-4">
                  <label className="text-[13px] text-slate-600">Mã đơn</label>
                  <input
                    type="text"
                    value={orderNo}
                    onChange={(event) => setOrderNo(event.target.value)}
                    className="h-8 w-full rounded border border-slate-300 px-3 text-[13px] focus:border-blue-500 focus:outline-none"
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
            <div className="relative flex-1" ref={productSearchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="pos-product-search"
                type="text"
                placeholder="Tìm theo tên, mã SKU, hoặc quét mã Barcode...(F3)"
                className={cn(
                  'w-full rounded border py-2 pl-9 pr-8 text-[13px] transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                  isDropdownOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-300',
                )}
                value={productQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onClick={() => setIsDropdownOpen(true)}
                onChange={(event) => {
                  setProductQuery(event.target.value);
                  setIsDropdownOpen(true);
                }}
              />
              {productQuery && (
                <button
                  onClick={() => {
                    setProductQuery('');
                    setIsDropdownOpen(true);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 p-0.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              )}

              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded border border-slate-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsAddProductOpen(true);
                    }}
                    className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-3 text-left font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <PlusCircle size={16} /> Thêm mới sản phẩm
                  </button>

                  {filteredProducts.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[13px] text-slate-400">
                      Không tìm thấy sản phẩm phù hợp
                    </div>
                  ) : (
                    filteredProducts.slice(0, 10).map((product) => {
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
                              <p className="mt-0.5 text-[12px]">
                                <span className="text-slate-400">{product.sku}</span>{' '}
                                <span className="text-blue-500">{product.unit_name || 'Mặc định'}</span>
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
              onClick={() => {
                setIsDropdownOpen(true);
                document.getElementById('pos-product-search')?.focus();
              }}
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
                onClick={() => {
                  setIsDropdownOpen(true);
                  document.getElementById('pos-product-search')?.focus();
                }}
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
                  {cartProducts.map((product, index) => {
                    const isActive = activeCartProductId === product.id;

                    return (
                      <tr
                        key={product.id}
                        onClick={() => setActiveCartProductId(product.id)}
                        className={cn(
                          'relative bg-white transition-colors',
                          isActive
                            ? 'z-[1] bg-blue-50/30'
                            : 'hover:bg-slate-50',
                        )}
                      >
                        <td className={cn(
                          'px-5 py-4 text-center font-medium text-slate-600',
                          isActive && 'border-y border-l border-blue-400',
                        )}>
                          {index + 1}
                        </td>
                        <td className={cn('px-2 py-4', isActive && 'border-y border-blue-400')}>
                          <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-300">
                            <ImageIcon size={20} />
                          </div>
                        </td>
                        <td className={cn('px-2 py-4', isActive && 'border-y border-blue-400')}>
                          <div className="flex items-center gap-1 text-[13px] font-medium text-[#0A1629]">
                            {product.name}
                            <Info size={12} className="mt-0.5 text-yellow-500" />
                          </div>
                          <div className="mt-0.5 text-[12px] text-slate-500">{product.subName}</div>
                          <div className="text-[12px] text-blue-500">{product.code}</div>
                        </td>
                        <td className={cn('px-2 py-4 text-center', isActive && 'border-y border-blue-400')}>
                          <input
                            type="number"
                            min={1}
                            value={product.qty}
                            onFocus={(event) => {
                              setActiveCartProductId(product.id);
                              event.target.select();
                            }}
                            onChange={(event) =>
                              updateCartProduct(product.id, 'qty', parseNumber(event.target.value))
                            }
                            className={cn(
                              'w-14 border-b-[1.5px] bg-transparent py-1 text-center font-semibold focus:outline-none',
                              isActive ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-800',
                            )}
                          />
                        </td>
                        <td className={cn('px-2 py-4 text-right', isActive && 'border-y border-blue-400')}>
                          <MoneyInput
                            value={product.price}
                            onFocus={() => setActiveCartProductId(product.id)}
                            onChange={(value) => updateCartProduct(product.id, 'price', value)}
                            className="w-full border-b border-slate-200 bg-transparent py-1 text-right text-slate-800 transition-colors focus:border-blue-500 focus:outline-none hover:border-slate-300"
                          />
                        </td>
                        <td className={cn('px-2 py-4 text-right', isActive && 'border-y border-blue-400')}>
                          <MoneyInput
                            value={product.discount}
                            onFocus={() => setActiveCartProductId(product.id)}
                            onChange={(value) => updateCartProduct(product.id, 'discount', value)}
                            className="w-full border-b border-slate-200 bg-transparent py-1 text-right text-slate-800 transition-colors focus:border-blue-500 focus:outline-none hover:border-slate-300"
                          />
                        </td>
                        <td className={cn(
                          'h-full px-5 py-4 text-right font-medium text-slate-800',
                          isActive && 'border-y border-r border-blue-400',
                        )}>
                          <div className="flex items-center justify-end gap-3">
                          {formatNumber(product.price * product.qty - product.discount)}
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              const nextProducts = cartProducts.filter((item) => item.id !== product.id);
                              setCartProducts(nextProducts);
                              if (activeCartProductId === product.id) {
                                setActiveCartProductId(nextProducts[0]?.id ?? '');
                              }
                            }}
                            className="ml-2 text-slate-400 transition-colors hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                <MoneyInput
                  value={paidAmount}
                  onChange={(value) => setPaidAmount(Math.max(0, value))}
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

          {selectedCustomer ? (
            <div className="ui-subtle-panel p-4 text-slate-600">
              Giao theo khách hàng: <span className="font-medium text-slate-800">{selectedCustomer.full_name}</span>
              {selectedCustomer.address ? ` - ${selectedCustomer.address}` : ' - Chưa có địa chỉ giao hàng'}
            </div>
          ) : null}
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

    <AddCustomerModal
      open={isAddCustomerOpen}
      onClose={() => setIsAddCustomerOpen(false)}
      onCreated={(newCustomer) => {
        setCustomers((prev) => [newCustomer, ...prev]);
        setCustomerId(newCustomer.id);
        setCustomerQuery('');
        setIsAddCustomerOpen(false);
      }}
    />

    <AddProductModal
      open={isAddProductOpen}
      onClose={() => setIsAddProductOpen(false)}
      onCreated={(newProduct) => {
        setProducts((prev) => [newProduct, ...prev]);
        handleProductSelect(newProduct);
        setIsAddProductOpen(false);
        setSuccessMessage('Thêm mới sản phẩm thành công!');
      }}
    />
  </>  
  );
}
