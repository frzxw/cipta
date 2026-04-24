import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceScope } from '../auth/decorators/workspace-scope.decorator';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List jobs for the current workspace' })
  @ApiResponse({ status: 200, description: 'Return list of jobs' })
  public async findAll(
    @WorkspaceScope() workspaceId: string,
    @Query('status') status?: string,
  ) {
    return this.jobsService.findAll(workspaceId, status);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiResponse({ status: 200, description: 'Job re-enqueued' })
  public async retry(
    @WorkspaceScope() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.retry(workspaceId, id);
  }
}
