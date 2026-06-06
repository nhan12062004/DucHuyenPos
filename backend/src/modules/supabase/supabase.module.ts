import { Module } from '@nestjs/common';
import { SupabaseProvider } from './supabase.provider.js';

@Module({
  providers: [SupabaseProvider],
  exports: [SupabaseProvider],
})
export class SupabaseModule {}
