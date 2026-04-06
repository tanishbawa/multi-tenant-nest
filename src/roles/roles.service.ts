import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { Repository } from 'typeorm';
import { RoleCreateDto } from './dto/role.create.dto';
import { RoleUpdateDto } from './dto/role.update.dto';
import { QueryDeepPartialEntity } from 'typeorm/browser';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async getAllRoles(): Promise<RoleEntity[]> {
    return await this.roleRepository.find();
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

    await this.roleRepository.update(
      id,
      roleEditDto as QueryDeepPartialEntity<RoleEntity>,
    );

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
