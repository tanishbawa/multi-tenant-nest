import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { RoleEntity } from '../../roles/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  age: string;

  @Unique(['email'])
  @Column()
  email: string;

  @Column()
  phone_no: string;

  @Column()
  address: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true, select: false })
  password_hash: string;

  @Column({ type: 'text', nullable: true, select: false })
  refresh_token_hash: string | null;

  @ManyToOne(() => RoleEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role: RoleEntity;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
