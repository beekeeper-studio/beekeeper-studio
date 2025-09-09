-- PostgreSQL 15 INSANE Load Test Data
-- Populate 170+ schemas with millions of records and complex relationships
-- This will create an absolutely massive dataset to stress test any UI

-- =============================================================================
-- POPULATE CORE ENTITY TABLES IN ALL SCHEMAS USING BATCH APPROACH
-- =============================================================================

-- Simple approach: Use DO blocks to populate data in batches for better performance
-- First, defer constraint checking to handle self-referential foreign keys
\echo 'Starting data population - deferring constraint checking...'
SET CONSTRAINTS ALL DEFERRED;

DO $$
DECLARE
    schema_names TEXT[] := ARRAY[
        'accounting', 'advertising', 'aerospace', 'agriculture', 'analytics',
        'architecture', 'automotive', 'aviation', 'banking', 'biotechnology',
        'blockchain', 'broadcasting', 'construction', 'consulting', 'cybersecurity',
        'defense', 'ecommerce', 'education', 'energy', 'entertainment',
        'fashion', 'finance', 'fitness', 'food_service', 'gaming',
        'healthcare', 'hospitality', 'hr_management', 'insurance', 'iot',
        'legal', 'logistics', 'manufacturing', 'marketing', 'media',
        'mining', 'music', 'nonprofit', 'pharmaceuticals', 'real_estate',
        'retail', 'robotics', 'social_media', 'software', 'sports',
        'telecommunications', 'tourism', 'transportation', 'utilities', 'veterinary',
        'region_north_america', 'region_south_america', 'region_europe', 'region_asia', 'region_africa',
        'region_oceania', 'country_usa', 'country_canada', 'country_mexico', 'country_brazil',
        'country_argentina', 'country_uk', 'country_france', 'country_germany', 'country_spain',
        'country_italy', 'country_russia', 'country_china', 'country_japan', 'country_india',
        'country_australia', 'country_south_africa', 'state_california', 'state_texas', 'state_newyork',
        'state_florida', 'city_london', 'city_paris', 'city_tokyo', 'city_sydney',
        'city_dubai', 'city_singapore', 'city_mumbai', 'city_toronto', 'city_berlin',
        'city_madrid', 'city_rome', 'city_moscow', 'city_beijing', 'city_seoul',
        'zone_americas', 'zone_emea', 'zone_apac', 'zone_latam', 'zone_mena',
        'district_north', 'district_south', 'district_east', 'district_west', 'district_central',
        'dept_executive', 'dept_operations', 'dept_finance', 'dept_hr', 'dept_it',
        'dept_sales', 'dept_marketing', 'dept_engineering', 'dept_design', 'dept_product',
        'dept_customer_service', 'dept_legal', 'dept_compliance', 'dept_security', 'dept_facilities',
        'dept_procurement', 'dept_logistics', 'dept_warehouse', 'dept_manufacturing', 'dept_quality',
        'dept_research', 'dept_development', 'dept_innovation', 'dept_training', 'dept_consulting',
        'dept_business_intel', 'dept_data_science', 'dept_analytics', 'dept_reporting', 'dept_audit',
        'division_consumer', 'division_enterprise', 'division_government', 'division_education', 'division_healthcare',
        'unit_mobile', 'unit_web', 'unit_cloud', 'unit_ai', 'unit_blockchain',
        'team_backend', 'team_frontend', 'team_devops', 'team_qa', 'team_ux',
        'squad_alpha', 'squad_beta', 'squad_gamma', 'squad_delta', 'squad_epsilon',
        'sys_monitoring', 'sys_logging', 'sys_metrics', 'sys_alerts', 'sys_backups',
        'sys_security', 'sys_audit', 'sys_config', 'sys_cache', 'sys_queue',
        'api_v1', 'api_v2', 'api_v3', 'api_internal', 'api_external',
        'microservice_auth', 'microservice_user', 'microservice_order', 'microservice_payment', 'microservice_notification',
        'microservice_inventory', 'microservice_catalog', 'microservice_review', 'microservice_shipping', 'microservice_analytics',
        'data_raw', 'data_processed', 'data_aggregated', 'data_archive', 'data_temp',
        'etl_staging', 'etl_transform', 'etl_load', 'warehouse_dim', 'warehouse_fact',
        'ml_training', 'ml_inference', 'ml_models', 'ml_features', 'ml_experiments',
        'event_sourcing', 'event_streams', 'event_snapshots', 'batch_processing', 'realtime_processing',
        'integration_crm', 'integration_erp', 'integration_payment', 'integration_shipping', 'integration_email',
        'archive_2020', 'archive_2021', 'archive_2022', 'archive_2023', 'archive_2024',
        'vertical_retail', 'vertical_manufacturing', 'vertical_healthcare', 'vertical_education', 'vertical_government',
        'vertical_nonprofit', 'vertical_startup', 'vertical_enterprise', 'vertical_smb', 'vertical_freelancer',
        'industry_fintech', 'industry_edtech', 'industry_healthtech', 'industry_proptech', 'industry_agtech',
        'industry_cleantech', 'industry_biotech', 'industry_martech', 'industry_hrtech', 'industry_legaltech'
    ];
    schema_name TEXT;
