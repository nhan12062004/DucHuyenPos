import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service.js';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from './dto/sales-order.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  findAll(@Query() query: PaginationDto & { from_date?: string; to_date?: string; payment_status?: string }) {
    return this.salesOrdersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSalesOrderDto) {
    return this.salesOrdersService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesOrdersService.update(id, dto);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.salesOrdersService.cancel(id);
  }
}
