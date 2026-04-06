import { Body, Controller, Get, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleEntity } from './entities/role.entity';
import { RoleAddDto } from './dto/role-add.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('getAllRoles')
  async getAllRoles(): Promise<RoleEntity[]> {
    return await this.rolesService.getAllRoles();
  }

  @Post('addRole')
  async addRole(@Body() roleAddDto: RoleAddDto): Promise<RoleEntity> {
    return await this.rolesService.addRole(roleAddDto);
  }
}
