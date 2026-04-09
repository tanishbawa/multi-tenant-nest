import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserCreateDto } from './dto/user.create.dto';
import { UserUpdateDto } from './dto/user.update.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleEntity } from '../roles/entities/role.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async getUserDetails(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: id },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async addUser(
    userDto: UserCreateDto,
  ): Promise<{ message: string; user_id: string }> {
    if (
      await this.userRepository.findOne({ where: { email: userDto.email } })
    ) {
      throw new BadRequestException('Email already exists');
    }

    const role = await this.roleRepository.findOne({
      where: { id: userDto.role_id },
    });
    if (!role) {
      throw new BadRequestException('Role not found');
    }

    const passwordHash: string = await bcrypt.hash(userDto.password, 10);

    const createdUser = this.userRepository.create({
      ...userDto,
      role,
      password_hash: passwordHash,
    });

    const savedUser = await this.userRepository.save(createdUser);

    return { message: 'User created successfully', user_id: savedUser.id };
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
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (userUpdateDto.role_id !== undefined) {
      const role = await this.roleRepository.findOne({
        where: { id: userUpdateDto.role_id },
      });
      if (!role) {
        throw new BadRequestException('Role not found');
      }
      user.role = role;
    }

    if (userUpdateDto.name !== undefined) user.name = userUpdateDto.name;
    if (userUpdateDto.age !== undefined) user.age = userUpdateDto.age;
    if (userUpdateDto.email !== undefined) user.email = userUpdateDto.email;
    if (userUpdateDto.phone_no !== undefined)
      user.phone_no = userUpdateDto.phone_no;
    if (userUpdateDto.address !== undefined)
      user.address = userUpdateDto.address;

    await this.userRepository.save(user);

    return { message: 'User updated successfully' };
  }
}
