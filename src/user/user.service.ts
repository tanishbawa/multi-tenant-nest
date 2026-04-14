import {
  BadRequestException,
  ForbiddenException,
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
import { UserQueryDto } from './dto/user.query.dto';
import { PaginatedResult } from 'src/config/types';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async getAllUsers(
    query: UserQueryDto,
    requesterUserId: string,
  ): Promise<PaginatedResult<User>> {
    if (!requesterUserId) {
      throw new ForbiddenException('Access denied');
    }

    const requester = await this.userRepository.findOne({
      where: { id: requesterUserId },
      select: ['id', 'tenant_id', 'is_active'],
    });

    if (!requester?.is_active) {
      throw new ForbiddenException('Access denied');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.created_at', 'DESC')
      .addOrderBy('user.id', 'DESC') // stable pagination order
      .skip(skip)
      .take(limit);

    qb.andWhere('user.tenant_id = :tenantId', {
      tenantId: requester.tenant_id,
    });

    if (search) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (query.is_active !== undefined) {
      qb.andWhere('user.is_active = :isActive', { isActive: query.is_active });
    }
    if (query.email) {
      qb.andWhere('user.email = :email', { email: query.email });
    }

    const [data, total] = await qb.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
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

    if (userUpdateDto.tenant_id !== undefined) {
      user.tenant_id = userUpdateDto.tenant_id;
    }

    if (userUpdateDto.name !== undefined) user.name = userUpdateDto.name;
    if (userUpdateDto.age !== undefined) user.age = userUpdateDto.age;
    if (userUpdateDto.email !== undefined) user.email = userUpdateDto.email;
    if (userUpdateDto.phone_no !== undefined)
      user.phone_no = userUpdateDto.phone_no;
    if (userUpdateDto.address !== undefined)
      user.address = userUpdateDto.address;
    if (userUpdateDto.password !== undefined) {
      const passwordHash: string = await bcrypt.hash(
        userUpdateDto.password,
        10,
      );
      user.password_hash = passwordHash;
    }

    await this.userRepository.save(user);

    return { message: 'User updated successfully' };
  }
}
