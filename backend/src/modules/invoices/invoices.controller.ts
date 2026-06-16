import {
  Body, Controller, Get, Headers, Param, Post, Put, Query,
} from '@nestjs/common';
import { decodeActorHeader } from '../../common/actor-header.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto.js';
import { InvoicesService } from './invoices.service.js';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.invoicesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateInvoiceDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.invoicesService.create(dto, { actorId, actorName: decodeActorHeader(actorName) });
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.invoicesService.update(id, dto, { actorId, actorName: decodeActorHeader(actorName) });
  }

  @Put(':id/print')
  print(
    @Param('id') id: string,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.invoicesService.print(id, { actorId, actorName: decodeActorHeader(actorName) });
  }
}
