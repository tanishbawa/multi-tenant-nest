import { PartialType } from '@nestjs/swagger';
import { PermissionsCreateDto } from './permissions.create.dto';

export class PermissionsUpdateDto extends PartialType(PermissionsCreateDto) {}
