import {
  Controller, Get, Post, Put, Param, Body, Query, Headers,
} from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service.js';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from './dto/sales-order.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { decodeActorHeader } from '../../common/actor-header.js';

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
  create(
    @Body() dto: CreateSalesOrderDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.salesOrdersService.create(dto, { actorId, actorName: decodeActorHeader(actorName) });
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.salesOrdersService.update(id, dto, { actorId, actorName: decodeActorHeader(actorName) });
  }

  @Put(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.salesOrdersService.cancel(id, { actorId, actorName: decodeActorHeader(actorName) });
  }
}
