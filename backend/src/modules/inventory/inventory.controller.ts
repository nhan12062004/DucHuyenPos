import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { CreateInventoryAdjustmentDto } from './dto/inventory-adjustment.dto.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getStock(@Query() query: PaginationDto & { branch_id?: string }) {
    return this.inventoryService.getStock(query);
  }

  @Get('transactions')
  getTransactions(@Query() query: PaginationDto & { branch_id?: string; product_id?: string }) {
    return this.inventoryService.getTransactions(query);
  }

  @Get('branches')
  getBranches() {
    return this.inventoryService.getBranches();
  }

  @Post('adjustments')
  createAdjustment(@Body() dto: CreateInventoryAdjustmentDto) {
    return this.inventoryService.createAdjustment(dto);
  }
}
