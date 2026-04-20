import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleEntity } from './entities/role.entity';
import { RoleCreateDto } from './dto/role.create.dto';
import { RoleUpdateDto } from './dto/role.update.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { PERMISSION_NAMES } from 'src/config/constants';
import { ApiSuccessResponse } from 'src/config/api-response';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions(PERMISSION_NAMES.READ_ROLE)
  async getAllRoles(): Promise<ApiSuccessResponse<RoleEntity[]>> {
    const roles = await this.rolesService.getAllRoles();
    return {
      message: 'Roles fetched successfully',
      data: roles,
    };
  }

  @Post()
  @Permissions(PERMISSION_NAMES.CREATE_ROLE)
  async addRole(
    @Body() roleAddDto: RoleCreateDto,
  ): Promise<ApiSuccessResponse<RoleEntity>> {
    const role = await this.rolesService.addRole(roleAddDto);
    return {
      message: 'Role created successfully',
      data: role,
    };
  }

  @Put(':id')
  @Permissions(PERMISSION_NAMES.UPDATE_ROLE)
  async editRole(
    @Param('id') id: string,
    @Body() roleEditDto: RoleUpdateDto,
  ): Promise<ApiSuccessResponse<{ role_id: string }>> {
    const updated = await this.rolesService.editRole(roleEditDto, id);
    return {
      message: updated.message,
      data: {
        role_id: id,
      },
    };
  }

  @Delete(':id')
  @Permissions(PERMISSION_NAMES.DELETE_ROLE)
  async deleteRole(
    @Param('id') id: string,
  ): Promise<ApiSuccessResponse<{ role_id: string }>> {
    const deleted = await this.rolesService.deleteRole(id);
    return {
      message: deleted.message,
      data: {
        role_id: id,
      },
    };
  }
}
