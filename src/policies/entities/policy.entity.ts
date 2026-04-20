import { TenantEntity } from 'src/tenant/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type PolicyEffect = 'ALLOW' | 'DENY';

@Entity('policies')
export class PolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  @Column()
  name: string;

  @Column()
  resource: string;

  @Column()
  action: string;

  @Column({ type: 'varchar', length: 16 })
  effect: PolicyEffect;

  @Column({ type: 'jsonb' })
  condition: Record<string, unknown>;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
