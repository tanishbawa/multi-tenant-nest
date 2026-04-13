import { SetMetadata } from '@nestjs/common';
import { PERMISSION_NAMES } from 'src/config/constants';

export const PERMISSIONS_KEY = 'required_permissions';

export const Permissions = (...permissions: PERMISSION_NAMES[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
