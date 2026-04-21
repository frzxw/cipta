import { IsEnum, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export type VideoQuality = 'highest' | '1080p' | '720p';

export class CreateSourceDto {
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  url!: string;

  @IsOptional()
  @IsUUID(4)
  projectId?: string;

  @IsOptional()
  @IsEnum(['highest', '1080p', '720p'] as const)
  quality?: VideoQuality;

  @IsOptional()
  @IsString()
  language?: string;
}
