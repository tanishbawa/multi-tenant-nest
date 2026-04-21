import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserCreateDto } from './dto/user.create.dto';
import { UserUpdateDto } from './dto/user.update.dto';
import { User } from './entities/user.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { ApiTenantHeader } from 'src/auth/decorators/api-tenant-header.decorator';
import { TenantId } from 'src/auth/decorators/tenant-id.decorator';
import { TenantGuard } from 'src/auth/tenant.guard';
import { PERMISSION_NAMES } from 'src/config/constants';
import { PaginatedResult } from 'src/config/types';
import { UserQueryDto } from './dto/user.query.dto';
import { ApiSuccessResponse } from 'src/config/api-response';

@ApiTags('User')
@ApiBearerAuth()
@ApiTenantHeader()
@Controller('user')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('allUsers')
  @Permissions(PERMISSION_NAMES.READ_USER)
  async getAllUsers(
    @Req() req: { user?: { userId?: string } },
    @TenantId() tenantId: string,
    @Query() query: UserQueryDto,
  ): Promise<ApiSuccessResponse<PaginatedResult<User>>> {
    const users = await this.userService.getAllUsers(
      query,
      req.user?.userId ?? '',
      tenantId,
    );
    return {
      message: 'Users fetched successfully',
      data: users,
    };
  }

  @Get(':id')
  @Permissions(PERMISSION_NAMES.READ_USER)
  async getUserDetails(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string } },
    @TenantId() tenantId: string,
  ): Promise<ApiSuccessResponse<User>> {
    const user = await this.userService.getUserDetails(
      id,
      req.user?.userId ?? '',
      tenantId,
    );
    return {
      message: 'User fetched successfully',
      data: user,
    };
  }

  @Post()
  @Permissions(PERMISSION_NAMES.CREATE_USER)
  async addUser(
    @Body() userDto: UserCreateDto,
    @Req() req: { user?: { userId?: string } },
    @TenantId() tenantId: string,
  ): Promise<ApiSuccessResponse<{ user_id: string }>> {
    const created = await this.userService.addUser(
      userDto,
      req.user?.userId ?? '',
      tenantId,
    );
    return {
      message: created.message,
      data: {
        user_id: created.user_id,
      },
    };
  }

  @Put(':id')
  @Permissions(PERMISSION_NAMES.UPDATE_USER)
  async updateUser(
    @Param('id') id: string,
    @Body() userUpdateDto: UserUpdateDto,
    @Req() req: { user?: { userId?: string } },
    @TenantId() tenantId: string,
  ): Promise<ApiSuccessResponse<{ user_id: string }>> {
    const updated = await this.userService.updateUser(
      userUpdateDto,
      id,
      req.user?.userId ?? '',
      tenantId,
    );
    return {
      message: updated.message,
      data: {
        user_id: id,
      },
    };
  }

  @Delete(':id')
  @Permissions(PERMISSION_NAMES.DELETE_USER)
  async deleteUser(
    @Param('id') id: string,
    @Req() req: { user?: { userId?: string } },
    @TenantId() tenantId: string,
  ): Promise<ApiSuccessResponse<{ user_id: string }>> {
    const deleted = await this.userService.deleteUser(
      id,
      req.user?.userId ?? '',
      tenantId,
    );
    return {
      message: deleted.message,
      data: {
        user_id: id,
      },
    };
  }
}
