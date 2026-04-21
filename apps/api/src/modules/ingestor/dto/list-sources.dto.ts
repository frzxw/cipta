import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { SourceStatus } from '@cipta/database';

export class ListSourcesDto extends PaginationDto {
  @IsOptional()
  @IsEnum(SourceStatus)
  status?: SourceStatus;
}
