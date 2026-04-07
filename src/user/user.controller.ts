import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserCreateDto } from './dto/user.create.dto';
import { UserUpdateDto } from './dto/user.update.dto';
import { User } from './entities/user.entity';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('allUsers')
  async getAllUsers(): Promise<User[]> {
    return await this.userService.getAllUsers();
  }

  @Get(':id')
  getUserDetails(@Param('id') id: string): Promise<User | null> {
    return this.userService.getUserDetails(id);
  }

  @Post()
  async addUser(@Body() userDto: UserCreateDto): Promise<User> {
    return await this.userService.addUser(userDto);
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() userUpdateDto: UserUpdateDto,
  ): Promise<{ message: string }> {
    return await this.userService.updateUser(userUpdateDto, id);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    return await this.userService.deleteUser(id);
  }
}
