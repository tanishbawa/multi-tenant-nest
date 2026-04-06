import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ROLE_NAMES } from 'src/config/constants';

export class RoleCreateDto {
  @ApiProperty({ example: ROLE_NAMES.ADMIN })
  @IsEnum(ROLE_NAMES)
  role_name: string;

  @ApiProperty({ example: 1 })
  tenant_id: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  built_in: boolean;
}
