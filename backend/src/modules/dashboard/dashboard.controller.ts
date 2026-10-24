import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(
    @Query('branch_id') branchId?: string,
    @Query('top_products_days') topProductsDays?: string,
    @Query('summary_only') summaryOnly?: string,
  ) {
    return this.dashboardService.getStats(
      branchId,
      topProductsDays ? parseInt(topProductsDays, 10) : 7,
      summaryOnly === 'true',
    );
  }

  @Get('top-products')
  getTopProducts(
    @Query('days') days?: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.dashboardService.getTopProducts(days ? parseInt(days, 10) : 7, branchId);
  }

  @Get('inventory-summary')
  getInventorySummary(@Query('branch_id') branchId?: string) {
    return this.dashboardService.getInventorySummary(branchId);
  }

  @Get('revenue-chart')
  getRevenueChart(
    @Query('days') days?: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.dashboardService.getRevenueChart(days ? parseInt(days, 10) : 30, branchId);
  }
}
