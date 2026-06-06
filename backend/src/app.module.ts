import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module.js';
import configuration from './config/configuration.js';
import { HealthModule } from './modules/health/health.module.js';
import { SupabaseModule } from './modules/supabase/supabase.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CommonModule,
    SupabaseModule,
    HealthModule,
  ],
})
export class AppModule {}
