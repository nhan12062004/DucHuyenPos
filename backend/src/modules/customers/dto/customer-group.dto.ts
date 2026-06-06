import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
