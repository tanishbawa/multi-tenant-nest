import { TenantEntity } from 'src/tenant/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WebhookEndpointEntity } from './webhook-endpoint.entity';

export type WebhookDeliveryStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

@Entity('webhook_deliveries')
export class WebhookDeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  @ManyToOne(() => WebhookEndpointEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'endpoint_id' })
  endpoint: WebhookEndpointEntity;

  @Column()
  event_type: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 32 })
  status: WebhookDeliveryStatus;

  @Column({ type: 'int', default: 0 })
  attempt_count: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_attempt_at: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
