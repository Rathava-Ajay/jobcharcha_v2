-- READ-ONLY review query. Lists news items that look off-topic or have a stale "Breaking" flag.
-- Nothing here deletes or updates anything; send the Ids you want removed/unflagged and that is a separate step.
SELECT n.Id, n.PublishedDate, DATEDIFF(day, n.PublishedDate, GETUTCDATE()) AS AgeDays,
       n.IsBreaking, c.Name AS Category, n.Title,
       CASE WHEN n.IsBreaking = 1 AND n.PublishedDate < DATEADD(day, -30, GETUTCDATE()) THEN 'breaking > 30 days' ELSE '' END AS StaleBreaking,
       CASE WHEN n.Title LIKE '%iPhone%' OR n.Title LIKE '%battery%' OR n.Title LIKE '%smartphone%' OR n.Title LIKE '%cricket%'
                 OR n.Title LIKE '%movie%' OR n.Title LIKE '%bitcoin%' OR n.Title LIKE '%crypto%' THEN 'off-topic keyword' ELSE '' END AS OffTopic
FROM News n LEFT JOIN Categories c ON c.Id = n.CategoryId
WHERE n.IsActive = 1
  AND ( (n.IsBreaking = 1 AND n.PublishedDate < DATEADD(day, -30, GETUTCDATE()))
     OR n.Title LIKE '%iPhone%' OR n.Title LIKE '%battery%' OR n.Title LIKE '%smartphone%' OR n.Title LIKE '%cricket%'
     OR n.Title LIKE '%movie%' OR n.Title LIKE '%bitcoin%' OR n.Title LIKE '%crypto%' )
ORDER BY n.PublishedDate;
