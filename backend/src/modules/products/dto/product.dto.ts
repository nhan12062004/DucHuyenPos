import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsIn,
  IsArray,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductAttributeDto {
  @IsString()
  @MaxLength(80)
  name: string = '';

  @IsString()
  @MaxLength(120)
  value: string = '';
}

export class ProductUnitConversionDto {
  @IsString()
  @MaxLength(50)
  unit_name: string = '';

  @IsNumber()
  @Min(0.0001)
  conversion_rate: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sale_price?: number = 0;

  @IsOptional()
  @IsString()
  barcode?: string;
}

export class ProductInitialInventoryDto {
  @IsUUID()
  branch_id: string = '';

  @IsNumber()
  @Min(0)
  opening_qty: number = 0;

  @IsNumber()
  @Min(0)
  opening_cost: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorder_point?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_stock?: number;
}

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
  default_branch_id?: string;

  @IsOptional()
  @IsString()
  unit_name?: string = 'cái';

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesale_price?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  weight_unit?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  tax_applicable?: boolean = false;

  @IsOptional()
  @IsBoolean()
  warranty_applicable?: boolean = false;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[] = [];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductUnitConversionDto)
  unit_conversions?: ProductUnitConversionDto[] = [];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductInitialInventoryDto)
  initial_inventory?: ProductInitialInventoryDto[] = [];

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
  default_branch_id?: string;

  @IsOptional()
  @IsString()
  unit_name?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesale_price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  weight_unit?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  tax_applicable?: boolean;

  @IsOptional()
  @IsBoolean()
  warranty_applicable?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductUnitConversionDto)
  unit_conversions?: ProductUnitConversionDto[];

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
