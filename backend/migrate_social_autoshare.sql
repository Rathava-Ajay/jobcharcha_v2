BEGIN TRANSACTION;
GO

CREATE TABLE [SocialImageUsages] (
    [Day] date NOT NULL,
    [Count] int NOT NULL,
    CONSTRAINT [PK_SocialImageUsages] PRIMARY KEY ([Day])
);
GO

CREATE TABLE [SocialShareJobs] (
    [Id] int NOT NULL IDENTITY,
    [Category] nvarchar(30) NOT NULL,
    [EntityId] int NOT NULL,
    [Channel] nvarchar(20) NOT NULL,
    [Generation] int NOT NULL,
    [Status] int NOT NULL,
    [Attempts] int NOT NULL,
    [NextAttemptAt] datetime2 NULL,
    [Title] nvarchar(300) NOT NULL,
    [Url] nvarchar(500) NOT NULL,
    [DetailsJson] nvarchar(max) NOT NULL,
    [ImageUrl] nvarchar(500) NULL,
    [Message] nvarchar(max) NULL,
    [ExternalId] nvarchar(100) NULL,
    [Error] nvarchar(1000) NULL,
    [Trigger] nvarchar(10) NOT NULL,
    [RequestedById] nvarchar(450) NULL,
    [CreatedDate] datetime2 NOT NULL,
    [UpdatedDate] datetime2 NOT NULL,
    [PostedAt] datetime2 NULL,
    CONSTRAINT [PK_SocialShareJobs] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [SocialShareSettings] (
    [Category] nvarchar(30) NOT NULL,
    [TelegramEnabled] bit NOT NULL,
    [InstagramEnabled] bit NOT NULL,
    [FacebookEnabled] bit NOT NULL,
    [RequireApproval] bit NOT NULL,
    [TelegramTemplate] nvarchar(2000) NULL,
    [CaptionTemplate] nvarchar(2000) NULL,
    [Hashtags] nvarchar(1000) NULL,
    [ImageStyle] nvarchar(500) NULL,
    [ImageSize] nvarchar(10) NOT NULL,
    [BrandColor] nvarchar(9) NULL,
    [AccentColor] nvarchar(9) NULL,
    [LogoUrl] nvarchar(500) NULL,
    [UpdatedDate] datetime2 NOT NULL,
    CONSTRAINT [PK_SocialShareSettings] PRIMARY KEY ([Category])
);
GO

CREATE INDEX [IX_SocialShareJobs_Status_NextAttemptAt] ON [SocialShareJobs] ([Status], [NextAttemptAt]);
GO

CREATE UNIQUE INDEX [UX_SocialShareJobs_Post] ON [SocialShareJobs] ([Category], [EntityId], [Channel], [Generation]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20261003143326_AddSocialShare', N'8.0.30');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [AiUsageLogs] (
    [Id] int NOT NULL IDENTITY,
    [OccurredAt] datetime2 NOT NULL,
    [Provider] nvarchar(20) NOT NULL,
    [Operation] nvarchar(20) NOT NULL,
    [Category] nvarchar(30) NULL,
    [Model] nvarchar(100) NULL,
    [InputTokens] bigint NOT NULL,
    [OutputTokens] bigint NOT NULL,
    [CacheReadTokens] bigint NOT NULL,
    [CacheWriteTokens] bigint NOT NULL,
    [CostUsd] decimal(18,6) NULL,
    [Units] int NOT NULL,
    [DurationMs] int NULL,
    [ReferenceId] int NULL,
    [Note] nvarchar(300) NULL,
    CONSTRAINT [PK_AiUsageLogs] PRIMARY KEY ([Id])
);
GO

CREATE INDEX [IX_AiUsageLogs_OccurredAt] ON [AiUsageLogs] ([OccurredAt]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20261003152022_AddAiUsageLog', N'8.0.30');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [SocialShareJobs] ADD [Template] int NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20261003174048_AddSocialShareTemplate', N'8.0.30');
GO

COMMIT;
GO

