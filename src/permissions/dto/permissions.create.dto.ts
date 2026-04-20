import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PERMISSION_NAMES } from 'src/config/constants';

export class PermissionsCreateDto {
  @ApiProperty({ example: 'create_user, read_user, update_user, delete_user' })
  @IsEnum(PERMISSION_NAMES)
  permission_name: string;

  @ApiProperty({ example: 'Create a new user' })
  @IsString()
  @IsNotEmpty()
  permission_description: string;
}
