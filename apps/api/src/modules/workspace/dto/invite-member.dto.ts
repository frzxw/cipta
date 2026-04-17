import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { WorkspaceRole } from '@cipta/database';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsEnum(WorkspaceRole)
  @IsOptional()
  role?: WorkspaceRole;
}
