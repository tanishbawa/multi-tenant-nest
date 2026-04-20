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
  @ApiProperty({ example: '00000000-0000-4000-8000-000000000001' })
  @IsUUID()
  tenant_id: string;

  @ApiProperty({ example: 'EDITOR' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Content Editor' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  built_in?: boolean;

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
