import {
  IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryAdjustmentItemDto {
  @IsUUID()
  product_id: string = '';

  @IsNumber()
  @Min(0)
  actual_qty: number = 0;
}

export class CreateInventoryAdjustmentDto {
  @IsUUID()
  branch_id: string = '';

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryAdjustmentItemDto)
  items: InventoryAdjustmentItemDto[] = [];
}
