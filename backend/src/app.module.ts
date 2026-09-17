import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module.js';
import configuration from './config/configuration.js';
import { HealthModule } from './modules/health/health.module.js';
import { SupabaseModule } from './modules/supabase/supabase.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { SuppliersModule } from './modules/suppliers/suppliers.module.js';
import { SalesOrdersModule } from './modules/sales-orders/sales-orders.module.js';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { StaffModule } from './modules/staff/staff.module.js';
import { InvoicesModule } from './modules/invoices/invoices.module.js';
import { SalesReturnsModule } from './modules/sales-returns/sales-returns.module.js';
import { ConsolidatedInvoicesModule } from './modules/consolidated-invoices/consolidated-invoices.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['backend/.env', '.env'],
      load: [configuration],
    }),
    CommonModule,
    SupabaseModule,
    HealthModule,
    ProductsModule,
    CustomersModule,
    SuppliersModule,
    SalesOrdersModule,
    PurchaseOrdersModule,
    InventoryModule,
    DashboardModule,
    StaffModule,
    InvoicesModule,
    SalesReturnsModule,
    ConsolidatedInvoicesModule,
  ],
})
export class AppModule {}
