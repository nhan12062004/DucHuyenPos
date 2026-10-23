import {
  IsArray, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesReturnItemDto {
  @IsOptional()
  @IsUUID()
  sales_order_item_id?: string;

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
  unit_name?: string = 'cai';

  @IsNumber()
  @Min(0.01)
  quantity: number = 1;

  @IsNumber()
  @Min(0)
  unit_price: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  line_total?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateSalesReturnDto {
  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @IsOptional()
  @IsUUID()
  sales_order_id?: string;

  @IsOptional()
  @IsUUID()
  customer_id?: string;

  @IsOptional()
  @IsString()
  return_no?: string;

  @IsOptional()
  @IsIn(['pending', 'approved', 'refunded', 'completed', 'cancelled'])
  status?: string = 'pending';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refund_amount?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnItemDto)
  items: CreateSalesReturnItemDto[] = [];
}

export class UpdateSalesReturnDto {
  @IsOptional()
  @IsIn(['pending', 'approved', 'refunded', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refund_amount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
