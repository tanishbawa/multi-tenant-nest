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
import { RoleEntity } from '../../roles/entities/role.entity';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';

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

  @Column({ type: 'int', default: 1 })
  tenant_id: number;

  @Column({ nullable: true, select: false })
  password_hash: string;

  @ManyToOne(() => RoleEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
