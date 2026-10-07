-- Adds Products.PrivateFileName (server-side private file for paid downloads).
-- RUN THIS BEFORE deploying the new API: the API reads this column on every product query.
-- Safe to run twice.
BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006175908_AddProductPrivateFile'
)
BEGIN
    IF COL_LENGTH('Products', 'PrivateFileName') IS NULL
        ALTER TABLE [Products] ADD [PrivateFileName] nvarchar(300) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006175908_AddProductPrivateFile'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261006175908_AddProductPrivateFile', N'8.0.30');
END;
GO

COMMIT;
GO
