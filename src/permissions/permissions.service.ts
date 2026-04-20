import {
  ConflictException,
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
    if (
      await this.permissionRepository.findOne({
        where: { code: permissionCreateDto.code },
      })
    ) {
      throw new ConflictException('Permission already exists');
    }

    const permission = this.permissionRepository.create({
      code: permissionCreateDto.code,
      description: permissionCreateDto.description ?? null,
    });

    return await this.permissionRepository.save(permission);
  }

  async getAllPermissions(): Promise<PermissionEntity[]> {
    return await this.permissionRepository.find();
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

    if (
      permissionEditDto.code !== undefined &&
      permissionEditDto.code !== permission.code
    ) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { code: permissionEditDto.code },
      });
      if (existingPermission && existingPermission.id !== permission.id) {
        throw new ConflictException('Permission already exists');
      }
    }

    await this.permissionRepository.update(id, {
      ...(permissionEditDto.code !== undefined && {
        code: permissionEditDto.code,
      }),
      ...(permissionEditDto.description !== undefined && {
        description: permissionEditDto.description ?? null,
      }),
    });

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
      throw new ConflictException('Permission not deleted');
    }

    return { message: 'Permission deleted successfully' };
  }
}
