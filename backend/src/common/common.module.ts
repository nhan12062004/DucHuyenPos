import { Global, Module } from '@nestjs/common';
import { SupabaseModule } from '../modules/supabase/supabase.module.js';
import { ActivityLogsController } from './activity-logs.controller.js';
import { ActivityLogsService } from './activity-logs.service.js';

@Global()
@Module({
  imports: [SupabaseModule],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService],
  exports: [ActivityLogsService],
})
export class CommonModule {}
