-- Create a postgres table with a lot of data that will cause the util process to crash if we select it all
-- Step 1: Create the table with 30 mixed-type columns
DROP TABLE IF EXISTS test_data;
CREATE TABLE test_data (
    id SERIAL PRIMARY KEY,
    int_col1 INTEGER,
    int_col2 INTEGER,
    int_col3 INTEGER,
    int_col4 INTEGER,
    int_col5 INTEGER,
    float_col1 FLOAT,
    float_col2 FLOAT,
    float_col3 FLOAT,
    float_col4 FLOAT,
    float_col5 FLOAT,
    text_col1 TEXT,
    text_col2 TEXT,
    text_col3 TEXT,
    text_col4 TEXT,
    text_col5 TEXT,
    varchar_col1 VARCHAR(100),
    varchar_col2 VARCHAR(100),
    varchar_col3 VARCHAR(100),
    varchar_col4 VARCHAR(100),
    varchar_col5 VARCHAR(100),
    bool_col1 BOOLEAN,
    bool_col2 BOOLEAN,
    bool_col3 BOOLEAN,
    date_col1 DATE,
    date_col2 DATE,
    timestamp_col1 TIMESTAMP,
    timestamp_col2 TIMESTAMP,
    uuid_col UUID
);

-- Step 2: Insert ~3 million rows using generate_series
-- This uses INSERT INTO ... SELECT ... for performance
INSERT INTO test_data (
    int_col1, int_col2, int_col3, int_col4, int_col5,
    float_col1, float_col2, float_col3, float_col4, float_col5,
    text_col1, text_col2, text_col3, text_col4, text_col5,
    varchar_col1, varchar_col2, varchar_col3, varchar_col4, varchar_col5,
    bool_col1, bool_col2, bool_col3,
    date_col1, date_col2,
    timestamp_col1, timestamp_col2,
    uuid_col
)
SELECT
    gs, gs % 100, gs % 500, gs % 1000, gs % 2000,
    gs * 1.1, gs * 0.1, gs * 0.5, gs * 0.01, gs * 2.5,
    'text_' || gs, 'text_' || md5(gs::text), 'row_' || gs, md5(gs::text), 'val_' || gs,
    'var_' || gs, 'var_' || md5(gs::text), 'data_' || gs, 'info_' || gs, 'x_' || gs,
    (gs % 2 = 0), (gs % 3 = 0), (gs % 5 = 0),
    CURRENT_DATE + (gs % 100),
    CURRENT_DATE - (gs % 100),
    NOW() - (gs || ' seconds')::interval,
    NOW() + (gs || ' seconds')::interval,
    md5(gs::text || 'uuid')::uuid
FROM generate_series(1, 3000000) AS gs;
