import { RefreshToken } from 'src/auth/entities/refresh-token.entity';
import { TenantEntity } from 'src/tenant/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserRoleEntity } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'int', nullable: true })
  age: number | null;

  @Unique(['email'])
  @Column()
  email: string;

  @Column()
  phone_no: string;

  @Column()
  address: string;

  @Column({ default: true })
  is_active: boolean;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: TenantEntity;

  @Column({ nullable: true, select: false })
  password_hash: string;

  @OneToMany(() => UserRoleEntity, (ur) => ur.user)
  userRoles: UserRoleEntity[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
