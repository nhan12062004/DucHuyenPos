import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  sales_order_id: string = '';

  @IsOptional()
  @IsString()
  invoice_no?: string;

  @IsOptional()
  @IsIn(['retail', 'vat', 'proforma'])
  invoice_type?: string = 'retail';

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsIn(['draft', 'issued', 'printed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
