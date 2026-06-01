import { PartialType } from '@nestjs/swagger';
import { CreateAgencyRoleDto } from './create-agency-role.dto';

export class UpdateAgencyRoleDto extends PartialType(CreateAgencyRoleDto) {}
