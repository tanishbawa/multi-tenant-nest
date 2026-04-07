import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID } from 'class-validator';

export class UserCreateDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 20 })
  @IsString()
  age: string;

  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  phone_no: string;

  @ApiProperty({ example: '123 Main St, Anytown, USA' })
  @IsString()
  address: string;

  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001' })
  @IsUUID()
  role_id: string;
}
