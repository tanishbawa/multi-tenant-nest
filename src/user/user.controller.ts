import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { UserCreateDto } from './dto/user.create.dto';
import { User } from './entities/user.entity';
import { UserGetDto } from './dto/user.get.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('allUsersEmail')
  async getAllUsersEmail(): Promise<User[]> {
    return await this.userService.getAllUsersEmail();
  }

  @Post('details')
  getUserDetails(@Body() userGetDto: UserGetDto): Promise<User | null> {
    return this.userService.getUserDetails(userGetDto);
  }

  @Post('addUser')
  async addUser(@Body() userDto: UserCreateDto): Promise<User> {
    return await this.userService.addUser(userDto);
  }
}
