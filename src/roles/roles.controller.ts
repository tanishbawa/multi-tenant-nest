import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleEntity } from './entities/role.entity';
import { RoleCreateDto } from './dto/role.create.dto';
import { RoleUpdateDto } from './dto/role.update.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async getAllRoles(): Promise<RoleEntity[]> {
    return await this.rolesService.getAllRoles();
  }

  @Post()
  async addRole(@Body() roleAddDto: RoleCreateDto): Promise<RoleEntity> {
    return await this.rolesService.addRole(roleAddDto);
  }

  @Put(':id')
  async editRole(
    @Param('id') id: string,
    @Body() roleEditDto: RoleUpdateDto,
  ): Promise<{ message: string }> {
    return await this.rolesService.editRole(roleEditDto, id);
  }

  @Delete(':id')
  async deleteRole(@Param('id') id: string): Promise<{ message: string }> {
    return await this.rolesService.deleteRole(id);
  }
}
