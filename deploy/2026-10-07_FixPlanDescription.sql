-- Run once on the production database (or edit the plan in the admin panel instead).
-- Removes the internal competitor-pricing sentence from the public mock test pass description.
UPDATE AspirantPlans
SET Description = 'One pass, all paid mock tests, valid for 1 year.'
WHERE Description LIKE '%Testbook%' OR Description LIKE '%Adda247%';
