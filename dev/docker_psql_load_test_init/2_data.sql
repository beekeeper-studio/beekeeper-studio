SELECT format('INSERT INTO load_table_%s (char_name, job, level, weapon, spell, hp, mp, location, quest)
SELECT char_name, job, level, weapon, spell, hp, mp, location, quest FROM (
    SELECT ''Cloud Strife'' AS char_name, 
           ''Mercenary'' AS job, 
           floor(random() * 99 + 1)::INT AS level, 
           ''Buster Sword'' AS weapon, 
           ''Firaga'' AS spell, 
           floor(random() * 5000 + 1000)::INT AS hp, 
           floor(random() * 500 + 100)::INT AS mp, 
           ''Midgar'' AS location, 
           ''Save the Planet'' AS quest
    FROM generate_series(1, 100)
) AS temp;', i)
FROM generate_series(1, 15000) AS s(i)
\gexec
