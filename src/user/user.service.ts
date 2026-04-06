import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserCreateDto } from './dto/user.create.dto';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { UserGetDto } from './dto/user.get.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserDetails(userGetDto: UserGetDto): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email: userGetDto.email },
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
}
