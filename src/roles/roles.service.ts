import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { In, Repository } from 'typeorm';
import { RoleCreateDto } from './dto/role.create.dto';
import { RoleUpdateDto } from './dto/role.update.dto';
import { PermissionEntity } from 'src/permissions/entities/permissions.entity';
import { TenantEntity } from 'src/tenant/entities/tenant.entity';

const RESERVED_BUILTIN_CODES = new Set(['OWNER', 'ADMIN', 'USER']);

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
  ) {}

  async getAllRoles(): Promise<RoleEntity[]> {
    return await this.roleRepository.find({
      relations: ['tenant', 'permissions'],
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
      throw new NotFoundException('One or more permissions not found');
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

    if (roleEditDto.name !== undefined) {
      role.name = roleEditDto.name;
    }

    await this.roleRepository.save(role);

    return { message: 'Role updated successfully' };
  }

  async addRole(roleAddDto: RoleCreateDto): Promise<RoleEntity> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: roleAddDto.tenant_id },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const normalizedCode = roleAddDto.code.trim().toUpperCase();
    const isBuiltIn = roleAddDto.built_in === true;

    if (isBuiltIn && !RESERVED_BUILTIN_CODES.has(normalizedCode)) {
      throw new BadRequestException(
        'Built-in role code must be OWNER, ADMIN, or USER',
      );
    }
    if (!isBuiltIn && RESERVED_BUILTIN_CODES.has(normalizedCode)) {
      throw new BadRequestException('Reserved role code');
    }

    const existing = await this.roleRepository.findOne({
      where: {
        tenant: { id: roleAddDto.tenant_id },
        code: normalizedCode,
      },
    });
    if (existing) {
      throw new ConflictException('Role already exists for this tenant');
    }

    const role = this.roleRepository.create({
      tenant,
      code: normalizedCode,
      name: roleAddDto.name,
      built_in: isBuiltIn,
      permissions: await this.resolvePermissionsByIds(
        roleAddDto.permissions_id,
      ),
    });

    return await this.roleRepository.save(role);
  }

  async deleteRole(id: string): Promise<{ message: string }> {
    const role = await this.roleRepository.findOne({
      where: { id: id },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.built_in) {
      throw new BadRequestException('Built-in roles cannot be deleted');
    }
    await this.roleRepository.delete(id);
    return { message: 'Role deleted successfully' };
  }
}
