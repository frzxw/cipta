-- CreateEnum
CREATE TYPE "WorkspacePlan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('PENDING', 'DOWNLOADING', 'DOWNLOADED', 'TRANSCRIBING', 'ANALYZING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "TranscriptStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ViralSpikeCategory" AS ENUM ('HUMOR', 'CONTROVERSY', 'HOOK', 'EMOTIONAL', 'EDUCATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ViralSpikeStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChunkStatus" AS ENUM ('PENDING', 'EXTRACTING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'RENDERING', 'RENDERED', 'FAILED');

-- CreateEnum
CREATE TYPE "VariationStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AccountPlatform" AS ENUM ('TIKTOK', 'INSTAGRAM', 'YOUTUBE', 'TWITTER', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'RATE_LIMITED', 'SUSPENDED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED', 'STALLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "WorkspacePlan" NOT NULL DEFAULT 'FREE',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "projectId" UUID,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "platform" TEXT,
    "status" "SourceStatus" NOT NULL DEFAULT 'PENDING',
    "durationSeconds" INTEGER,
    "thumbnailUrl" TEXT,
    "storagePath" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "words" JSONB NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" "TranscriptStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viral_spikes" (
    "id" UUID NOT NULL,
    "transcriptId" UUID NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "category" "ViralSpikeCategory" NOT NULL,
    "suggestedTitle" TEXT,
    "status" "ViralSpikeStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viral_spikes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chunks" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "viralSpikeId" UUID,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "storagePath" TEXT,
    "status" "ChunkStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_profiles" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "captionStyle" JSONB NOT NULL DEFAULT '{}',
    "brollConfig" JSONB NOT NULL DEFAULT '{}',
    "frameConfig" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "render_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "chunkId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "renderProfileId" UUID,
    "storagePath" TEXT,
    "storageUrl" TEXT,
    "fileSizeBytes" INTEGER,
    "durationMs" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "codec" TEXT DEFAULT 'h264',
    "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variations" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "md5Hash" TEXT NOT NULL,
    "storagePath" TEXT,
    "storageUrl" TEXT,
    "guardianParams" JSONB NOT NULL DEFAULT '{}',
    "fileSizeBytes" INTEGER,
    "status" "VariationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "platform" "AccountPlatform" NOT NULL,
    "platformAccountId" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clusters" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "niche" TEXT,
    "defaultRenderProfileId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cluster_accounts" (
    "id" UUID NOT NULL,
    "clusterId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cluster_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_rules" (
    "id" UUID NOT NULL,
    "clusterId" UUID NOT NULL,
    "renderProfileId" UUID,
    "scheduleConfig" JSONB NOT NULL DEFAULT '{}',
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 30,
    "autoPin" BOOLEAN NOT NULL DEFAULT false,
    "pinnedCommentTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributions" (
    "id" UUID NOT NULL,
    "variationId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "platformPostId" TEXT,
    "platformPostUrl" TEXT,
    "caption" TEXT,
    "pinnedComment" TEXT,
    "status" "DistributionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "queue" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bullJobId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "error" TEXT,
    "attemptsMade" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_userId_workspaceId_key" ON "workspace_members"("userId", "workspaceId");

-- CreateIndex
CREATE INDEX "projects_workspaceId_idx" ON "projects"("workspaceId");

-- CreateIndex
CREATE INDEX "sources_workspaceId_idx" ON "sources"("workspaceId");

-- CreateIndex
CREATE INDEX "sources_workspaceId_status_idx" ON "sources"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "transcripts_sourceId_idx" ON "transcripts"("sourceId");

-- CreateIndex
CREATE INDEX "viral_spikes_transcriptId_idx" ON "viral_spikes"("transcriptId");

-- CreateIndex
CREATE UNIQUE INDEX "chunks_viralSpikeId_key" ON "chunks"("viralSpikeId");

-- CreateIndex
CREATE INDEX "chunks_sourceId_idx" ON "chunks"("sourceId");

-- CreateIndex
CREATE INDEX "render_profiles_workspaceId_idx" ON "render_profiles"("workspaceId");

-- CreateIndex
CREATE INDEX "assets_workspaceId_idx" ON "assets"("workspaceId");

-- CreateIndex
CREATE INDEX "assets_chunkId_idx" ON "assets"("chunkId");

-- CreateIndex
CREATE UNIQUE INDEX "variations_md5Hash_key" ON "variations"("md5Hash");

-- CreateIndex
CREATE INDEX "variations_assetId_idx" ON "variations"("assetId");

-- CreateIndex
CREATE INDEX "accounts_workspaceId_idx" ON "accounts"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_workspaceId_platform_platformAccountId_key" ON "accounts"("workspaceId", "platform", "platformAccountId");

-- CreateIndex
CREATE INDEX "clusters_workspaceId_idx" ON "clusters"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "cluster_accounts_clusterId_accountId_key" ON "cluster_accounts"("clusterId", "accountId");

-- CreateIndex
CREATE INDEX "distribution_rules_clusterId_idx" ON "distribution_rules"("clusterId");

-- CreateIndex
CREATE INDEX "distributions_workspaceId_idx" ON "distributions"("workspaceId");

-- CreateIndex
CREATE INDEX "distributions_workspaceId_status_idx" ON "distributions"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "distributions_accountId_scheduledAt_idx" ON "distributions"("accountId", "scheduledAt");

-- CreateIndex
CREATE INDEX "jobs_workspaceId_idx" ON "jobs"("workspaceId");

-- CreateIndex
CREATE INDEX "jobs_workspaceId_status_idx" ON "jobs"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "jobs_bullJobId_idx" ON "jobs"("bullJobId");

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viral_spikes" ADD CONSTRAINT "viral_spikes_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_viralSpikeId_fkey" FOREIGN KEY ("viralSpikeId") REFERENCES "viral_spikes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_profiles" ADD CONSTRAINT "render_profiles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_renderProfileId_fkey" FOREIGN KEY ("renderProfileId") REFERENCES "render_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variations" ADD CONSTRAINT "variations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clusters" ADD CONSTRAINT "clusters_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clusters" ADD CONSTRAINT "clusters_defaultRenderProfileId_fkey" FOREIGN KEY ("defaultRenderProfileId") REFERENCES "render_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cluster_accounts" ADD CONSTRAINT "cluster_accounts_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cluster_accounts" ADD CONSTRAINT "cluster_accounts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_rules" ADD CONSTRAINT "distribution_rules_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_rules" ADD CONSTRAINT "distribution_rules_renderProfileId_fkey" FOREIGN KEY ("renderProfileId") REFERENCES "render_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "variations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
