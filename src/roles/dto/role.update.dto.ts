import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class RoleUpdateDto {
  @ApiProperty({ example: 'Updated role name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: [
      'f122ec5c-7a6b-4563-9952-8190107b0952',
      'f6bcbf70-126a-48ce-8ef8-0f2a6269d68b',
    ],
    required: false,
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  permissions_id?: string[];
}
