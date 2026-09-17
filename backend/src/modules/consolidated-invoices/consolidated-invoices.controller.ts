import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { decodeActorHeader } from '../../common/actor-header.js';
import { ConsolidatedInvoicesService } from './consolidated-invoices.service.js';
import { CreateConsolidatedInvoiceDto } from './dto/consolidated-invoice.dto.js';

@Controller('consolidated-invoices')
export class ConsolidatedInvoicesController {
  constructor(private readonly consolidatedInvoicesService: ConsolidatedInvoicesService) {}

  @Get('eligible')
  findEligible(@Query('customer_id') customerId?: string) {
    return this.consolidatedInvoicesService.findEligible(customerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consolidatedInvoicesService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateConsolidatedInvoiceDto,
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    return this.consolidatedInvoicesService.create(dto, { actorId, actorName: decodeActorHeader(actorName) });
  }
}
