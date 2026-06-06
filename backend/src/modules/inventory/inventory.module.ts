import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

@Module({
  imports: [SupabaseModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
