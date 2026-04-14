import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';
import { normalizeTrimmedString } from '../../../common/validation/normalizers';

export class RefreshDto {
  @Transform(normalizeTrimmedString)
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
