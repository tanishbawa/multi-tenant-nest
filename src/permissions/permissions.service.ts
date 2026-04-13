import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionEntity } from './entities/permissions.entity';
import { Repository } from 'typeorm';
import { PermissionsCreateDto } from './dto/permissions.create.dto';
import { PermissionsUpdateDto } from './dto/permissions.update.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  async createPermission(
    permissionCreateDto: PermissionsCreateDto,
  ): Promise<PermissionEntity> {
    const permission = this.permissionRepository.create(permissionCreateDto);

    if (
      await this.permissionRepository.findOne({
        where: { permission_name: permissionCreateDto.permission_name },
      })
    ) {
      throw new BadRequestException('Permission already exists');
    }

    return await this.permissionRepository.save(permission);
  }

  async getAllPermissions(): Promise<PermissionEntity[]> {
    const permissions = await this.permissionRepository.find();
    if (!permissions) {
      throw new NotFoundException('No permissions found');
    }
    return permissions;
  }

  async editPermission(
    permissionEditDto: PermissionsUpdateDto,
    id: string,
  ): Promise<{ message: string }> {
    const permission = await this.permissionRepository.findOne({
      where: { id: id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.permissionRepository.update(id, permissionEditDto);

    return { message: 'Permission updated successfully' };
  }

  async deletePermission(id: string): Promise<{ message: string }> {
    const permission = await this.permissionRepository.findOne({
      where: { id: id },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.permissionRepository.delete(id);
    if (await this.permissionRepository.findOne({ where: { id: id } })) {
      throw new BadRequestException('Permission not deleted');
    }

    return { message: 'Permission deleted successfully' };
  }
}
