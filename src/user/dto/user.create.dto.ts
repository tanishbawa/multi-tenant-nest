import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator';

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
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  phone_no: string;

  @ApiProperty({ example: '123 Main St, Anytown, USA' })
  @IsString()
  address: string;

  @ApiProperty({ example: '44106010-d79a-4263-b779-1851d63d4a22' })
  @IsUUID()
  role_id: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  tenant_id: number;
}
