import {
  IsString, IsOptional, IsNumber, IsIn, IsArray, ValidateNested, Min, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesOrderItemDto {
  @IsUUID()
  product_id: string = '';

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items: CreateSalesOrderItemDto[] = [];
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsIn(['draft', 'pending', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsIn(['unpaid', 'partial', 'paid', 'refunded'])
  payment_status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paid_amount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
