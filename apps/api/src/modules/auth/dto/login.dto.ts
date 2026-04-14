import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import {
  normalizeEmail,
  normalizeTrimmedString,
} from '../../../common/validation/normalizers';

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @Transform(normalizeTrimmedString)
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
