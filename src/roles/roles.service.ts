import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { Repository } from 'typeorm';
import { RoleAddDto } from './dto/role-add.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async addRole(roleAddDto: RoleAddDto): Promise<RoleEntity> {
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

  async getAllRoles(): Promise<RoleEntity[]> {
    return await this.roleRepository.find();
  }
}
