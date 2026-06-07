import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../modules/supabase/supabase.constants.js';

export interface ActivityActor {
  actorId?: string;
  actorName?: string | null;
}

export interface ActivityLogInput {
  actor?: ActivityActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  getActorName(actor?: ActivityActor) {
    return actor?.actorName?.trim() || 'Người dùng hệ thống';
  }

  async logActivity(input: ActivityLogInput) {
    const { error } = await this.supabase
      .from('activity_logs')
      .insert({
        actor_id: input.actor?.actorId ?? null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        description: input.description,
        metadata: {
          ...(input.metadata ?? {}),
          actor_name: this.getActorName(input.actor),
        },
      });

    if (error) {
      this.logger.warn(`Unable to write activity log: ${error.message}`);
    }
  }

  async getRecentActivities(limit = 10) {
    const { data, error } = await this.supabase
      .from('activity_logs')
      .select('id, action, entity_type, entity_id, description, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((activity: any) => ({
      id: activity.id,
      action: activity.action,
      entity_type: activity.entity_type,
      entity_id: activity.entity_id,
      description: activity.description,
      actor_name: activity.metadata?.actor_name ?? 'Người dùng hệ thống',
      created_at: activity.created_at,
      metadata: activity.metadata ?? {},
    }));
  }
}
