import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  type CanActivate,
  type Type,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceScope } from '../auth/decorators/workspace-scope.decorator';
import type { WorkspaceScopeContext } from '../auth/workspace-scope.util';
import {
  ApiSuccessEnvelope,
  createSuccessEnvelope,
} from '../../common/http/response-envelope';
import type { Request } from 'express';
import { Req } from '@nestjs/common';
import { CreateSourceDto } from './dto/create-source.dto';
import { ListSourcesDto } from './dto/list-sources.dto';
import {
  IngestorService,
  PaginatedSources,
  SourceCreatedResult,
  SourceDetail,
} from './ingestor.service';

const JwtAuthGuardType = JwtAuthGuard as Type<CanActivate>;

@UseGuards(JwtAuthGuardType)
@Controller('sources')
export class IngestorController {
  constructor(private readonly ingestorService: IngestorService) {}

  /** POST /v1/sources — ingest a new source URL */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request,
    @WorkspaceScope() scope: WorkspaceScopeContext,
    @Body() dto: CreateSourceDto,
  ): Promise<ApiSuccessEnvelope<SourceCreatedResult>> {
    const data = await this.ingestorService.createSource(
      scope.workspaceId,
      dto,
    );
    return createSuccessEnvelope(req, data);
  }

  /** GET /v1/sources — list sources in workspace */
  @Get()
  async list(
    @Req() req: Request,
    @WorkspaceScope() scope: WorkspaceScopeContext,
    @Query() query: ListSourcesDto,
  ): Promise<ApiSuccessEnvelope<PaginatedSources>> {
    const data = await this.ingestorService.listSources(
      scope.workspaceId,
      query,
    );
    return createSuccessEnvelope(req, data);
  }

  /** GET /v1/sources/:id — get single source with detail */
  @Get(':id')
  async findOne(
    @Req() req: Request,
    @WorkspaceScope() scope: WorkspaceScopeContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiSuccessEnvelope<SourceDetail>> {
    const data = await this.ingestorService.findSource(scope.workspaceId, id);
    return createSuccessEnvelope(req, data);
  }

  /** DELETE /v1/sources/:id — delete source and all derived data */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() req: Request,
    @WorkspaceScope() scope: WorkspaceScopeContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiSuccessEnvelope<{ message: string }>> {
    await this.ingestorService.deleteSource(scope.workspaceId, id);
    return createSuccessEnvelope(req, {
      message: 'Source deleted successfully',
    });
  }
}
