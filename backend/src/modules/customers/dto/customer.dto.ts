import { IsString, IsOptional, IsEmail, IsIn, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsOptional()
  @IsString()
  code: string = '';

  @IsOptional()
  @IsString()
  customer_group_id?: string;

  @IsString()
  @MaxLength(200)
  full_name: string = '';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  birthdate?: string;

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  tax_code?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string = 'active';
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  customer_group_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  birthdate?: string;

  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  tax_code?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
