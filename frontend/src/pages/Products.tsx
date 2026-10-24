import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  Filter,
  Settings,
  Download,
  Upload,
  Plus,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImageIcon,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import {
  productsService,
  type Brand,
  type Product,
  type ProductCategory,
  type ProductsQuery,
  type ProductStockSummary,
} from '../services/productsService';
import { inventoryService, type Branch } from '../services/inventoryService';
import { PageLoader } from '../components/PageLoader';
import { ToastBridge } from '../components/Toast';
import { exportRowsToXlsx } from '../utils/excel';
import { invalidatePosCache } from './POS';

type ProductDetailTab = 'stock' | 'history';
type ExportScope = 'all' | 'current';
type ProductsRouteState = {
  selectedProductId?: string;
  detailTab?: ProductDetailTab;
  searchTerm?: string;
  message?: string;
} | null;

type ProductListItem = Product & {
  typeName: string;
  brandName: string;
  instock: number;
  available: number;
};

const PRODUCT_FILTERS_KEY = 'duc-huyen-pos.products.filters';

// ─── Module-level cache ───────────────────────────────────────────────────────
// Giữ dữ liệu giữa các lần chuyển tab (tránh reload API mỗi lần quay lại)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút
type ProductsCache = {
  products: Product[];
  stockMap: Record<string, ProductStockSummary>;
  categories: ProductCategory[];
  brands: Brand[];
  branches: Branch[];
  statusFilter: string;
  timestamp: number;
};
let productsCache: ProductsCache | null = null;

function isCacheValid(statusFilter: string): boolean {
  if (!productsCache) return false;
  if (productsCache.statusFilter !== statusFilter) return false;
  return Date.now() - productsCache.timestamp < CACHE_TTL_MS;
}

export function invalidateProductsCache() {
  productsCache = null;
}

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN');
}

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

