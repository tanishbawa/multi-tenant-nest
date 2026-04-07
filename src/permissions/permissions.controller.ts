import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionEntity } from './entities/permissions.entity';
import { PermissionsCreateDto } from './dto/permissions.create.dto';
import { PermissionsUpdateDto } from './dto/permissions.update.dto';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getAllPermissions(): Promise<PermissionEntity[]> {
    return await this.permissionsService.getAllPermissions();
  }

  @Post()
  async createPermission(
    @Body() permissionCreateDto: PermissionsCreateDto,
  ): Promise<PermissionEntity> {
    return await this.permissionsService.createPermission(permissionCreateDto);
  }

  @Put(':id')
  async editPermission(
    @Param('id') id: string,
    @Body() permissionEditDto: PermissionsUpdateDto,
  ): Promise<{ message: string }> {
    return await this.permissionsService.editPermission(permissionEditDto, id);
  }

  @Delete(':id')
  async deletePermission(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return await this.permissionsService.deletePermission(id);
  }
}
