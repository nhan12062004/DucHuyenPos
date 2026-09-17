import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { ConsolidatedInvoicesController } from './consolidated-invoices.controller.js';
import { ConsolidatedInvoicesService } from './consolidated-invoices.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [ConsolidatedInvoicesController],
  providers: [ConsolidatedInvoicesService],
})
export class ConsolidatedInvoicesModule {}
