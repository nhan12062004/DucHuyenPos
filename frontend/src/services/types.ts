/** Shared pagination response type dùng cho tất cả list APIs */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
