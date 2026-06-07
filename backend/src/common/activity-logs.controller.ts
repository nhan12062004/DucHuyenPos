import { Controller, Headers, Post } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service.js';
import { decodeActorHeader } from './actor-header.js';

@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Post('login')
  async logLogin(
    @Headers('x-actor-id') actorId?: string,
    @Headers('x-actor-name') actorName?: string,
  ) {
    const actor = { actorId, actorName: decodeActorHeader(actorName) };

    await this.activityLogsService.logActivity({
      actor,
      action: 'login',
      entityType: 'auth',
      description: `${this.activityLogsService.getActorName(actor)} vừa đăng nhập hệ thống`,
      metadata: {
        source: 'frontend',
      },
    });

    return { success: true };
  }
}
