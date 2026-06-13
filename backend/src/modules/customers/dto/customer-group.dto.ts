import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateCustomerGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsString()
  @MaxLength(200)
  name: string = '';

  @IsOptional()
  @IsIn(['fixed', 'dynamic'])
  group_type?: string = 'fixed';

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['any', 'all'])
  condition_match_mode?: string;

  @IsOptional()
  @IsIn(['profile', 'purchase', 'points'])
  condition_group?: string;

  @IsOptional()
  @IsIn(['retail', 'wholesale'])
  default_price_type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_rate?: number = 0;

  @IsOptional()
  @IsIn(['cash', 'bank_transfer', 'debt'])
  payment_method?: string;
}

export class UpdateCustomerGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsIn(['fixed', 'dynamic'])
  group_type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['any', 'all'])
  condition_match_mode?: string;

  @IsOptional()
  @IsIn(['profile', 'purchase', 'points'])
  condition_group?: string;

  @IsOptional()
  @IsIn(['retail', 'wholesale'])
  default_price_type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_rate?: number;

  @IsOptional()
  @IsIn(['cash', 'bank_transfer', 'debt'])
  payment_method?: string;
}
