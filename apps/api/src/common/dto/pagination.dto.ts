import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DEFAULT_PAGINATION } from '../constants/app.constants';

const toNumber = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return Number(value);
  }

  return value;
};

const toTrimmed = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
};

export class PaginationDto {
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGINATION.page;

  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(DEFAULT_PAGINATION.maxLimit)
  limit: number = DEFAULT_PAGINATION.limit;

  @IsOptional()
  @Transform(toTrimmed)
  @IsString()
  sortBy: string = DEFAULT_PAGINATION.sortBy;

  @IsOptional()
  @Transform(toTrimmed)
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = DEFAULT_PAGINATION.sortOrder;
}
