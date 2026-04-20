import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class RoleUpdateDto {
  @ApiPropertyOptional({ example: 'editor' })
  @IsOptional()
  @IsString()
  role_name?: string;

  @ApiPropertyOptional({
    example: [
      'f122ec5c-7a6b-4563-9952-8190107b0952',
      'f6bcbf70-126a-48ce-8ef8-0f2a6269d68b',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  permissions_id?: string[];
}
