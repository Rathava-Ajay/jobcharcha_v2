-- HARD DELETE of jobs and news dated 2025-01-01 .. 2026-04-06 (inclusive).
-- Jobs use PostedDate, news uses PublishedDate. NOT RUN YET.
-- Run order: 1) preview  2) take a database backup  3) run the delete block.
-- The delete block is one transaction and rolls back on any error. Backup copies of the rows go into
-- Jobs_backup_20261007 / News_backup_20261007 first.

DECLARE @From date = '2025-01-01', @To date = '2026-04-06';

-- ===== 1. PREVIEW (read-only) =====
SELECT 'jobs' AS Kind, COUNT(*) AS Matching FROM Jobs WHERE CAST(PostedDate AS date) BETWEEN @From AND @To
UNION ALL SELECT 'news', COUNT(*) FROM News WHERE CAST(PublishedDate AS date) BETWEEN @From AND @To
UNION ALL SELECT 'AlertDispatchLogs', COUNT(*) FROM AlertDispatchLogs WHERE JobId IN (SELECT Id FROM Jobs WHERE CAST(PostedDate AS date) BETWEEN @From AND @To)
UNION ALL SELECT 'JobDocuments', COUNT(*) FROM JobDocuments WHERE JobId IN (SELECT Id FROM Jobs WHERE CAST(PostedDate AS date) BETWEEN @From AND @To)
UNION ALL SELECT 'JobPosts', COUNT(*) FROM JobPosts WHERE JobId IN (SELECT Id FROM Jobs WHERE CAST(PostedDate AS date) BETWEEN @From AND @To)
UNION ALL SELECT 'JobDraftQueue (will be unlinked)', COUNT(*) FROM JobDraftQueue WHERE CreatedJobId IN (SELECT Id FROM Jobs WHERE CAST(PostedDate AS date) BETWEEN @From AND @To)
UNION ALL SELECT 'SocialShareJobs', COUNT(*) FROM SocialShareJobs
  WHERE (Category = 'job'  AND EntityId IN (SELECT Id FROM Jobs WHERE CAST(PostedDate AS date) BETWEEN @From AND @To))
     OR (Category = 'news' AND EntityId IN (SELECT Id FROM News WHERE CAST(PublishedDate AS date) BETWEEN @From AND @To));

-- ===== 3. DELETE (uncomment after the preview looks right and you have a backup) =====
-- SET XACT_ABORT ON;
-- BEGIN TRAN;
--   SELECT * INTO Jobs_backup_20261007 FROM Jobs WHERE CAST(PostedDate AS date) BETWEEN @From AND @To;
--   SELECT * INTO News_backup_20261007 FROM News WHERE CAST(PublishedDate AS date) BETWEEN @From AND @To;
--
--   SELECT Id INTO #JobIds FROM Jobs WHERE CAST(PostedDate AS date) BETWEEN @From AND @To;
--   SELECT Id INTO #NewsIds FROM News WHERE CAST(PublishedDate AS date) BETWEEN @From AND @To;
--
--   DELETE FROM SocialShareJobs WHERE (Category = 'job' AND EntityId IN (SELECT Id FROM #JobIds)) OR (Category = 'news' AND EntityId IN (SELECT Id FROM #NewsIds));
--   DELETE FROM AlertDispatchLogs WHERE JobId IN (SELECT Id FROM #JobIds);
--   DELETE FROM JobDocuments      WHERE JobId IN (SELECT Id FROM #JobIds);
--   DELETE FROM JobPosts          WHERE JobId IN (SELECT Id FROM #JobIds);
--   UPDATE JobDraftQueue SET CreatedJobId = NULL WHERE CreatedJobId IN (SELECT Id FROM #JobIds);
--   DELETE FROM Jobs WHERE Id IN (SELECT Id FROM #JobIds);
--   DELETE FROM News WHERE Id IN (SELECT Id FROM #NewsIds);
-- COMMIT;
