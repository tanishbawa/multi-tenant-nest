import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PermissionsCreateDto {
  @ApiProperty({ example: 'users.read' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Read users', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
