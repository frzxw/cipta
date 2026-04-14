import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  return value;
};

const normalizeTrimmedString = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};

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