BEGIN
    FOREACH schema_name IN ARRAY schema_names LOOP
        RAISE NOTICE 'Populating data for schema: % (% of %)', schema_name, array_position(schema_names, schema_name), array_length(schema_names, 1);
        
        -- Insert organizations
        EXECUTE 'INSERT INTO ' || schema_name || '.organizations (name, code, type, status, parent_org_id)
            SELECT 
                ''' || initcap(replace(schema_name, '_', ' ')) || ' Org '' || i,
                ''' || upper(schema_name) || '_ORG_'' || i,
                CASE i % 5 WHEN 0 THEN ''corporation'' WHEN 1 THEN ''partnership'' 
                          WHEN 2 THEN ''nonprofit'' WHEN 3 THEN ''government'' 
                          ELSE ''startup'' END,
                CASE i % 4 WHEN 0 THEN ''active'' WHEN 1 THEN ''pending'' 
                          WHEN 2 THEN ''suspended'' ELSE ''inactive'' END,
                CASE WHEN i > 10 THEN ((i - 1) % 10) + 1 ELSE NULL END
            FROM generate_series(1, 100) AS s(i)';
            
        -- Insert locations  
        EXECUTE 'INSERT INTO ' || schema_name || '.locations (name, address, city, region, country, postal_code, coordinates, timezone, organization_id)
            SELECT 
                ''' || initcap(replace(schema_name, '_', ' ')) || ' Location '' || i,
                i || '' Main St'',
                CASE i % 10 WHEN 0 THEN ''New York'' WHEN 1 THEN ''London'' 
                           WHEN 2 THEN ''Tokyo'' WHEN 3 THEN ''Sydney'' 
                           WHEN 4 THEN ''Paris'' WHEN 5 THEN ''Berlin''
                           WHEN 6 THEN ''Toronto'' WHEN 7 THEN ''Mumbai''
                           WHEN 8 THEN ''Dubai'' ELSE ''Singapore'' END,
                CASE i % 5 WHEN 0 THEN ''North America'' WHEN 1 THEN ''Europe'' 
                           WHEN 2 THEN ''Asia'' WHEN 3 THEN ''Oceania'' 
                           ELSE ''Middle East'' END,
                CASE i % 8 WHEN 0 THEN ''USA'' WHEN 1 THEN ''Canada'' 
                           WHEN 2 THEN ''UK'' WHEN 3 THEN ''Japan'' 
                           WHEN 4 THEN ''France'' WHEN 5 THEN ''Germany''
                           WHEN 6 THEN ''India'' ELSE ''Australia'' END,
                lpad(((i * 123) % 100000)::text, 5, ''0''),
                point((random() * 360 - 180), (random() * 180 - 90)),
                CASE i % 4 WHEN 0 THEN ''UTC-5'' WHEN 1 THEN ''UTC+0'' 
                           WHEN 2 THEN ''UTC+9'' ELSE ''UTC-8'' END,
                ((i - 1) % 100) + 1
            FROM generate_series(1, 200) AS s(i)';
            
        -- Insert users
        EXECUTE 'INSERT INTO ' || schema_name || '.users (username, email, first_name, last_name, role, department, organization_id, location_id, manager_id, hire_date, is_active, last_login)
            SELECT 
                ''' || schema_name || '_user_'' || i,
                ''user'' || i || ''@' || schema_name || '.com'',
                CASE i % 10 WHEN 0 THEN ''John'' WHEN 1 THEN ''Jane'' 
                           WHEN 2 THEN ''Mike'' WHEN 3 THEN ''Sarah''
                           WHEN 4 THEN ''David'' WHEN 5 THEN ''Lisa''
                           WHEN 6 THEN ''Chris'' WHEN 7 THEN ''Emma''
                           WHEN 8 THEN ''James'' ELSE ''Amy'' END,
                CASE i % 8 WHEN 0 THEN ''Smith'' WHEN 1 THEN ''Johnson'' 
                           WHEN 2 THEN ''Williams'' WHEN 3 THEN ''Brown''
                           WHEN 4 THEN ''Davis'' WHEN 5 THEN ''Miller''
                           WHEN 6 THEN ''Wilson'' ELSE ''Moore'' END,
                CASE i % 6 WHEN 0 THEN ''Manager'' WHEN 1 THEN ''Developer'' 
                           WHEN 2 THEN ''Analyst'' WHEN 3 THEN ''Designer''
                           WHEN 4 THEN ''Engineer'' ELSE ''Specialist'' END,
                CASE i % 5 WHEN 0 THEN ''Engineering'' WHEN 1 THEN ''Sales'' 
                           WHEN 2 THEN ''Marketing'' WHEN 3 THEN ''HR'' 
                           ELSE ''Operations'' END,
                ((i - 1) % 100) + 1,
                ((i - 1) % 200) + 1,
                CASE WHEN i > 50 THEN ((i - 1) % 50) + 1 ELSE NULL END,
                CURRENT_DATE - (i % 1000) * INTERVAL ''1 day'',
                i % 10 != 0,
                NOW() - (i % 168) * INTERVAL ''1 hour''
            FROM generate_series(1, 500) AS s(i)';
            
        -- Insert categories
        EXECUTE 'INSERT INTO ' || schema_name || '.categories (name, description, parent_category_id, hierarchy_path, level_depth, sort_order, is_active, organization_id, created_by)
            SELECT 
                ''' || initcap(replace(schema_name, '_', ' ')) || ' Category '' || i,
                ''Description for category '' || i,
                CASE WHEN i > 25 THEN ((i - 1) % 25) + 1 ELSE NULL END,
                CASE WHEN i <= 20 THEN ''/cat_'' || i 
                     ELSE ''/cat_'' || (((i - 1) % 20) + 1) || ''/cat_'' || i END,
                CASE WHEN i <= 20 THEN 1 ELSE 2 END,
                i,
                i % 10 != 0,
                ((i - 1) % 100) + 1,
                ((i - 1) % 500) + 1
            FROM generate_series(1, 100) AS s(i)';
    END LOOP;
END $$;

-- Reset constraint checking to immediate after core entity population
\echo 'Core entity population complete - resetting constraints to immediate...'
SET CONSTRAINTS ALL IMMEDIATE;

-- =============================================================================
-- POPULATE DOMAIN-SPECIFIC TABLES WITH MASSIVE DATA
-- =============================================================================

\echo 'Populating ecommerce domain with 35,000 records...'

-- Populate ecommerce domain
INSERT INTO ecommerce.products (sku, name, description, category_id, organization_id, brand, price, cost, weight, inventory_count, is_active, created_by)
SELECT 
    'SKU-' || lpad(i::text, 8, '0'),
    'Product ' || i,
    'Description for product number ' || i || '. This is a comprehensive product description with various keywords.',
    ((i - 1) % 100) + 1,
    ((i - 1) % 100) + 1,
    CASE i % 10 WHEN 0 THEN 'BrandA' WHEN 1 THEN 'BrandB' WHEN 2 THEN 'BrandC' 
                 WHEN 3 THEN 'BrandD' WHEN 4 THEN 'BrandE' WHEN 5 THEN 'BrandF'
                 WHEN 6 THEN 'BrandG' WHEN 7 THEN 'BrandH' WHEN 8 THEN 'BrandI' 
                 ELSE 'BrandJ' END,
    (random() * 1000 + 10)::DECIMAL(12,2),
    (random() * 500 + 5)::DECIMAL(12,2),
    (random() * 50 + 0.1)::DECIMAL(10,3),
    (random() * 1000)::INT,
    i % 20 != 0,
    ((i - 1) % 500) + 1
FROM generate_series(1, 10000) AS s(i);

INSERT INTO ecommerce.customers (customer_number, email, first_name, last_name, phone, organization_id, location_id, lifetime_value, loyalty_points, is_vip)
SELECT 
    'CUST-' || lpad(i::text, 8, '0'),
    'customer' || i || '@email.com',
    CASE i % 15 WHEN 0 THEN 'Alice' WHEN 1 THEN 'Bob' WHEN 2 THEN 'Carol' 
                 WHEN 3 THEN 'Dave' WHEN 4 THEN 'Eve' WHEN 5 THEN 'Frank'
                 WHEN 6 THEN 'Grace' WHEN 7 THEN 'Henry' WHEN 8 THEN 'Ivy' 
                 WHEN 9 THEN 'Jack' WHEN 10 THEN 'Kate' WHEN 11 THEN 'Leo'
                 WHEN 12 THEN 'Mia' WHEN 13 THEN 'Nick' ELSE 'Olivia' END,
    CASE i % 12 WHEN 0 THEN 'Anderson' WHEN 1 THEN 'Baker' WHEN 2 THEN 'Clark' 
                 WHEN 3 THEN 'Davis' WHEN 4 THEN 'Evans' WHEN 5 THEN 'Fisher'
                 WHEN 6 THEN 'Green' WHEN 7 THEN 'Harris' WHEN 8 THEN 'Jackson' 
                 WHEN 9 THEN 'King' WHEN 10 THEN 'Lee' ELSE 'Martin' END,
    '+1-555-' || lpad((i % 10000)::text, 4, '0'),
    ((i - 1) % 100) + 1,
    ((i - 1) % 200) + 1,
    (random() * 50000)::DECIMAL(15,2),
    (random() * 10000)::INT,
    i % 50 = 0
FROM generate_series(1, 25000) AS s(i);

\echo 'Populating healthcare domain with 15,000 records...'

-- Healthcare domain
INSERT INTO healthcare.patients (patient_id, first_name, last_name, date_of_birth, gender, blood_type, phone, email, organization_id, location_id, primary_doctor_id, allergies, chronic_conditions, is_active)
SELECT 
    'PAT-' || lpad(i::text, 8, '0'),
    CASE i % 12 WHEN 0 THEN 'Michael' WHEN 1 THEN 'Sarah' WHEN 2 THEN 'David' 
                 WHEN 3 THEN 'Jennifer' WHEN 4 THEN 'Robert' WHEN 5 THEN 'Lisa'
                 WHEN 6 THEN 'William' WHEN 7 THEN 'Nancy' WHEN 8 THEN 'Richard' 
                 WHEN 9 THEN 'Karen' WHEN 10 THEN 'Charles' ELSE 'Betty' END,
    CASE i % 10 WHEN 0 THEN 'Johnson' WHEN 1 THEN 'Williams' WHEN 2 THEN 'Brown' 
                 WHEN 3 THEN 'Jones' WHEN 4 THEN 'Garcia' WHEN 5 THEN 'Miller'
                 WHEN 6 THEN 'Davis' WHEN 7 THEN 'Rodriguez' WHEN 8 THEN 'Martinez' 
                 ELSE 'Hernandez' END,
    DATE '1950-01-01' + (i % 25000) * INTERVAL '1 day',
    CASE i % 3 WHEN 0 THEN 'M' WHEN 1 THEN 'F' ELSE 'O' END,
    CASE i % 8 WHEN 0 THEN 'A+' WHEN 1 THEN 'A-' WHEN 2 THEN 'B+' 
                 WHEN 3 THEN 'B-' WHEN 4 THEN 'AB+' WHEN 5 THEN 'AB-'
                 WHEN 6 THEN 'O+' ELSE 'O-' END,
    '+1-555-' || lpad((i % 10000)::text, 4, '0'),
    'patient' || i || '@healthcare.com',
    ((i - 1) % 100) + 1,
    ((i - 1) % 200) + 1,
    ((i - 1) % 500) + 1,
    CASE i % 5 WHEN 0 THEN ARRAY['peanuts', 'shellfish'] 
                 WHEN 1 THEN ARRAY['dairy'] 
                 WHEN 2 THEN ARRAY['pollen', 'dust'] 
                 ELSE ARRAY[]::TEXT[] END,
    CASE i % 6 WHEN 0 THEN ARRAY['diabetes', 'hypertension'] 
                 WHEN 1 THEN ARRAY['asthma'] 
                 WHEN 2 THEN ARRAY['arthritis'] 
                 ELSE ARRAY[]::TEXT[] END,
    i % 15 != 0
FROM generate_series(1, 15000) AS s(i);

\echo 'Populating finance domain with 20,000 records...'

-- Finance domain
INSERT INTO finance.accounts (account_number, account_name, account_type, organization_id, location_id, balance, currency, is_active, created_by)
SELECT 
    'ACC-' || lpad(i::text, 10, '0'),
    'Account ' || i,
    CASE i % 5 WHEN 0 THEN 'checking' WHEN 1 THEN 'savings' WHEN 2 THEN 'investment' 
                 WHEN 3 THEN 'loan' ELSE 'credit' END,
    ((i - 1) % 100) + 1,
    ((i - 1) % 200) + 1,
    (random() * 1000000 - 500000)::DECIMAL(15,2),
    CASE i % 4 WHEN 0 THEN 'USD' WHEN 1 THEN 'EUR' WHEN 2 THEN 'GBP' ELSE 'JPY' END,
    i % 20 != 0,
    ((i - 1) % 500) + 1
FROM generate_series(1, 20000) AS s(i);

-- =============================================================================
-- CREATE CROSS-SCHEMA FOREIGN KEY RELATIONSHIPS
-- =============================================================================

\echo 'Creating cross-schema foreign key relationships...'

-- Add some cross-schema foreign keys after ALL domain data is populated
-- Note: We do this carefully to avoid constraint violations

-- Link some load tables to ecommerce products (now that ecommerce.products exists)
DO $$
DECLARE
    i INTEGER;
    max_product_id INTEGER;
    max_patient_id INTEGER;
    max_account_id INTEGER;
BEGIN
    -- Get maximum IDs from domain tables to avoid FK violations
    SELECT COALESCE(MAX(id), 0) INTO max_product_id FROM ecommerce.products;
    SELECT COALESCE(MAX(id), 0) INTO max_patient_id FROM healthcare.patients;
    SELECT COALESCE(MAX(id), 0) INTO max_account_id FROM finance.accounts;
    
    -- Only proceed if we have data to reference
    IF max_product_id > 0 THEN
        FOR i IN 1..1000 LOOP
            IF i % 100 = 0 THEN
                EXECUTE 'UPDATE load_table_' || i || ' 
                         SET ecommerce_product_id = ' || ((i % max_product_id) + 1) || '
                         WHERE id <= 10';
            END IF;
        END LOOP;
    END IF;
    
    -- Link some load tables to healthcare patients
    IF max_patient_id > 0 THEN
        FOR i IN 1..500 LOOP
            IF i % 50 = 0 THEN
                EXECUTE 'UPDATE load_table_' || i || ' 
                         SET healthcare_patient_id = ' || ((i % max_patient_id) + 1) || '
                         WHERE id <= 5';
            END IF;
        END LOOP;
    END IF;
    
    -- Link some load tables to finance accounts
    IF max_account_id > 0 THEN
        FOR i IN 1..500 LOOP
            IF i % 75 = 0 THEN
                EXECUTE 'UPDATE load_table_' || i || ' 
                         SET finance_account_id = ' || ((i % max_account_id) + 1) || '
                         WHERE id <= 5';
            END IF;
        END LOOP;
    END IF;
END $$;

-- =============================================================================
-- POPULATE LOAD TABLES WITH MASSIVE AMOUNTS OF DATA IN BATCHES
-- =============================================================================

\echo 'Populating 10,000 load tables with 1,000,000+ records (this may take several minutes)...'

-- Populate first 10,000 load tables with data (in batches to avoid memory issues)
DO $$
DECLARE
    batch_start INTEGER;
    batch_end INTEGER;
    i INTEGER;
BEGIN
    FOR batch_start IN 1..10000 BY 500 LOOP
        batch_end := LEAST(batch_start + 499, 10000);
        RAISE NOTICE 'Populating load tables % to %', batch_start, batch_end;
        
        FOR i IN batch_start..batch_end LOOP
            EXECUTE 'INSERT INTO load_table_' || i || ' (load_id, name, category, subcategory, status, priority, score, tags, metadata, region, quantity, price, weight, volume, description, notes)
                SELECT 
                    ''LOAD_' || i || '_'' || j,
                    ''Load Item '' || j,
                    ''Category_'' || (j % 100),
                    ''Subcategory_'' || (j % 20),
                    CASE j % 5 WHEN 0 THEN ''active'' WHEN 1 THEN ''pending'' 
                              WHEN 2 THEN ''completed'' WHEN 3 THEN ''cancelled'' 
                              ELSE ''draft'' END,
                    j % 10,
                    random() * 1000,
                    ARRAY[''tag'' || (j % 50), ''category'' || (j % 20)],
                    jsonb_build_object(
                        ''level'', j % 100,
                        ''type'', ''load_test'',
                        ''batch'', ' || i || ',
                        ''random_value'', random()
                    ),
                    ''region_'' || (j % 10),
                    (j % 1000) + 1,
                    (random() * 10000)::DECIMAL(12,2),
                    (random() * 100)::DECIMAL(10,3),
                    (random() * 1000)::DECIMAL(10,3),
                    ''Comprehensive description for load test item in table ' || i || ' number '' || j,
                    ''Additional notes for item '' || j
                FROM generate_series(1, 100) AS s(j)';
        END LOOP;
        
        COMMIT;
    END LOOP;
END $$;


-- =============================================================================
-- SUMMARY OF MASSIVE DATA CREATION
-- =============================================================================
-- This creates:
-- - 170+ schemas, each with 100 organizations, 200 locations, 500 users, 100 categories
-- - 85,000+ organizations total
-- - 34,000+ locations total  
-- - 85,000+ users total
-- - 17,000+ categories total
-- - 10,000 ecommerce products
-- - 25,000 ecommerce customers
-- - 15,000 healthcare patients
-- - 20,000 finance accounts
-- - 10,000 populated load tables with 100 records each = 1,000,000 load records
-- - Plus 40,000 additional empty load tables (50,000 total)
-- 
-- Grand total: 1,000,000+ records across 50,000+ tables in 170+ schemas
-- This should absolutely demolish any database management UI that can't handle scale!

\echo '========================================='
\echo 'DATA POPULATION COMPLETE!'
\echo 'Successfully created:'
\echo '- 170+ schemas with 85,000+ organizations, 34,000+ locations, 85,000+ users, 17,000+ categories'
\echo '- 10,000 ecommerce products + 25,000 customers' 
\echo '- 15,000 healthcare patients'
\echo '- 20,000 finance accounts'
\echo '- 1,000,000+ records in 10,000 populated load tables'
\echo '- Cross-schema foreign key relationships'
\echo 'Total: 1,200,000+ records across 50,000+ tables!'
\echo '========================================='
