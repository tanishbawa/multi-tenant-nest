import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { In, Repository } from 'typeorm';
import { RoleCreateDto } from './dto/role.create.dto';
import { RoleUpdateDto } from './dto/role.update.dto';
import { PermissionEntity } from 'src/permissions/entities/permissions.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  async getAllRoles(): Promise<RoleEntity[]> {
    return await this.roleRepository.find({
      relations: ['permissions'],
    });
  }

  private async resolvePermissionsByIds(
    ids: string[],
  ): Promise<PermissionEntity[]> {
    if (ids.length === 0) {
      return [];
    }
    const permissions = await this.permissionRepository.find({
      where: { id: In(ids) },
    });
    if (permissions.length !== ids.length) {
      throw new BadRequestException('One or more permissions not found');
    }
    return permissions;
  }

  async editRole(
    roleEditDto: RoleUpdateDto,
    id: string,
  ): Promise<{ message: string }> {
    const role = await this.roleRepository.findOne({
      where: { id: id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (roleEditDto.permissions_id !== undefined) {
      role.permissions = await this.resolvePermissionsByIds(
        roleEditDto.permissions_id,
      );
    }

    if (roleEditDto.role_name !== undefined) {
      role.role_name = roleEditDto.role_name;
    }
    if (roleEditDto.built_in !== undefined) {
      role.built_in = roleEditDto.built_in;
    }

    await this.roleRepository.save(role);

    return { message: 'Role updated successfully' };
  }

  async addRole(roleAddDto: RoleCreateDto): Promise<RoleEntity> {
    const existing = await this.roleRepository.findOne({
      where: {
        role_name: roleAddDto.role_name,
      },
    });
    if (existing) {
      throw new BadRequestException('Role already exists');
    }

    const role = this.roleRepository.create({
      role_name: roleAddDto.role_name,
      built_in: roleAddDto.built_in ?? false,
    });

    role.permissions = await this.resolvePermissionsByIds(
      roleAddDto.permissions_id,
    );

    return await this.roleRepository.save(role);
  }

  async deleteRole(id: string): Promise<{ message: string }> {
    const role = await this.roleRepository.findOne({
      where: { id: id },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    await this.roleRepository.delete(id);
    return { message: 'Role deleted successfully' };
  }
}
