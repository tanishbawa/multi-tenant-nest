import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class UserGetDto {
  @ApiProperty({ example: 'test@gmail.com' })
  @IsEmail()
  email: string;
}
