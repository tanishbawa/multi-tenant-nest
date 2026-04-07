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

  async editRole(
    roleEditDto: RoleUpdateDto,
    id: string,
  ): Promise<{ message: string }> {
    const role = await this.roleRepository.findOne({
      where: { id: id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissions = await this.permissionRepository.find({
      where: { id: In(roleEditDto.permissions_id || []) },
    });
    if (!permissions) {
      throw new BadRequestException('Permissions not found');
    }

    await this.roleRepository.save({
      id,
      ...roleEditDto,
      permissions: permissions,
    });

    return { message: 'Role updated successfully' };
  }

  async addRole(roleAddDto: RoleCreateDto): Promise<RoleEntity> {
    const role = this.roleRepository.create(roleAddDto);
    if (
      await this.roleRepository.findOne({
        where: { role_name: roleAddDto.role_name },
      })
    ) {
      throw new BadRequestException('Role already exists');
    }

    const permissions = await this.permissionRepository.find({
      where: { id: In(roleAddDto.permissions_id) },
    });
    if (!permissions) {
      throw new BadRequestException('Permissions not found');
    }
    role.permissions = permissions;

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