function formatDateTime(value?: string) {
  if (!value) {
    return '---';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN');
}

function buildProductsData(products: Product[], stockMap: Record<string, ProductStockSummary>): ProductListItem[] {
  return products.map((product) => {
    const stock = stockMap[product.id];
    return {
      ...product,
      typeName: product.product_categories?.name ?? '---',
      brandName: product.brands?.name ?? '---',
      instock: Number(stock?.total_on_hand_qty ?? 0),
      available: Number(stock?.total_available_qty ?? 0),
    };
  });
}

function getSystemDefaultBranch(branches: Branch[]) {
  return branches.find((branch) => branch.is_default) ?? branches[0] ?? null;
}

function normalizeImportKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseImportNumber(value?: string) {
  if (!value) {
    return 0;
  }

  const digits = value.replace(/[^\d]/g, '');
  const numeric = Number(digits);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseImportBoolean(value: string | undefined, defaultValue: boolean) {
  if (!value?.trim()) {
    return defaultValue;
  }

  const normalized = normalizeImportKey(value);
  if (['1', 'true', 'co', 'yes', 'y', 'bat', 'active', 'hoat dong'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'khong', 'no', 'n', 'tat', 'inactive', 'ngung', 'vo hieu hoa'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

async function parseImportFile(file: File) {
  const { readSheet } = await import('read-excel-file/browser');
  const rows = await readSheet(file);
  return rows
    .map((row) => row.map((cell) => (cell === null ? '' : String(cell).trim())))
    .filter((row) => row.some(Boolean));
}

function getImportValue(record: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = record[normalizeImportKey(alias)];
    if (value?.trim()) {
      return value.trim();
    }
  }

  return '';
}

function getImportValueWithFallback(
  record: Record<string, string>,
  fallbackRecord: Record<string, string> | null,
  aliases: string[],
) {
  return getImportValue(record, aliases) || (fallbackRecord ? getImportValue(fallbackRecord, aliases) : '');
}

function getImportVariantAttributeSuffix(record: Record<string, string>) {
  const values = [
    getImportValue(record, ['Giá trị thuộc tính 1', 'Gia tri thuoc tinh 1', 'Attribute value 1']),
    getImportValue(record, ['Giá trị thuộc tính 2', 'Gia tri thuoc tinh 2', 'Attribute value 2']),
    getImportValue(record, ['Giá trị thuộc tính 3', 'Gia tri thuoc tinh 3', 'Attribute value 3']),
  ]
    .map((value) => value.trim())
    .filter((value) => value && !['mac dinh', 'default'].includes(normalizeImportKey(value)));

  return values.join(' ');
}

function getImportProductName(
  record: Record<string, string>,
  fallbackBaseName: string,
) {
  const variantName = getImportValue(record, [
    'Tên phiên bản sản phẩm',
    'Ten phien ban san pham',
    'Variant product name',
    'Variant name',
  ]);
  if (variantName) {
    return variantName;
  }

  const productName = getImportValue(record, ['Tên sản phẩm*', 'Ten san pham', 'Product name', 'Name', 'Tên']);
  if (productName) {
    return productName;
  }

  const attributeSuffix = getImportVariantAttributeSuffix(record);
  if (fallbackBaseName && attributeSuffix) {
    return `${fallbackBaseName} - ${attributeSuffix}`;
  }

  return '';
}

function findLookupId<T extends { id: string; code?: string; name: string }>(items: T[], value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const normalized = normalizeImportKey(value);
  return items.find((item) =>
    item.id === value ||
    normalizeImportKey(item.name) === normalized ||
    (item.code ? normalizeImportKey(item.code) === normalized : false),
  )?.id;
}

async function loadAllProducts(query: Omit<ProductsQuery, 'page' | 'limit'>) {
  const firstPage = await productsService.getAll({
    ...query,
    page: 1,
    limit: 200,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      productsService.getAll({
        ...query,
        page: index + 2,
        limit: 200,
      }),
    ),
  );

  return [firstPage.data, ...remainingPages.map((pageResponse) => pageResponse.data)].flat();
}

export function Products() {
  const [activeTab, setActiveTab] = useState('all');
  const [detailTab, setDetailTab] = useState<ProductDetailTab>('stock');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [categoryFilterId, setCategoryFilterId] = useState('all');
  const [brandFilterId, setBrandFilterId] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, ProductStockSummary>>({});
  const [isListLoading, setIsListLoading] = useState(true);
  const [hasLoadedListData, setHasLoadedListData] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const systemDefaultBranch = useMemo(() => getSystemDefaultBranch(branches), [branches]);

  useEffect(() => {
    try {
      const savedFilters = window.localStorage.getItem(PRODUCT_FILTERS_KEY);
      if (!savedFilters) {
        return;
      }

      const parsed = JSON.parse(savedFilters) as {
        searchTerm?: string;
        categoryFilterId?: string;
        brandFilterId?: string;
        statusFilter?: 'all' | 'active' | 'inactive';
        sortOrder?: 'newest' | 'oldest';
      };

      if (typeof parsed.searchTerm === 'string') {
        setSearchTerm(parsed.searchTerm);
      }
      if (typeof parsed.categoryFilterId === 'string') {
        setCategoryFilterId(parsed.categoryFilterId);
      }
      if (typeof parsed.brandFilterId === 'string') {
        setBrandFilterId(parsed.brandFilterId);
      }
      if (parsed.statusFilter === 'all' || parsed.statusFilter === 'active' || parsed.statusFilter === 'inactive') {
        setStatusFilter(parsed.statusFilter);
      }
      if (parsed.sortOrder === 'newest' || parsed.sortOrder === 'oldest') {
        setSortOrder(parsed.sortOrder);
      }
    } catch {
      window.localStorage.removeItem(PRODUCT_FILTERS_KEY);
    }
  }, []);

  useEffect(() => {
    const routeState = location.state as ProductsRouteState;
    if (!routeState) {
      return;
    }

    if (routeState.selectedProductId) {
      setSelectedProductId(routeState.selectedProductId);
    }
    if (routeState.detailTab) {
      setDetailTab(routeState.detailTab);
    }
    if (typeof routeState.searchTerm === 'string') {
      setSearchTerm(routeState.searchTerm);
    }
    if (routeState.message) {
      setInfoMessage(routeState.message);
    }

    navigate('/products', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    let active = true;

    async function loadListData() {
      // Nếu cache còn hợp lệ → dùng luôn, không gọi API
      if (isCacheValid(statusFilter)) {
        setProducts(productsCache!.products);
        setStockMap(productsCache!.stockMap);
        setCategories(productsCache!.categories);
        setBrands(productsCache!.brands);
        setBranches(productsCache!.branches);
        setIsListLoading(false);
        setHasLoadedListData(true);
        return;
      }

      setIsListLoading(true);
      setListError(null);

      try {
        const [productsResponse, stockSummary, categoriesResponse, brandsResponse, branchesResponse] = await Promise.all([
          loadAllProducts({
            // Không truyền search vào API — tìm kiếm sẽ được xử lý client-side
            status: statusFilter === 'all' ? undefined : statusFilter,
          }),
          productsService.getStockSummary(),
          productsService.getCategories(),
          productsService.getBrands(),
          inventoryService.getBranches(),
        ]);

        if (!active) {
          return;
        }

        const nextStockMap = stockSummary.reduce<Record<string, ProductStockSummary>>((acc, item) => {
          acc[item.product_id] = item;
          return acc;
        }, {});

        // Lưu vào cache
        productsCache = {
          products: productsResponse,
          stockMap: nextStockMap,
          categories: categoriesResponse,
          brands: brandsResponse,
          branches: branchesResponse,
          statusFilter,
          timestamp: Date.now(),
        };

        setProducts(productsResponse);
        setStockMap(nextStockMap);
        setCategories(categoriesResponse);
        setBrands(brandsResponse);
        setBranches(branchesResponse);
      } catch (error: any) {
        if (!active) {
          return;
        }
        setListError(error?.message ?? 'Không tải được danh sách sản phẩm.');
      } finally {
        if (active) {
          setIsListLoading(false);
          setHasLoadedListData(true);
        }
      }
    }

    loadListData();

    return () => {
      active = false;
    };
  }, [statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [brandFilterId, categoryFilterId, searchTerm, sortOrder, statusFilter]);

  useEffect(() => {
    let active = true;

    async function loadProductDetail(productId: string) {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const detail = await productsService.getOne(productId);
        if (!active) {
          return;
        }
        setSelectedProductDetail(detail);
      } catch (error: any) {
        if (!active) {
          return;
        }
        setDetailError(error?.message ?? 'Không tải được chi tiết sản phẩm.');
      } finally {
        if (active) {
          setIsDetailLoading(false);
        }
      }
    }

    if (!selectedProductId) {
      setSelectedProductDetail(null);
      return;
    }

    loadProductDetail(selectedProductId);

    return () => {
      active = false;
    };
  }, [selectedProductId]);

  const productsData = useMemo(
    () => buildProductsData(products, stockMap),
    [products, stockMap],
  );

  const visibleProducts = useMemo(() => {
    const keywords = debouncedSearchTerm
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((kw) => kw.toLowerCase());

    const filtered = productsData.filter((product) => {
      // Client-side multi-keyword search: mỗi từ phải khớp trong name / sku / barcode
      if (keywords.length > 0) {
        const haystack = `${product.name} ${product.sku ?? ''} ${product.barcode ?? ''}`.toLowerCase();
        if (!keywords.every((kw) => haystack.includes(kw))) {
          return false;
        }
      }
      if (categoryFilterId !== 'all' && product.product_category_id !== categoryFilterId) {
        return false;
      }
      if (brandFilterId !== 'all' && product.brand_id !== brandFilterId) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((left, right) => {
      const leftTime = new Date(left.created_at).getTime();
      const rightTime = new Date(right.created_at).getTime();
      return sortOrder === 'newest' ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [brandFilterId, categoryFilterId, debouncedSearchTerm, productsData, sortOrder]);

  const totalPages = Math.max(1, Math.ceil((visibleProducts.length || 1) / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = visibleProducts.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = pagedProducts.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = pagedProducts.length === 0 ? 0 : pageStart + pagedProducts.length - 1;
  const isRefreshingList = isListLoading && hasLoadedListData;

  const selectedProduct =
    selectedProductDetail ??
    productsData.find((product) => product.id === selectedProductId) ??
    null;

  const handleSaveFilters = () => {
    window.localStorage.setItem(
      PRODUCT_FILTERS_KEY,
      JSON.stringify({ searchTerm, categoryFilterId, brandFilterId, statusFilter, sortOrder }),
    );
    setInfoMessage('Đã lưu bộ lọc sản phẩm.');
  };

  const handleCycleCategoryFilter = () => {
    const options = ['all', ...categories.map((category) => category.id)];
    const currentIndex = options.indexOf(categoryFilterId);
    const nextId = options[(currentIndex + 1) % options.length];
    setCategoryFilterId(nextId);
    const nextLabel = nextId === 'all'
      ? 'Tất cả loại sản phẩm'
      : categories.find((category) => category.id === nextId)?.name ?? 'Loại sản phẩm';
    setInfoMessage(`Đang lọc theo: ${nextLabel}.`);
  };

  const handleCycleBrandFilter = () => {
    const options = ['all', ...brands.map((brand) => brand.id)];
    const currentIndex = options.indexOf(brandFilterId);
    const nextId = options[(currentIndex + 1) % options.length];
    setBrandFilterId(nextId);
    const nextLabel = nextId === 'all'
      ? 'Tất cả nhãn hiệu'
      : brands.find((brand) => brand.id === nextId)?.name ?? 'Nhãn hiệu';
    setInfoMessage(`Đang lọc theo: ${nextLabel}.`);
  };

  const handleToggleSortOrder = () => {
    const next = sortOrder === 'newest' ? 'oldest' : 'newest';
    setSortOrder(next);
    setInfoMessage(next === 'newest' ? 'Đang sắp xếp mới nhất trước.' : 'Đang sắp xếp cũ nhất trước.');
  };

  const handleToggleStatusFilter = () => {
    const next =
      statusFilter === 'all'
        ? 'active'
        : statusFilter === 'active'
        ? 'inactive'
        : 'all';
    setStatusFilter(next);
    setInfoMessage(
      next === 'all'
        ? 'Đang hiển thị tất cả trạng thái sản phẩm.'
        : next === 'active'
        ? 'Đang lọc sản phẩm còn hoạt động.'
        : 'Đang lọc sản phẩm đã vô hiệu hóa.',
    );
  };

  const handleExportProducts = async () => {
    const productsToExport = exportScope === 'all' ? visibleProducts : pagedProducts;

    if (productsToExport.length === 0) {
      setInfoMessage('Không có sản phẩm phù hợp để xuất file.');
      return;
    }

    const rows = [
      ['SKU', 'Tên sản phẩm', 'Loại', 'Nhãn hiệu', 'Có thể bán', 'Tồn kho', 'Ngày tạo'],
      ...productsToExport.map((product) => [
        product.sku || '---',
        product.name,
        product.typeName,
        product.brandName,
        String(product.available),
        String(product.instock),
        formatDate(product.created_at),
      ]),
    ];

    try {
      await exportRowsToXlsx(rows, `products-${new Date().toISOString().slice(0, 10)}`, 'Sản phẩm');
      setShowExportModal(false);
      setInfoMessage(`Đã xuất ${productsToExport.length} sản phẩm.`);
    } catch (error: any) {
      setInfoMessage(error?.message ?? 'Xuất file sản phẩm thất bại.');
    }
  };

  const handleImportProducts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const lowerFileName = file.name.toLowerCase();
    const supportedFile = lowerFileName.endsWith('.xlsx');
    if (!supportedFile) {
      setInfoMessage('Hiện chức năng nhập file chỉ hỗ trợ Excel .xlsx.');
      return;
    }

    setIsImporting(true);
    setListError(null);
    setInfoMessage(`Đang đọc file ${file.name}...`);

    try {
      const rows = await parseImportFile(file);
      const [headers, ...dataRows] = rows;

      if (!headers?.length || dataRows.length === 0) {
        setInfoMessage('File nhập chưa có dữ liệu sản phẩm.');
        return;
      }

      const normalizedHeaders = headers.map(normalizeImportKey);
      const createdProducts: Product[] = [];
      const failures: string[] = [];
      let skippedRows = 0;
      let currentBaseName = '';
      let currentBaseRecord: Record<string, string> | null = null;

      for (const [index, row] of dataRows.entries()) {
        const record = normalizedHeaders.reduce<Record<string, string>>((acc, header, headerIndex) => {
          acc[header] = row[headerIndex] ?? '';
          return acc;
        }, {});

        const baseName = getImportValue(record, ['Tên sản phẩm', 'Tên sản phẩm*', 'Ten san pham', 'Product name', 'Name', 'Tên']);
        if (baseName) {
          currentBaseName = baseName;
          currentBaseRecord = record;
        }

        const name = getImportProductName(record, currentBaseName);
        if (!name) {
          skippedRows += 1;
          continue;
        }

        const inheritedRecord = baseName ? null : currentBaseRecord;
        const categoryValue = getImportValueWithFallback(record, inheritedRecord, [
          'product_category_id',
          'category_id',
          'Loại',
          'Loại sản phẩm',
          'Category',
        ]);
        const brandValue = getImportValueWithFallback(record, inheritedRecord, ['brand_id', 'Nhãn hiệu', 'Thương hiệu', 'Brand']);
        const statusValue = getImportValueWithFallback(record, inheritedRecord, ['Trạng thái', 'Status']);
        const isActive = statusValue ? parseImportBoolean(statusValue, true) : true;

        try {
          const created = await productsService.create({
            sku: getImportValue(record, ['SKU', 'Mã sản phẩm', 'Ma san pham', 'Mã SP']) || undefined,
            barcode: getImportValue(record, ['Barcode', 'Mã vạch', 'Ma vach']) || undefined,
            name,
            product_category_id: findLookupId(categories, categoryValue),
            brand_id: findLookupId(brands, brandValue),
            default_branch_id: systemDefaultBranch?.id,
            unit_name: getImportValueWithFallback(record, inheritedRecord, ['Đơn vị', 'Đơn vị tính', 'Unit', 'unit_name']) || 'cái',
            description: getImportValueWithFallback(record, inheritedRecord, ['Mô tả', 'Mo ta', 'Description']) || undefined,
            sale_price: parseImportNumber(getImportValue(record, ['Giá bán', 'Giá bán lẻ', 'Sale price', 'sale_price'])),
            cost_price: parseImportNumber(getImportValue(record, ['Giá nhập', 'Giá vốn', 'Cost price', 'cost_price'])),
            reorder_level: parseImportNumber(getImportValueWithFallback(record, inheritedRecord, ['Tồn tối thiểu', 'Reorder level', 'reorder_level'])),
            track_inventory: parseImportBoolean(
              getImportValueWithFallback(record, inheritedRecord, ['Quản lý tồn kho', 'Track inventory', 'track_inventory']),
              true,
            ),
            allow_negative_stock: parseImportBoolean(
              getImportValueWithFallback(record, inheritedRecord, ['Bán âm', 'Allow negative stock', 'allow_negative_stock']),
              false,
            ),
            status: isActive ? 'active' : 'inactive',
          } satisfies Partial<Product>);

          createdProducts.push(created);
        } catch (error: any) {
          failures.push(`Dòng ${index + 2}: ${error?.message ?? 'Không nhập được sản phẩm.'}`);
        }
      }

      if (createdProducts.length > 0) {
        invalidateProductsCache();
      invalidatePosCache();
      invalidatePosCache();
        setProducts((current) => [...createdProducts, ...current]);
      }

      const summaryParts = [
        createdProducts.length ? `Đã nhập ${createdProducts.length} sản phẩm` : 'Chưa nhập được sản phẩm nào',
        skippedRows ? `bỏ qua ${skippedRows} dòng thiếu tên` : '',
        failures.length ? `${failures.length} dòng lỗi` : '',
      ].filter(Boolean);

      setInfoMessage(
        `${summaryParts.join(', ')}.${failures.length ? ` Lỗi đầu tiên: ${failures[0]}` : ''}`,
      );
    } catch (error: any) {
      setListError(error?.message ?? 'Nhập file sản phẩm thất bại.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) {
      return;
    }

    const confirmed = window.confirm(`Vô hiệu hóa sản phẩm ${selectedProduct.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await productsService.delete(selectedProduct.id);
      invalidateProductsCache();
      invalidatePosCache();
      setProducts((current) =>
        current.map((product) =>
          product.id === selectedProduct.id ? { ...product, status: 'inactive' } : product,
        ),
      );
      setSelectedProductDetail((current) =>
        current ? { ...current, status: 'inactive' } : current,
      );
      setInfoMessage(`Đã vô hiệu hóa sản phẩm ${selectedProduct.name}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Xóa sản phẩm thất bại.');
    }
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct) {
      return;
    }

    const name = window.prompt('Tên sản phẩm', selectedProduct.name);
    if (!name?.trim()) {
      return;
    }

    const unitName = window.prompt('Đơn vị tính', selectedProduct.unit_name ?? 'cái');
    if (unitName === null) {
      return;
    }

    const salePrice = window.prompt('Giá bán lẻ', String(selectedProduct.sale_price ?? 0));
    if (salePrice === null) {
      return;
    }

    const costPrice = window.prompt('Giá nhập', String(selectedProduct.cost_price ?? 0));
    if (costPrice === null) {
      return;
    }

    const description = window.prompt('Mô tả', selectedProduct.description ?? '');
    if (description === null) {
      return;
    }

    let nextDefaultBranchId = selectedProduct.default_branch_id ?? systemDefaultBranch?.id;
    if (branches.length) {
      const currentBranchId = selectedProduct.default_branch_id ?? systemDefaultBranch?.id;
      const currentBranchIndex = branches.findIndex((branch) => branch.id === currentBranchId);
      const branchOptions = branches
        .map((branch, index) =>
          `${index + 1}. ${branch.name}${branch.id === currentBranchId ? ' (hiện tại)' : ''}${branch.is_default ? ' [mặc định hệ thống]' : ''}`)
        .join('\n');
      const branchInput = window.prompt(
        `Chi nhánh mặc định:\n${branchOptions}\n\nNhập số tương ứng.`,
        currentBranchIndex >= 0 ? String(currentBranchIndex + 1) : '',
      );
      if (branchInput === null) {
        return;
      }

      const branchIndex = Number(branchInput.trim());
      if (!Number.isInteger(branchIndex) || branchIndex < 1 || branchIndex > branches.length) {
        setInfoMessage('Chi nhánh mặc định không hợp lệ.');
        return;
      }

      nextDefaultBranchId = branches[branchIndex - 1].id;
    }

    try {
      const updated = await productsService.update(selectedProduct.id, {
        name: name.trim(),
        unit_name: unitName.trim() || 'cái',
        sale_price: Number(salePrice) || 0,
        cost_price: Number(costPrice) || 0,
        description: description.trim() || undefined,
        default_branch_id: nextDefaultBranchId,
      });

      invalidateProductsCache();
      invalidatePosCache();
      setProducts((current) =>
        current.map((product) => (product.id === updated.id ? { ...product, ...updated } : product)),
      );
      setSelectedProductDetail((current) => (current ? { ...current, ...updated } : updated));
      setInfoMessage(`Đã cập nhật sản phẩm ${updated.name}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Cập nhật sản phẩm thất bại.');
    }
  };

  const handleCopyProduct = async () => {
    if (!selectedProduct) {
      return;
    }

    setIsCopying(true);
    setDetailError(null);

    try {
      const duplicated = await productsService.create({
        name: `${selectedProduct.name} (Bản sao)`,
        unit_name: selectedProduct.unit_name,
        barcode: selectedProduct.barcode,
        image_url: selectedProduct.image_url,
        description: selectedProduct.description,
        sale_price: Number(selectedProduct.sale_price ?? 0),
        cost_price: Number(selectedProduct.cost_price ?? 0),
        reorder_level: Number(selectedProduct.reorder_level ?? 0),
        track_inventory: selectedProduct.track_inventory,
        allow_negative_stock: selectedProduct.allow_negative_stock,
        product_category_id: selectedProduct.product_category_id,
        brand_id: selectedProduct.brand_id,
        default_supplier_id: selectedProduct.default_supplier_id,
        default_branch_id: selectedProduct.default_branch_id,
        status: 'active',
      });

      invalidateProductsCache();
      invalidatePosCache();
      setProducts((current) => [duplicated, ...current]);
      setSelectedProductId(duplicated.id);
      setSelectedProductDetail(duplicated);
      setInfoMessage(`Đã sao chép sản phẩm sang ${duplicated.name}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Sao chép sản phẩm thất bại.');
    } finally {
      setIsCopying(false);
    }
  };

  const handleUpdateDefaultBranch = async () => {
    if (!selectedProduct) {
      return;
    }

    if (!branches.length) {
      setInfoMessage('Chưa tải được danh sách chi nhánh.');
      return;
    }

    const currentBranchId = selectedProduct.default_branch_id ?? systemDefaultBranch?.id;
    const currentBranchIndex = branches.findIndex((branch) => branch.id === currentBranchId);
    const branchOptions = branches
      .map((branch, index) =>
        `${index + 1}. ${branch.name}${branch.id === currentBranchId ? ' (hiện tại)' : ''}${branch.is_default ? ' [mặc định hệ thống]' : ''}`)
      .join('\n');
    const branchInput = window.prompt(
      `Chọn chi nhánh mặc định cho ${selectedProduct.name}:\n${branchOptions}\n\nNhập số tương ứng.`,
      currentBranchIndex >= 0 ? String(currentBranchIndex + 1) : '',
    );
    if (branchInput === null) {
      return;
    }

    const branchIndex = Number(branchInput.trim());
    if (!Number.isInteger(branchIndex) || branchIndex < 1 || branchIndex > branches.length) {
      setInfoMessage('Chi nhánh mặc định không hợp lệ.');
      return;
    }

    const nextBranch = branches[branchIndex - 1];

    try {
      const updated = await productsService.update(selectedProduct.id, {
        default_branch_id: nextBranch.id,
      });

      setProducts((current) =>
        current.map((product) => (product.id === updated.id ? { ...product, ...updated } : product)),
      );
      setSelectedProductDetail((current) => (current ? { ...current, ...updated } : updated));
      setInfoMessage(`Đã cập nhật chi nhánh mặc định sang ${nextBranch.name}.`);
    } catch (error: any) {
      setDetailError(error?.message ?? 'Cập nhật chi nhánh mặc định thất bại.');
    }
  };

  if (selectedProduct) {
    const resolvedDefaultBranchId = selectedProduct.default_branch_id ?? systemDefaultBranch?.id;
    const resolvedDefaultBranchName = selectedProduct.default_branch?.name ?? systemDefaultBranch?.name ?? '---';

    return (
      <div className="-mx-6 -my-6 flex min-h-full flex-col bg-[#f3f4f6] lg:-mx-7 xl:-mx-8">
        <ToastBridge message={infoMessage} onDone={() => setInfoMessage(null)} />
        <ToastBridge message={detailError} variant="error" onDone={() => setDetailError(null)} />

        <div className="custom-scrollbar flex-1 overflow-auto px-6 pb-20 pt-4 lg:px-7 xl:px-8">
          {false && infoMessage ? (
            <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {infoMessage}
            </div>
          ) : null}

          {false && detailError ? (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {detailError}
            </div>
          ) : null}

          {isDetailLoading ? (
            <div className="mb-4 rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              Đang cập nhật chi tiết sản phẩm...
            </div>
          ) : null}

          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => setSelectedProductId(null)}
              className="flex items-center gap-2 text-[14px] font-medium text-slate-600 transition-colors hover:text-[#0088FF]"
            >
              <ChevronLeft size={16} /> Quay lại danh sách sản phẩm
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedProductId(null)}
                className="rounded border border-slate-300 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Thoát
              </button>
              <button
                onClick={handleDeleteProduct}
                className="rounded border border-red-500 bg-white px-4 py-1.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                Xóa
              </button>
              <button
                onClick={handleUpdateProduct}
                className="rounded bg-[#0088FF] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
              >
                Sửa sản phẩm
              </button>
            </div>
          </div>

          <div className="mb-4">
            <h1 className="mb-3 text-[22px] font-semibold text-[#182537]">{selectedProduct.name}</h1>
            <button
              onClick={handleCopyProduct}
              disabled={isCopying}
              className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <Copy size={14} className="text-slate-500" /> {isCopying ? 'Đang sao chép...' : 'Sao chép'}
            </button>
          </div>

          <div className="space-y-6">
            <div className="ui-card">
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <h3 className="text-[15px] font-semibold text-[#182537]">Thông tin sản phẩm</h3>
                <span className="rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-[12px] font-medium text-orange-600">
                  {selectedProduct.status === 'active' ? 'Đang giao dịch' : 'Đã ngừng'}
                </span>
              </div>
              <div className="flex gap-8 p-5">
                <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
                  <div className="flex"><div className="w-40 text-slate-600">Mã SKU</div><div className="text-[#182537]">: {selectedProduct.sku || '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Loại sản phẩm</div><div className="text-[#182537]">: {selectedProduct.product_categories?.name ?? '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Mã barcode</div><div className="text-[#182537]">: {selectedProduct.barcode || '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Nhãn hiệu</div><div className="text-[#182537]">: {selectedProduct.brands?.name ?? '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Khối lượng</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Nhóm ngành nghề tính thuế GTGT, TNCN</div><div className="text-[#182537]">: ---</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Đơn vị tính</div><div className="text-[#182537]">: {selectedProduct.unit_name || '---'}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Chi nhánh mặc định</div><div className="text-[#182537]">: {resolvedDefaultBranchName}</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Phân loại</div><div className="text-[#182537]">: Sản phẩm thường</div></div>
                  <div className="flex"><div className="w-40 text-slate-600">Ngày tạo</div><div className="text-[#182537]">: {formatDateTime(selectedProduct.created_at)}</div></div>
                  <div className="flex"><button onClick={() => setInfoMessage(selectedProduct.description || 'Sản phẩm chưa có mô tả.')} className="w-40 cursor-pointer text-[#0088FF] hover:underline">Xem mô tả</button></div>
                  <div className="flex"><div className="w-40 text-slate-600">Ngày cập nhật cuối</div><div className="text-[#182537]">: {formatDateTime(selectedProduct.updated_at)}</div></div>
                </div>

                <div className="flex min-h-[160px] w-[300px] shrink-0 flex-col items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 p-4">
                  <ImageIcon size={48} className="mb-2 text-slate-300" />
                  <p className="text-[13px] text-slate-500">
                    {selectedProduct.image_url ? 'Sản phẩm đã có ảnh liên kết' : 'Sản phẩm chưa có ảnh tải lên'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="ui-card flex-1">
                <div className="border-b border-slate-100 p-4">
                  <h3 className="text-[15px] font-semibold text-[#182537]">Giá sản phẩm</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-5 text-[13px]">
                  <div className="flex"><div className="w-32 text-slate-600">Giá bán lẻ</div><div className="text-[#182537]">: {formatNumber(Number(selectedProduct.sale_price ?? 0))}</div></div>
                  <div className="flex"><div className="w-32 text-slate-600">Giá bán buôn</div><div className="text-[#182537]">: 0</div></div>
                  <div className="flex"><div className="w-32 text-slate-600">Giá nhập</div><div className="text-[#182537]">: {formatNumber(Number(selectedProduct.cost_price ?? 0))}</div></div>
                </div>
              </div>

              <div className="ui-card w-[300px] shrink-0">
                <div className="border-b border-slate-100 px-4 py-3.5">
                  <h3 className="text-[15px] font-semibold text-[#182537]">Thông tin thêm</h3>
                </div>
                <div className="space-y-3 px-4 py-3.5 text-[13px] text-slate-700">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedProduct.status === 'active'}
                      readOnly
                      className="h-3.5 w-3.5 rounded-sm border-slate-300 text-[#0088FF] focus:ring-0"
                    />
                    <span className="flex items-center gap-1.5">
                      Cho phép bán
                      <Info size={12} className="text-[#4da3ff]" />
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={false}
                      readOnly
                      className="h-3.5 w-3.5 rounded-sm border-slate-300 text-[#0088FF] focus:ring-0"
                    />
                    <span className="flex items-center gap-1.5">
                      Áp dụng thuế
                      <Info size={12} className="text-[#4da3ff]" />
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={false}
                      readOnly
                      className="h-3.5 w-3.5 rounded-sm border-slate-300 text-[#0088FF] focus:ring-0"
                    />
                    <span className="flex items-center gap-1.5">
                      Áp dụng bảo hành
                      <Info size={12} className="text-[#4da3ff]" />
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="ui-card">
              <div className="flex border-b border-slate-200 pr-4 pt-1">
                <button
                  onClick={() => setDetailTab('stock')}
                  className={`border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                    detailTab === 'stock'
                      ? 'border-[#0088FF] text-[#0088FF]'
                      : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                  }`}
                >
                  Tồn kho
                </button>
                <button
                  onClick={() => setDetailTab('history')}
                  className={`border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                    detailTab === 'history'
                      ? 'border-[#0088FF] text-[#0088FF]'
                      : 'border-transparent text-slate-600 hover:text-[#0088FF]'
                  }`}
                >
                  Lịch sử kho
                </button>
              </div>

              {detailTab === 'stock' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                        <th className="px-5 py-3">Chi nhánh</th>
                        <th className="px-2 py-3 text-right">Tồn kho</th>
                        <th className="px-2 py-3 text-right">Giá vốn</th>
                        <th className="px-2 py-3 text-right">Có thể bán</th>
                        <th className="px-2 py-3 text-right">Đang giao dịch</th>
                        <th className="px-2 py-3 text-right">Hàng đang về</th>
                        <th className="px-2 py-3 text-right">Hàng đang giao</th>
                        <th className="px-2 py-3 text-right">Tồn tối thiểu</th>
                        <th className="px-2 py-3 text-right">Tồn tối đa</th>
                        <th className="px-5 py-3 text-right">Điểm lưu kho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!selectedProduct.branch_stocks?.length ? (
                        <tr>
                          <td colSpan={10} className="px-5 py-8 text-center text-[13px] text-slate-500">
                            Chưa có dữ liệu tồn kho chi tiết.
                          </td>
                        </tr>
                      ) : (
                        selectedProduct.branch_stocks.map((stock) => (
                          <tr key={stock.branch_id} className="text-[13px] transition-colors hover:bg-slate-50">
                            <td className="px-5 py-4 text-[#182537]">
                              <div className="flex items-center gap-2">
                                <span>{stock.branches?.name ?? '---'}</span>
                                {stock.branch_id === resolvedDefaultBranchId ? (
                                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-[#0088FF]">
                                    Mặc định
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-2 py-4 text-right font-medium text-[#182537]">{formatNumber(Number(stock.on_hand_qty ?? 0))}</td>
                            <td className="px-2 py-4 text-right text-[#182537]">{formatNumber(Number(stock.average_cost ?? 0))}</td>
                            <td className="px-2 py-4 text-right font-medium text-[#182537]">{formatNumber(Number(stock.available_qty ?? 0))}</td>
                            <td className="px-2 py-4 text-right text-[#182537]">0</td>
                            <td className="px-2 py-4 text-right text-[#182537]">0</td>
                            <td className="px-2 py-4 text-right text-[#182537]">0</td>
                            <td className="px-2 py-4 text-right text-[#182537]">{formatNumber(Number(selectedProduct.reorder_level ?? 0))}</td>
                            <td className="px-2 py-4 text-right text-[#182537]">---</td>
                            <td className="px-5 py-4 text-right text-[#182537]">---</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4 p-5 text-[13px] text-[#182537]">
                  <div>Ngày tạo: {formatDateTime(selectedProduct.created_at)}</div>
                  <div>Ngày cập nhật cuối: {formatDateTime(selectedProduct.updated_at)}</div>
                  <div>Nhà cung cấp mặc định: {selectedProduct.suppliers?.name ?? '---'}</div>
                  <div className="flex items-center gap-2">
                    <span>Chi nhánh mặc định: {resolvedDefaultBranchName}</span>
                    <button
                      onClick={handleUpdateDefaultBranch}
                      className="font-medium text-[#0088FF] hover:underline"
                    >
                      Cập nhật
                    </button>
                  </div>
                  <button
                    onClick={() => navigate('/inventory')}
                    className="text-[13px] font-medium text-[#0088FF] hover:underline"
                  >
                    Mở trang kho hàng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isListLoading && !selectedProductId && !hasLoadedListData) {
    return <PageLoader text="Đang tải danh sách sản phẩm..." fullScreen />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ToastBridge message={infoMessage} onDone={() => setInfoMessage(null)} />
      <ToastBridge message={listError} variant="error" onDone={() => setListError(null)} />

      {showExportModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 pt-20">
          <div className="w-full max-w-[460px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-[16px] font-semibold text-[#182537]">Xuất file danh sách sản phẩm</h2>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                aria-label="Đóng"
                className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 px-6 py-4 text-[13px] text-[#182537]">
              <div className="font-medium">Giới hạn kết quả xuất</div>
              <label className="flex cursor-pointer items-center gap-2 py-1">
                <input
                  type="radio"
                  checked={exportScope === 'all'}
                  onChange={() => setExportScope('all')}
                  className="h-3.5 w-3.5 accent-[#0088FF]"
                />
                <span>Tất cả sản phẩm theo bộ lọc hiện tại</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1">
                <input
                  type="radio"
                  checked={exportScope === 'current'}
                  onChange={() => setExportScope('current')}
                  className="h-3.5 w-3.5 accent-[#0088FF]"
                />
                <span>Sản phẩm trên trang hiện tại</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="h-8 border border-[#0088FF] bg-white px-5 text-[13px] font-medium text-[#0088FF] transition-colors hover:bg-blue-50"
              >
                Thoát
              </button>
              <button
                type="button"
                onClick={handleExportProducts}
                className="h-8 bg-[#0088FF] px-5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
              >
                Xuất file
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="list-toolbar">
        <div className="list-toolbar-actions">
          <input
            ref={importFileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleImportProducts}
          />
          <button
            onClick={() => setShowExportModal(true)}
            disabled={isImporting}
            className="list-action-button"
          >
            <Download size={16} /> Xuất file
          </button>
          <button
            onClick={() => importFileInputRef.current?.click()}
            disabled={isImporting}
            className="list-action-button"
          >
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Nhập file
          </button>
          <div className="list-toolbar-divider"></div>
          <div className="list-link-group">
            <button
              onClick={() => setInfoMessage('Danh sách này đang hiển thị sản phẩm thường theo backend hiện tại.')}
              className="list-link-button"
            >
              Loại sản phẩm
            </button>
            <div className="list-link-separator"></div>
            <button
              onClick={() => setInfoMessage('Combo chưa có luồng backend riêng, mình đang giữ nguyên nút và thông báo trạng thái.')}
              className="list-link-button"
            >
              Combo
            </button>
            <div className="list-link-separator"></div>
            <button
              onClick={() => setInfoMessage('Sản phẩm quy đổi chưa có backend riêng, mình đang giữ nguyên nút và thông báo trạng thái.')}
              className="list-link-button"
            >
              Sản phẩm quy đổi
            </button>
          </div>
        </div>
        <div className="list-primary-split">
          <button
            onClick={() => navigate('/products/create')}
            className="list-primary-split-main"
          >
            <Plus size={16} /> Thêm sản phẩm
          </button>
          <button
            onClick={() => navigate('/products/create')}
            className="list-primary-split-toggle"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {false && infoMessage ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-700">
            {infoMessage}
          </div>
        ) : null}

        {false && listError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {listError}
          </div>
        ) : null}

        <div className="ui-card overflow-hidden">
          <div className="flex border-b border-slate-200 pr-5 pt-2">
            <button
              className={`border-b-2 px-4 py-3 text-[14px] font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-[#0088FF] text-[#0088FF]'
                  : 'border-transparent text-slate-600 hover:text-[#0088FF]'
              }`}
              onClick={() => setActiveTab('all')}
            >
              Tất cả sản phẩm
            </button>
          </div>

          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <div className="relative flex-1">
              {isRefreshingList ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" size={16} />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              )}
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm kiếm theo mã sản phẩm, tên sản phẩm, barcode"
                className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-4 text-[13px] transition-colors focus:border-[#0088FF] focus:outline-none"
              />
            </div>

            <div className="flex shrink-0 items-center gap-0">
              <button
                onClick={handleCycleCategoryFilter}
                className="flex min-w-[130px] items-center justify-between gap-2 whitespace-nowrap rounded-l border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Loại sản phẩm</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              <button
                onClick={handleToggleSortOrder}
                className="-ml-px flex min-w-[130px] items-center justify-between gap-2 whitespace-nowrap border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Ngày tạo</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              <button
                onClick={handleCycleBrandFilter}
                className="-ml-px flex min-w-[130px] items-center justify-between gap-2 whitespace-nowrap border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Nhãn hiệu</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>
              <button
                onClick={handleToggleStatusFilter}
                className="-ml-px flex min-w-[130px] items-center justify-between gap-2 whitespace-nowrap rounded-r border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>Bộ lọc khác</span>
                <Filter size={14} className="text-slate-400 shrink-0" />
              </button>
              <button
                onClick={handleSaveFilters}
                className="ml-2 rounded bg-slate-100 px-5 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-200"
              >
                Lưu bộ lọc
              </button>
            </div>
          </div>

          <div className="min-h-[500px] w-full overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[13px] font-semibold text-[#182537]">
                    <th className="w-12 border-r border-slate-100 px-4 py-3 text-center">
                      <Settings size={16} className="mx-auto cursor-pointer text-slate-400 hover:text-slate-600" />
                    </th>
                    <th className="w-10 px-2 py-3 text-center"><input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" /></th>
                    <th className="w-16 px-4 py-3">Ảnh</th>
                    <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                    <th className="px-4 py-3 text-center font-semibold">Loại</th>
                    <th className="mt-1 block px-4 py-3 text-center font-semibold">Nhãn hiệu</th>
                    <th className="px-4 py-3 text-center font-semibold">Có thể bán</th>
                    <th className="px-4 py-3 text-center font-semibold">Tồn kho</th>
                    <th className="flex items-center justify-end gap-1 px-4 py-3 font-semibold">Ngày khởi tạo <div className="flex flex-col"><ChevronDown size={10} className="-mb-1 rotate-180" /><ChevronDown size={10} /></div></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13.5px] text-[#182537]">
                  {visibleProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                        Chưa có sản phẩm phù hợp.
                      </td>
                    </tr>
                  ) : (
                    pagedProducts.map((product) => (
                      <tr key={product.id} className="group transition-colors hover:bg-slate-50">
                        <td className="border-r border-slate-100 px-4 py-3 text-center text-slate-400"></td>
                        <td className="px-2 py-3 text-center"><input type="checkbox" className="rounded border-slate-300 text-[#0088FF]" /></td>
                        <td className="px-4 py-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-200">
                            <ImageIcon size={20} />
                          </div>
                        </td>
                        <td
                          className="cursor-pointer px-4 py-3 font-medium text-[#0088FF] hover:underline"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setDetailTab('stock');
                          }}
                        >
                          {product.name}
                        </td>
                        <td className="px-4 py-3 text-center">{product.typeName !== '---' ? product.typeName : ''}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{product.brandName !== '---' ? product.brandName : ''}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="font-semibold text-[#182537]">{formatNumber(product.available)}</div>
                          <div className="mt-0.5 text-[12px] text-slate-500">(1 phiên bản)</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="font-semibold text-[#182537]">{formatNumber(product.instock)}</div>
                          <div className="mt-0.5 text-[12px] text-slate-500">(1 phiên bản)</div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatDate(product.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          <div className="flex min-h-16 flex-wrap items-center justify-end gap-x-6 gap-y-3 border-t border-slate-200 bg-white px-5 py-4 text-[13px] text-[#182537]">
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Hiển thị</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-8 min-w-[68px] appearance-none border border-slate-300 bg-white px-3 pr-8 text-[#182537] transition-colors focus:border-[#0088FF] focus:outline-none"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
              <span className="text-slate-600">kết quả</span>
            </div>
            <div className="text-slate-600">
              Từ {pageStart} đến {pageEnd} trên tổng {visibleProducts.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage === 1}
                className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0088FF] disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-300"
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center bg-[#0088FF] font-medium text-white"
                aria-label={`Trang ${safePage}`}
              >
                {safePage}
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={safePage === totalPages}
                className="flex h-7 w-7 items-center justify-center text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#0088FF] disabled:cursor-not-allowed disabled:bg-transparent disabled:text-slate-300"
                aria-label="Trang sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
