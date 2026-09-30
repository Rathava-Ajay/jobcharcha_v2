-- Removes ONLY the throwaway rows created while verifying the Activity Audit + Instagram
-- campaign features on 2026-09-03. Safe: it targets three specific email addresses plus the
-- audit/contact/alert rows tied to them. It does NOT touch the older *@example.com test
-- accounts from earlier sessions (test.aspirant.phase1, browser.tester.phase1,
-- phase1test_*, phase3admintest_*).
--
-- Run from the repo root:  ! sqlcmd -S "LAPTOP-GHG2IOLB\SQLEXPRESS" -d JobCharchaDB_V2 -E -i scripts/cleanup-session-testdata.sql

SET NOCOUNT ON;

DECLARE @asp NVARCHAR(450) = (SELECT Id FROM AspNetUsers WHERE Email = 'audit.asp.1788454195933@example.com');
DECLARE @emp NVARCHAR(450) = (SELECT Id FROM AspNetUsers WHERE Email = 'audit.emp.1788454195933@example.com');
DECLARE @ig  NVARCHAR(450) = (SELECT Id FROM AspNetUsers WHERE Email = 'ig.lead.1788455527767@example.com');

DELETE FROM JobSeekerProfiles     WHERE UserId IN (@asp, @emp, @ig);
DELETE FROM EmployerAcknowledgments WHERE EmployerProfileId IN (SELECT Id FROM EmployerProfiles WHERE UserId = @emp);
DELETE FROM EmployerProfiles       WHERE UserId = @emp;
DELETE FROM AspNetUserRoles        WHERE UserId IN (@asp, @emp, @ig);
DELETE FROM AspNetUsers            WHERE Id IN (@asp, @emp, @ig);

DELETE FROM Contacts          WHERE Email = 'audit.contact.1788454195933@example.com';
DELETE FROM AlertPreferences  WHERE Email LIKE 'audit.alert.%@example.com';

DELETE FROM AuditEvents
WHERE ActorEmail LIKE 'audit.%@example.com'
   OR ActorEmail = 'ig.lead.1788455527767@example.com'
   OR Summary LIKE '%1788454195933@example.com%'
   OR Summary LIKE '%ig.lead.1788455527767@example.com%';

SELECT
  (SELECT COUNT(*) FROM AspNetUsers WHERE Email IN
     ('audit.asp.1788454195933@example.com','audit.emp.1788454195933@example.com','ig.lead.1788455527767@example.com')) AS UsersRemaining,
  (SELECT COUNT(*) FROM AuditEvents) AS AuditRowsRemaining;
