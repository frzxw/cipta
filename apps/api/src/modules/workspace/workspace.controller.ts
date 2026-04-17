import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  type CanActivate,
  type Type,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiSuccessEnvelope,
  createSuccessEnvelope,
} from '../../common/http/response-envelope';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequestUser } from '../auth/workspace-scope.util';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import {
  WorkspaceDetail,
  WorkspaceMemberDetail,
  WorkspaceService,
  WorkspaceSummary,
} from './workspace.service';

const JwtAuthGuardType = JwtAuthGuard as Type<CanActivate>;

interface AuthenticatedRequest extends Request {
  user: AuthenticatedRequestUser;
}

@UseGuards(JwtAuthGuardType)
@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  /** GET /workspaces — list workspaces the caller belongs to */
  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiSuccessEnvelope<WorkspaceSummary[]>> {
    const data = await this.workspaceService.listForUser(req.user.id);
    return createSuccessEnvelope(req, data);
  }

  /** POST /workspaces — create a new workspace */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<ApiSuccessEnvelope<WorkspaceDetail>> {
    const data = await this.workspaceService.create(req.user.id, dto);
    return createSuccessEnvelope(req, data);
  }

  /** GET /workspaces/:id — get workspace details */
  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiSuccessEnvelope<WorkspaceDetail>> {
    const data = await this.workspaceService.findOne(id, req.user.id);
    return createSuccessEnvelope(req, data);
  }

  /** PATCH /workspaces/:id — update workspace settings */
  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<ApiSuccessEnvelope<WorkspaceDetail>> {
    const data = await this.workspaceService.update(id, req.user.id, dto);
    return createSuccessEnvelope(req, data);
  }

  /** POST /workspaces/:id/members — invite a member */
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
  ): Promise<ApiSuccessEnvelope<WorkspaceMemberDetail>> {
    const data = await this.workspaceService.inviteMember(id, req.user.id, dto);
    return createSuccessEnvelope(req, data);
  }

  /** DELETE /workspaces/:id/members/:userId — remove a member */
  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.workspaceService.removeMember(id, req.user.id, userId);
  }
}
