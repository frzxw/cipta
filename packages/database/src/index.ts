/**
 * @cipta/database
 *
 * Central database package. Re-exports the generated Prisma Client
 * and all model/enum types for consumption by apps/api and apps/worker.
 *
 * Usage:
 *   import { PrismaClient, User, SourceStatus } from '@cipta/database';
 */

export { PrismaClient } from './generated/client';
export type { Prisma } from './generated/client';

// ─────────────────────────────────────
// Model types
// ─────────────────────────────────────
export type {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  Source,
  Transcript,
  ViralSpike,
  Chunk,
  RenderProfile,
  Asset,
  Variation,
  Account,
  Cluster,
  ClusterAccount,
  DistributionRule,
  Distribution,
  Job,
  RefreshToken,
} from './generated/client';

// ─────────────────────────────────────
// Enum re-exports
// ─────────────────────────────────────
export {
  WorkspacePlan,
  WorkspaceRole,
  SourceStatus,
  TranscriptStatus,
  ViralSpikeCategory,
  ViralSpikeStatus,
  ChunkStatus,
  AssetStatus,
  VariationStatus,
  AccountPlatform,
  AccountStatus,
  DistributionStatus,
  JobStatus,
} from './generated/client';
