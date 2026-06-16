import {
  Body, Controller, Get, Headers, Param, Post, Put, Query,
} from '@nestjs/common';
import { decodeActorHeader } from '../../common/actor-header.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { CreateSalesReturnDto, UpdateSalesReturnDto } from './dto/sales-return.dto.js';
import { SalesReturnsService } from './sales-returns.service.js';

@Controller('sales-returns')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.salesReturnsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesReturnsService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateSalesReturnDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.salesReturnsService.create(dto, { actorId, actorName: decodeActorHeader(actorName) });
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesReturnDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.salesReturnsService.update(id, dto, { actorId, actorName: decodeActorHeader(actorName) });
  }

  @Put(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.salesReturnsService.cancel(id, { actorId, actorName: decodeActorHeader(actorName) });
  }
}
