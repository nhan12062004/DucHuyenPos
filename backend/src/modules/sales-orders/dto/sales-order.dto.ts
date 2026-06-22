import {
  IsString, IsOptional, IsNumber, IsIn, IsArray, ValidateNested, Min, IsUUID, IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DELIVERY_METHODS, DELIVERY_STATUSES } from '../delivery-fields.js';

export class CreateSalesOrderItemDto {
  @IsOptional()
  @IsUUID()
  product_id?: string | null;

  @IsString()
  product_name: string = '';

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  unit_name?: string = 'cái';

  @IsNumber()
  @Min(0.01)
  quantity: number = 1;

  @IsNumber()
  @Min(0)
  unit_price: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount?: number = 0;

  @IsOptional()
  @IsNumber()
  line_total?: number = 0;
}

export class CreateSalesOrderDto {
  @IsUUID()
  branch_id: string = '';

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsUUID()
  cashier_id?: string | null;

  @IsOptional()
  @IsString()
  order_no?: string;

  @IsOptional()
  @IsIn(['pos', 'web', 'phone', 'manual'])
  source?: string = 'pos';

  @IsOptional()
  @IsIn(['draft', 'pending', 'completed', 'cancelled'])
  status?: string = 'completed';

  @IsOptional()
  @IsIn(['unpaid', 'partial', 'paid', 'refunded'])
  payment_status?: string = 'unpaid';

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shipping_fee?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax_amount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paid_amount?: number = 0;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  delivery_address?: string;

  @IsOptional()
  @IsIn(DELIVERY_METHODS)
  delivery_method?: string = 'nhan_tai_cua_hang';

  @IsOptional()
  @IsIn(DELIVERY_STATUSES)
  delivery_status?: string;

  @IsOptional()
  @IsDateString()
  delivery_due_at?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items: CreateSalesOrderItemDto[] = [];
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsUUID()
  cashier_id?: string | null;

  @IsOptional()
  @IsString()
  order_no?: string;

  @IsOptional()
  @IsIn(['pos', 'web', 'phone', 'manual'])
  source?: string;

  @IsOptional()
  @IsIn(['draft', 'pending', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsIn(['unpaid', 'partial', 'paid', 'refunded'])
  payment_status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shipping_fee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paid_amount?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  delivery_address?: string;

  @IsOptional()
  @IsIn(DELIVERY_METHODS)
  delivery_method?: string;

  @IsOptional()
  @IsIn(DELIVERY_STATUSES)
  delivery_status?: string;

  @IsOptional()
  @IsDateString()
  delivery_due_at?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items?: CreateSalesOrderItemDto[];
}
