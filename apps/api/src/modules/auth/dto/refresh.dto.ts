import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

const normalizeTrimmedString = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};

export class RefreshDto {
  @Transform(normalizeTrimmedString)
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
