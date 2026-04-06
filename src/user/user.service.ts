import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserCreateDto } from './dto/user.create.dto';
import { UserUpdateDto } from './dto/user.update.dto';
import { type QueryDeepPartialEntity, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAllUsersEmail(): Promise<User[]> {
    return await this.userRepository.find({
      select: ['id', 'email'],
    });
  }

  async getUserDetails(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async addUser(userDto: UserCreateDto): Promise<User> {
    const creatdUser = this.userRepository.create(userDto);

    if (
      await this.userRepository.findOne({ where: { email: userDto.email } })
    ) {
      throw new BadRequestException('Email already exists');
    }

    const response = await this.userRepository.save(creatdUser);

    return response;
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.delete(id);

    return { message: 'User deleted successfully' };
  }

  async updateUser(
    userUpdateDto: UserUpdateDto,
    id: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(
      user.id,
      userUpdateDto as QueryDeepPartialEntity<User>,
    );

    return { message: 'User updated successfully' };
  }
}
