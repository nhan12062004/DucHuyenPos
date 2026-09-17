import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConsolidatedInvoiceDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  sales_order_ids: string[] = [];

  @IsOptional()
  @IsString()
  note?: string;
}
