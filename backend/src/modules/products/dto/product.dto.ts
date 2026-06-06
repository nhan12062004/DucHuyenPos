import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsIn,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku: string = '';

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsString()
  @MaxLength(200)
  name: string = '';

  @IsOptional()
  @IsString()
  product_category_id?: string;

  @IsOptional()
  @IsString()
  brand_id?: string;

  @IsOptional()
  @IsString()
  default_supplier_id?: string;

  @IsOptional()
  @IsString()
  unit_name?: string = 'cái';

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  sale_price: number = 0;

  @IsNumber()
  @Min(0)
  cost_price: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorder_level?: number = 0;

  @IsOptional()
  @IsBoolean()
  track_inventory?: boolean = true;

  @IsOptional()
  @IsBoolean()
  allow_negative_stock?: boolean = false;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string = 'active';
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  product_category_id?: string;

  @IsOptional()
  @IsString()
  brand_id?: string;

  @IsOptional()
  @IsString()
  default_supplier_id?: string;

  @IsOptional()
  @IsString()
  unit_name?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sale_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorder_level?: number;

  @IsOptional()
  @IsBoolean()
  track_inventory?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_negative_stock?: boolean;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
