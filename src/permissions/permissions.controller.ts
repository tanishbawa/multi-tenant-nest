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
import { PermissionsService } from './permissions.service';
import { PermissionEntity } from './entities/permissions.entity';
import { PermissionsCreateDto } from './dto/permissions.create.dto';
import { PermissionsUpdateDto } from './dto/permissions.update.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { PERMISSION_NAMES } from 'src/config/constants';
import { ApiSuccessResponse } from 'src/config/api-response';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions(PERMISSION_NAMES.READ_PERMISSION)
  async getAllPermissions(): Promise<ApiSuccessResponse<PermissionEntity[]>> {
    const permissions = await this.permissionsService.getAllPermissions();
    return {
      message: 'Permissions fetched successfully',
      data: permissions,
    };
  }

  @Post()
  @Permissions(PERMISSION_NAMES.CREATE_PERMISSION)
  async createPermission(
    @Body() permissionCreateDto: PermissionsCreateDto,
  ): Promise<ApiSuccessResponse<PermissionEntity>> {
    const permission =
      await this.permissionsService.createPermission(permissionCreateDto);
    return {
      message: 'Permission created successfully',
      data: permission,
    };
  }

  @Put(':id')
  @Permissions(PERMISSION_NAMES.UPDATE_PERMISSION)
  async editPermission(
    @Param('id') id: string,
    @Body() permissionEditDto: PermissionsUpdateDto,
  ): Promise<ApiSuccessResponse<{ permission_id: string }>> {
    const updated = await this.permissionsService.editPermission(
      permissionEditDto,
      id,
    );
    return {
      message: updated.message,
      data: {
        permission_id: id,
      },
    };
  }

  @Delete(':id')
  @Permissions(PERMISSION_NAMES.DELETE_PERMISSION)
  async deletePermission(
    @Param('id') id: string,
  ): Promise<ApiSuccessResponse<{ permission_id: string }>> {
    const deleted = await this.permissionsService.deletePermission(id);
    return {
      message: deleted.message,
      data: {
        permission_id: id,
      },
    };
  }
}
