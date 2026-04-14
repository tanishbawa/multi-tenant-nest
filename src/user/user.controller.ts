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
import { PERMISSION_NAMES } from 'src/config/constants';
import { PaginatedResult } from 'src/config/types';
import { UserQueryDto } from './dto/user.query.dto';

@ApiTags('User')
@ApiBearerAuth()
@Controller('user')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('allUsers')
  @Permissions(PERMISSION_NAMES.READ_USER)
  async getAllUsers(
    @Req() req: { user?: { userId?: string } },
    @Query() query: UserQueryDto,
  ): Promise<PaginatedResult<User>> {
    return await this.userService.getAllUsers(query, req.user?.userId ?? '');
  }

  @Get(':id')
  @Permissions(PERMISSION_NAMES.READ_USER)
  getUserDetails(@Param('id') id: string): Promise<User | null> {
    return this.userService.getUserDetails(id);
  }

  @Post()
  @Permissions(PERMISSION_NAMES.CREATE_USER)
  async addUser(
    @Body() userDto: UserCreateDto,
  ): Promise<{ message: string; user_id: string }> {
    return await this.userService.addUser(userDto);
  }

  @Put(':id')
  @Permissions(PERMISSION_NAMES.UPDATE_USER)
  async updateUser(
    @Param('id') id: string,
    @Body() userUpdateDto: UserUpdateDto,
  ): Promise<{ message: string }> {
    return await this.userService.updateUser(userUpdateDto, id);
  }

  @Delete(':id')
  @Permissions(PERMISSION_NAMES.DELETE_USER)
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    return await this.userService.deleteUser(id);
  }
}
