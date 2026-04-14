import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

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

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @Transform(normalizeTrimmedString)
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Z]/, {
    message: 'password must contain at least one uppercase letter',
  })
  @Matches(/[0-9]/, { message: 'password must contain at least one number' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'password must contain at least one special character',
  })
  password!: string;

  @Transform(normalizeTrimmedString)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName!: string;
}
