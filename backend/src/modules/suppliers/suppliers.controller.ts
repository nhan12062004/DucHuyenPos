import {
  Controller, Get, Post, Put, Delete, Param, Body, Query,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.suppliersService.findAll(query);
  }

  @Get('debt-summary')
  getDebtSummary() {
    return this.suppliersService.getDebtSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
