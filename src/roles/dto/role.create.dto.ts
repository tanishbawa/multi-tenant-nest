import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ROLE_NAMES } from 'src/config/constants';

export class RoleCreateDto {
  @ApiProperty({ example: ROLE_NAMES.ADMIN })
  @IsEnum(ROLE_NAMES)
  role_name: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  built_in: boolean;

  @ApiProperty({
    example: [
      'f122ec5c-7a6b-4563-9952-8190107b0952, f6bcbf70-126a-48ce-8ef8-0f2a6269d68b, 499012de-aa35-42d9-a862-19ad64310f04, c7ef0582-dc90-4774-a7ae-b5e2194a994c',
    ],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  permissions_id: string[];
}
