import {
  IsString, IsOptional, IsNumber, IsIn, IsArray, ValidateNested, Min, IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderItemDto {
  @IsUUID()
  product_id: string = '';

  @IsString()
  product_name: string = '';

  @IsNumber()
  @Min(0.01)
  quantity: number = 1;

  @IsNumber()
  @Min(0)
  unit_cost: number = 0;

  @IsOptional()
  @IsNumber()
  line_total?: number = 0;
}

export class CreatePurchaseOrderDto {
  @IsUUID()
  branch_id: string = '';

  @IsUUID()
  supplier_id: string = '';

  @IsOptional()
  @IsString()
  order_no?: string;

  @IsOptional()
  @IsIn(['draft', 'ordered', 'receiving', 'received', 'cancelled'])
  status?: string = 'draft';

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paid_amount?: number = 0;

  @IsOptional()
  @IsIn(['unpaid', 'partial', 'paid'])
  payment_status?: string;

  @IsOptional()
  @IsIn(['cash', 'bank_transfer', 'card', 'ewallet', 'other'])
  payment_method?: string = 'cash';

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  expected_delivery_at?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[] = [];
}

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsIn(['draft', 'ordered', 'receiving', 'received', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsIn(['unpaid', 'partial', 'paid'])
  payment_status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paid_amount?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
