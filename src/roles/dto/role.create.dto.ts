import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class RoleCreateDto {
  @ApiProperty({ example: 'editor' })
  @IsString()
  @IsNotEmpty()
  role_name: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  built_in: boolean;

  @ApiProperty({
    example: [
      'f122ec5c-7a6b-4563-9952-8190107b0952',
      'f6bcbf70-126a-48ce-8ef8-0f2a6269d68b',
    ],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  permissions_id: string[];
}
