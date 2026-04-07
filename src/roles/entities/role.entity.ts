import { PermissionEntity } from 'src/permissions/entities/permissions.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  role_name: string;

  @Column()
  tenant_id: number;

  @Column({ default: false })
  built_in: boolean;

  @ManyToMany(() => PermissionEntity, (permission) => permission.id)
  @JoinTable({ name: 'permissions_id' })
  permissions: PermissionEntity[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
