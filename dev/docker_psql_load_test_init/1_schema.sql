SELECT format('CREATE TABLE load_table_%s (
    id SERIAL PRIMARY KEY,
    char_name TEXT NOT NULL DEFAULT ''Cloud Strife'',
    job TEXT NOT NULL DEFAULT ''Mercenary'',
    level INT NOT NULL DEFAULT 1,
    weapon TEXT NOT NULL DEFAULT ''Buster Sword'',
    spell TEXT NOT NULL DEFAULT ''Firaga'',
    hp INT NOT NULL DEFAULT 1000,
    mp INT NOT NULL DEFAULT 500,
    location TEXT NOT NULL DEFAULT ''Midgar'',
    quest TEXT NOT NULL DEFAULT ''Save the Planet''
);', i)
FROM generate_series(1, 15000) AS s(i)
\gexec

-- We just need a very big amount of tables to make things funky in the UI so for now I am not worrying so much about their content

