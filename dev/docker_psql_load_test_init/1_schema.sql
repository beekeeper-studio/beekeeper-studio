-- PostgreSQL 15 INSANE Load Test Schema
-- 200+ schemas, thousands of tables, complex foreign key relationships
-- This will absolutely destroy any UI that can't handle massive datasets

-- =============================================================================
-- GENERATE 200+ BUSINESS DOMAIN SCHEMAS
-- =============================================================================

\echo '========================================='  
\echo 'PHASE 1: Creating 170+ business schemas...'
\echo '=========================================' 

-- Create schemas dynamically
SELECT 'CREATE SCHEMA IF NOT EXISTS ' || schema_name || ';'
FROM (
    VALUES 
    -- Business domains (50 schemas)
    ('accounting'), ('advertising'), ('aerospace'), ('agriculture'), ('analytics'),
    ('architecture'), ('automotive'), ('aviation'), ('banking'), ('biotechnology'),
    ('blockchain'), ('broadcasting'), ('construction'), ('consulting'), ('cybersecurity'),
    ('defense'), ('ecommerce'), ('education'), ('energy'), ('entertainment'),
    ('fashion'), ('finance'), ('fitness'), ('food_service'), ('gaming'),
    ('healthcare'), ('hospitality'), ('hr_management'), ('insurance'), ('iot'),
    ('legal'), ('logistics'), ('manufacturing'), ('marketing'), ('media'),
    ('mining'), ('music'), ('nonprofit'), ('pharmaceuticals'), ('real_estate'),
    ('retail'), ('robotics'), ('social_media'), ('software'), ('sports'),
    ('telecommunications'), ('tourism'), ('transportation'), ('utilities'), ('veterinary'),
    
    -- Geographic regions (50 schemas)
    ('region_north_america'), ('region_south_america'), ('region_europe'), ('region_asia'), ('region_africa'),
    ('region_oceania'), ('country_usa'), ('country_canada'), ('country_mexico'), ('country_brazil'),
    ('country_argentina'), ('country_uk'), ('country_france'), ('country_germany'), ('country_spain'),
    ('country_italy'), ('country_russia'), ('country_china'), ('country_japan'), ('country_india'),
    ('country_australia'), ('country_south_africa'), ('state_california'), ('state_texas'), ('state_newyork'),
    ('state_florida'), ('city_london'), ('city_paris'), ('city_tokyo'), ('city_sydney'),
    ('city_dubai'), ('city_singapore'), ('city_mumbai'), ('city_toronto'), ('city_berlin'),
    ('city_madrid'), ('city_rome'), ('city_moscow'), ('city_beijing'), ('city_seoul'),
    ('zone_americas'), ('zone_emea'), ('zone_apac'), ('zone_latam'), ('zone_mena'),
    ('district_north'), ('district_south'), ('district_east'), ('district_west'), ('district_central'),
    
    -- Organizational departments (50 schemas)
    ('dept_executive'), ('dept_operations'), ('dept_finance'), ('dept_hr'), ('dept_it'),
    ('dept_sales'), ('dept_marketing'), ('dept_engineering'), ('dept_design'), ('dept_product'),
    ('dept_customer_service'), ('dept_legal'), ('dept_compliance'), ('dept_security'), ('dept_facilities'),
    ('dept_procurement'), ('dept_logistics'), ('dept_warehouse'), ('dept_manufacturing'), ('dept_quality'),
    ('dept_research'), ('dept_development'), ('dept_innovation'), ('dept_training'), ('dept_consulting'),
    ('dept_business_intel'), ('dept_data_science'), ('dept_analytics'), ('dept_reporting'), ('dept_audit'),
    ('division_consumer'), ('division_enterprise'), ('division_government'), ('division_education'), ('division_healthcare'),
    ('unit_mobile'), ('unit_web'), ('unit_cloud'), ('unit_ai'), ('unit_blockchain'),
    ('team_backend'), ('team_frontend'), ('team_devops'), ('team_qa'), ('team_ux'),
    ('squad_alpha'), ('squad_beta'), ('squad_gamma'), ('squad_delta'), ('squad_epsilon'),
    
    -- System/Technical schemas (50 schemas)
    ('sys_monitoring'), ('sys_logging'), ('sys_metrics'), ('sys_alerts'), ('sys_backups'),
    ('sys_security'), ('sys_audit'), ('sys_config'), ('sys_cache'), ('sys_queue'),
    ('api_v1'), ('api_v2'), ('api_v3'), ('api_internal'), ('api_external'),
    ('microservice_auth'), ('microservice_user'), ('microservice_order'), ('microservice_payment'), ('microservice_notification'),
    ('microservice_inventory'), ('microservice_catalog'), ('microservice_review'), ('microservice_shipping'), ('microservice_analytics'),
    ('data_raw'), ('data_processed'), ('data_aggregated'), ('data_archive'), ('data_temp'),
    ('etl_staging'), ('etl_transform'), ('etl_load'), ('warehouse_dim'), ('warehouse_fact'),
    ('ml_training'), ('ml_inference'), ('ml_models'), ('ml_features'), ('ml_experiments'),
    ('event_sourcing'), ('event_streams'), ('event_snapshots'), ('batch_processing'), ('realtime_processing'),
    ('integration_crm'), ('integration_erp'), ('integration_payment'), ('integration_shipping'), ('integration_email'),
    ('archive_2020'), ('archive_2021'), ('archive_2022'), ('archive_2023'), ('archive_2024'),
    
    -- Industry verticals (20 schemas)
    ('vertical_retail'), ('vertical_manufacturing'), ('vertical_healthcare'), ('vertical_education'), ('vertical_government'),
    ('vertical_nonprofit'), ('vertical_startup'), ('vertical_enterprise'), ('vertical_smb'), ('vertical_freelancer'),
    ('industry_fintech'), ('industry_edtech'), ('industry_healthtech'), ('industry_proptech'), ('industry_agtech'),
    ('industry_cleantech'), ('industry_biotech'), ('industry_martech'), ('industry_hrtech'), ('industry_legaltech')
) AS schemas(schema_name)
\gexec

-- =============================================================================
-- CORE ENTITY TABLES IN EACH SCHEMA (Base tables that others reference)
-- =============================================================================

\echo '========================================='  
\echo 'PHASE 2: Creating core entity tables in each schema...'
\echo 'This creates 4 tables per schema (680+ tables total)'
\echo '=========================================' 

-- Create core entity tables in each schema
SELECT 
'-- Core entities for schema: ' || schema_name || E'\n' ||
'CREATE TABLE ' || schema_name || '.organizations (' || E'\n' ||
'    id SERIAL PRIMARY KEY,' || E'\n' ||
'    name VARCHAR(200) NOT NULL,' || E'\n' ||
'    code VARCHAR(50) UNIQUE NOT NULL,' || E'\n' ||
'    type VARCHAR(50),' || E'\n' ||
'    status VARCHAR(20) DEFAULT ''active'',' || E'\n' ||
'    parent_org_id INT,' || E'\n' ||
'    created_at TIMESTAMP DEFAULT NOW(),' || E'\n' ||
'    updated_at TIMESTAMP DEFAULT NOW()' || E'\n' ||
');' || E'\n\n' ||
'CREATE TABLE ' || schema_name || '.locations (' || E'\n' ||
'    id SERIAL PRIMARY KEY,' || E'\n' ||
'    name VARCHAR(150) NOT NULL,' || E'\n' ||
'    address TEXT,' || E'\n' ||
'    city VARCHAR(100),' || E'\n' ||
'    region VARCHAR(100),' || E'\n' ||
'    country VARCHAR(100),' || E'\n' ||
'    postal_code VARCHAR(20),' || E'\n' ||
'    coordinates POINT,' || E'\n' ||
'    timezone VARCHAR(50),' || E'\n' ||
'    organization_id INT REFERENCES ' || schema_name || '.organizations(id),' || E'\n' ||
'    created_at TIMESTAMP DEFAULT NOW()' || E'\n' ||
');' || E'\n\n' ||
'CREATE TABLE ' || schema_name || '.users (' || E'\n' ||
'    id SERIAL PRIMARY KEY,' || E'\n' ||
'    username VARCHAR(100) UNIQUE NOT NULL,' || E'\n' ||
'    email VARCHAR(200) UNIQUE NOT NULL,' || E'\n' ||
'    first_name VARCHAR(100),' || E'\n' ||
'    last_name VARCHAR(100),' || E'\n' ||
'    role VARCHAR(50),' || E'\n' ||
'    department VARCHAR(100),' || E'\n' ||
'    organization_id INT REFERENCES ' || schema_name || '.organizations(id),' || E'\n' ||
'    location_id INT REFERENCES ' || schema_name || '.locations(id),' || E'\n' ||
'    manager_id INT REFERENCES ' || schema_name || '.users(id),' || E'\n' ||
'    hire_date DATE,' || E'\n' ||
'    is_active BOOLEAN DEFAULT TRUE,' || E'\n' ||
'    last_login TIMESTAMP,' || E'\n' ||
'    created_at TIMESTAMP DEFAULT NOW(),' || E'\n' ||
'    updated_at TIMESTAMP DEFAULT NOW()' || E'\n' ||
');' || E'\n\n' ||
'CREATE TABLE ' || schema_name || '.categories (' || E'\n' ||
'    id SERIAL PRIMARY KEY,' || E'\n' ||
'    name VARCHAR(150) NOT NULL,' || E'\n' ||
'    description TEXT,' || E'\n' ||
'    parent_category_id INT REFERENCES ' || schema_name || '.categories(id),' || E'\n' ||
'    hierarchy_path VARCHAR(500),' || E'\n' ||
'    level_depth INT DEFAULT 1,' || E'\n' ||
'    sort_order INT DEFAULT 0,' || E'\n' ||
'    is_active BOOLEAN DEFAULT TRUE,' || E'\n' ||
'    organization_id INT REFERENCES ' || schema_name || '.organizations(id),' || E'\n' ||
'    created_by INT REFERENCES ' || schema_name || '.users(id),' || E'\n' ||
'    created_at TIMESTAMP DEFAULT NOW()' || E'\n' ||
');'
FROM (
    VALUES 
    ('accounting'), ('advertising'), ('aerospace'), ('agriculture'), ('analytics'),
    ('architecture'), ('automotive'), ('aviation'), ('banking'), ('biotechnology'),
    ('blockchain'), ('broadcasting'), ('construction'), ('consulting'), ('cybersecurity'),
    ('defense'), ('ecommerce'), ('education'), ('energy'), ('entertainment'),
    ('fashion'), ('finance'), ('fitness'), ('food_service'), ('gaming'),
    ('healthcare'), ('hospitality'), ('hr_management'), ('insurance'), ('iot'),
    ('legal'), ('logistics'), ('manufacturing'), ('marketing'), ('media'),
    ('mining'), ('music'), ('nonprofit'), ('pharmaceuticals'), ('real_estate'),
    ('retail'), ('robotics'), ('social_media'), ('software'), ('sports'),
    ('telecommunications'), ('tourism'), ('transportation'), ('utilities'), ('veterinary'),
    ('region_north_america'), ('region_south_america'), ('region_europe'), ('region_asia'), ('region_africa'),
    ('region_oceania'), ('country_usa'), ('country_canada'), ('country_mexico'), ('country_brazil'),
    ('country_argentina'), ('country_uk'), ('country_france'), ('country_germany'), ('country_spain'),
    ('country_italy'), ('country_russia'), ('country_china'), ('country_japan'), ('country_india'),
    ('country_australia'), ('country_south_africa'), ('state_california'), ('state_texas'), ('state_newyork'),
    ('state_florida'), ('city_london'), ('city_paris'), ('city_tokyo'), ('city_sydney'),
    ('city_dubai'), ('city_singapore'), ('city_mumbai'), ('city_toronto'), ('city_berlin'),
    ('city_madrid'), ('city_rome'), ('city_moscow'), ('city_beijing'), ('city_seoul'),
    ('zone_americas'), ('zone_emea'), ('zone_apac'), ('zone_latam'), ('zone_mena'),
    ('district_north'), ('district_south'), ('district_east'), ('district_west'), ('district_central'),
    ('dept_executive'), ('dept_operations'), ('dept_finance'), ('dept_hr'), ('dept_it'),
    ('dept_sales'), ('dept_marketing'), ('dept_engineering'), ('dept_design'), ('dept_product'),
    ('dept_customer_service'), ('dept_legal'), ('dept_compliance'), ('dept_security'), ('dept_facilities'),
    ('dept_procurement'), ('dept_logistics'), ('dept_warehouse'), ('dept_manufacturing'), ('dept_quality'),
    ('dept_research'), ('dept_development'), ('dept_innovation'), ('dept_training'), ('dept_consulting'),
    ('dept_business_intel'), ('dept_data_science'), ('dept_analytics'), ('dept_reporting'), ('dept_audit'),
    ('division_consumer'), ('division_enterprise'), ('division_government'), ('division_education'), ('division_healthcare'),
    ('unit_mobile'), ('unit_web'), ('unit_cloud'), ('unit_ai'), ('unit_blockchain'),
    ('team_backend'), ('team_frontend'), ('team_devops'), ('team_qa'), ('team_ux'),
    ('squad_alpha'), ('squad_beta'), ('squad_gamma'), ('squad_delta'), ('squad_epsilon'),
    ('sys_monitoring'), ('sys_logging'), ('sys_metrics'), ('sys_alerts'), ('sys_backups'),
    ('sys_security'), ('sys_audit'), ('sys_config'), ('sys_cache'), ('sys_queue'),
    ('api_v1'), ('api_v2'), ('api_v3'), ('api_internal'), ('api_external'),
    ('microservice_auth'), ('microservice_user'), ('microservice_order'), ('microservice_payment'), ('microservice_notification'),
    ('microservice_inventory'), ('microservice_catalog'), ('microservice_review'), ('microservice_shipping'), ('microservice_analytics'),
    ('data_raw'), ('data_processed'), ('data_aggregated'), ('data_archive'), ('data_temp'),
    ('etl_staging'), ('etl_transform'), ('etl_load'), ('warehouse_dim'), ('warehouse_fact'),
    ('ml_training'), ('ml_inference'), ('ml_models'), ('ml_features'), ('ml_experiments'),
    ('event_sourcing'), ('event_streams'), ('event_snapshots'), ('batch_processing'), ('realtime_processing'),
    ('integration_crm'), ('integration_erp'), ('integration_payment'), ('integration_shipping'), ('integration_email'),
    ('archive_2020'), ('archive_2021'), ('archive_2022'), ('archive_2023'), ('archive_2024'),
    ('vertical_retail'), ('vertical_manufacturing'), ('vertical_healthcare'), ('vertical_education'), ('vertical_government'),
    ('vertical_nonprofit'), ('vertical_startup'), ('vertical_enterprise'), ('vertical_smb'), ('vertical_freelancer'),
    ('industry_fintech'), ('industry_edtech'), ('industry_healthtech'), ('industry_proptech'), ('industry_agtech'),
    ('industry_cleantech'), ('industry_biotech'), ('industry_martech'), ('industry_hrtech'), ('industry_legaltech')
) AS schemas(schema_name)
\gexec

-- =============================================================================
-- BUSINESS DOMAIN SPECIFIC TABLES
-- =============================================================================

-- ECOMMERCE DOMAIN TABLES
CREATE TABLE ecommerce.products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(300) NOT NULL,
    description TEXT,
    category_id INT REFERENCES ecommerce.categories(id),
    organization_id INT REFERENCES ecommerce.organizations(id),
    brand VARCHAR(100),
    price DECIMAL(12,2),
    cost DECIMAL(12,2),
    weight DECIMAL(10,3),
    dimensions VARCHAR(100),
    inventory_count INT DEFAULT 0,
    min_stock_level INT DEFAULT 0,
    is_digital BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT REFERENCES ecommerce.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.customers (
    id SERIAL PRIMARY KEY,
    customer_number VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    birth_date DATE,
    organization_id INT REFERENCES ecommerce.organizations(id),
    location_id INT REFERENCES ecommerce.locations(id),
    customer_since DATE DEFAULT CURRENT_DATE,
    lifetime_value DECIMAL(15,2) DEFAULT 0,
    loyalty_points INT DEFAULT 0,
    preferred_language VARCHAR(10) DEFAULT 'en',
    marketing_opt_in BOOLEAN DEFAULT TRUE,
    is_vip BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id INT REFERENCES ecommerce.customers(id),
    organization_id INT REFERENCES ecommerce.organizations(id),
    location_id INT REFERENCES ecommerce.locations(id),
    order_date TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending',
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_status VARCHAR(30) DEFAULT 'pending',
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(200),
    notes TEXT,
    processed_by INT REFERENCES ecommerce.users(id),
    shipped_date TIMESTAMP,
    delivered_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ecommerce.order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES ecommerce.orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES ecommerce.products(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    tax_rate DECIMAL(5,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- HEALTHCARE DOMAIN TABLES
CREATE TABLE healthcare.patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    blood_type VARCHAR(5),
    phone VARCHAR(50),
    email VARCHAR(200),
    organization_id INT REFERENCES healthcare.organizations(id),
    location_id INT REFERENCES healthcare.locations(id),
    primary_doctor_id INT REFERENCES healthcare.users(id),
    insurance_number VARCHAR(100),
    emergency_contact VARCHAR(200),
    emergency_phone VARCHAR(50),
    allergies TEXT[],
    chronic_conditions TEXT[],
    preferred_language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE healthcare.appointments (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES healthcare.patients(id),
    doctor_id INT REFERENCES healthcare.users(id),
    organization_id INT REFERENCES healthcare.organizations(id),
    location_id INT REFERENCES healthcare.locations(id),
    appointment_date TIMESTAMP NOT NULL,
    duration_minutes INT DEFAULT 30,
    appointment_type VARCHAR(100),
    status VARCHAR(30) DEFAULT 'scheduled',
    reason TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    prescription TEXT,
    notes TEXT,
    created_by INT REFERENCES healthcare.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE healthcare.medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES healthcare.patients(id),
    appointment_id INT REFERENCES healthcare.appointments(id),
    doctor_id INT REFERENCES healthcare.users(id),
    organization_id INT REFERENCES healthcare.organizations(id),
    visit_date TIMESTAMP NOT NULL,
    chief_complaint TEXT,
    symptoms TEXT[],
    diagnosis TEXT,
    treatment TEXT,
    medications TEXT[],
    lab_results JSONB,
    vitals JSONB,
    follow_up_instructions TEXT,
    created_by INT REFERENCES healthcare.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- FINANCIAL DOMAIN TABLES
CREATE TABLE finance.accounts (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(200) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    organization_id INT REFERENCES finance.organizations(id),
    location_id INT REFERENCES finance.locations(id),
    parent_account_id INT REFERENCES finance.accounts(id),
    balance DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    opened_date DATE DEFAULT CURRENT_DATE,
    closed_date DATE,
    description TEXT,
    created_by INT REFERENCES finance.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE finance.transactions (
    id SERIAL PRIMARY KEY,
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    account_id INT REFERENCES finance.accounts(id),
    counterpart_account_id INT REFERENCES finance.accounts(id),
    organization_id INT REFERENCES finance.organizations(id),
    transaction_date TIMESTAMP DEFAULT NOW(),
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1,
    description TEXT,
    reference_number VARCHAR(200),
    status VARCHAR(30) DEFAULT 'completed',
    reconciled BOOLEAN DEFAULT FALSE,
    reconciled_date TIMESTAMP,
    category VARCHAR(100),
    tags TEXT[],
    created_by INT REFERENCES finance.users(id),
    approved_by INT REFERENCES finance.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- GENERATE MASSIVE NUMBER OF LOAD TABLES WITH COMPLEX RELATIONSHIPS
-- =============================================================================

-- Create 50,000+ load tables using BULK generation for maximum speed
-- This generates all CREATE TABLE statements at once and executes them via \gexec

\echo '========================================='
\echo 'PHASE 3: Creating 50,000 load tables...'
\echo 'This may take several minutes but is much faster than the old approach!'
\echo '========================================='

-- Generate all 50,000 table creation statements in one massive SELECT
SELECT 
'CREATE TABLE load_table_' || i || ' (' || E'\n' ||
'    id SERIAL PRIMARY KEY,' || E'\n' ||
'    load_id VARCHAR(50) UNIQUE NOT NULL DEFAULT ''LOAD_' || i || ''',' || E'\n' ||
'    name VARCHAR(200) NOT NULL DEFAULT ''Load Test Item ' || i || ''',' || E'\n' ||
'    category VARCHAR(100) DEFAULT ''Category_' || (i % 1000) || ''',' || E'\n' ||
'    subcategory VARCHAR(100) DEFAULT ''Subcategory_' || (i % 100) || ''',' || E'\n' ||
'' || E'\n' ||
'    -- Self-referential FK' || E'\n' ||
'    parent_load_id INT,' || E'\n' ||
'' || E'\n' ||
'    -- Cross-schema foreign keys to create complex relationships' || E'\n' ||
'    ecommerce_product_id INT,' || E'\n' ||
'    healthcare_patient_id INT,' || E'\n' ||
'    finance_account_id INT,' || E'\n' ||
'' || E'\n' ||
'    -- Reference to other load tables (circular dependencies)' || E'\n' ||
'    related_load_1_id INT,' || E'\n' ||
'    related_load_2_id INT,' || E'\n' ||
'    related_load_3_id INT,' || E'\n' ||
'' || E'\n' ||
'    -- Various data types for testing' || E'\n' ||
'    status VARCHAR(50) DEFAULT CASE ' || i || ' % 5' || E'\n' ||
'        WHEN 0 THEN ''active''' || E'\n' ||
'        WHEN 1 THEN ''pending''' || E'\n' ||
'        WHEN 2 THEN ''completed''' || E'\n' ||
'        WHEN 3 THEN ''cancelled''' || E'\n' ||
'        ELSE ''draft''' || E'\n' ||
'    END,' || E'\n' ||
'' || E'\n' ||
'    priority INT DEFAULT ' || (i % 10) || ',' || E'\n' ||
'    score DECIMAL(10,4) DEFAULT random() * 1000,' || E'\n' ||
'    percentage DECIMAL(5,2) DEFAULT random() * 100,' || E'\n' ||
'' || E'\n' ||
'    -- Array and JSON columns for complexity' || E'\n' ||
'    tags TEXT[] DEFAULT ARRAY[''tag' || (i % 50) || ''', ''category' || (i % 20) || '''],' || E'\n' ||
'    metadata JSONB DEFAULT jsonb_build_object(' || E'\n' ||
'        ''level'', ' || (i % 100) || ',' || E'\n' ||
'        ''type'', ''load_test'',' || E'\n' ||
'        ''batch'', ' || (i / 1000) || ',' || E'\n' ||
'        ''table_id'', ' || i || ',' || E'\n' ||
'        ''random_seed'', ' || (i * 37) || E'\n' ||
'    ),' || E'\n' ||
'' || E'\n' ||
'    -- Geographic data' || E'\n' ||
'    coordinates POINT DEFAULT point((' || ((i * 13) % 360 - 180) || '), (' || ((i * 17) % 180 - 90) || ')),' || E'\n' ||
'    region VARCHAR(50) DEFAULT ''region_' || (i % 10) || ''',' || E'\n' ||
'' || E'\n' ||
'    -- Temporal data with variety' || E'\n' ||
'    start_date DATE DEFAULT CURRENT_DATE - INTERVAL ''' || (i % 365) || ' days'',' || E'\n' ||
'    end_date DATE DEFAULT CURRENT_DATE + INTERVAL ''' || (i % 30) || ' days'',' || E'\n' ||
'    created_at TIMESTAMP DEFAULT NOW() - INTERVAL ''' || (i % 168) || ' hours'',' || E'\n' ||
'    updated_at TIMESTAMP DEFAULT NOW() - INTERVAL ''' || (i % 60) || ' minutes'',' || E'\n' ||
'' || E'\n' ||
'    -- Boolean flags for filtering tests' || E'\n' ||
'    is_active BOOLEAN DEFAULT ' || (CASE WHEN i % 2 = 0 THEN 'TRUE' ELSE 'FALSE' END) || ',' || E'\n' ||
'    is_featured BOOLEAN DEFAULT ' || (CASE WHEN i % 5 = 0 THEN 'TRUE' ELSE 'FALSE' END) || ',' || E'\n' ||
'    is_premium BOOLEAN DEFAULT ' || (CASE WHEN i % 10 = 0 THEN 'TRUE' ELSE 'FALSE' END) || ',' || E'\n' ||
'' || E'\n' ||
'    -- Text fields for search testing' || E'\n' ||
'    description TEXT DEFAULT ''This is a comprehensive description for load test item number ' || i || '. It contains various keywords and phrases to test search functionality.'',' || E'\n' ||
'    notes TEXT DEFAULT ''Additional notes and comments for item ' || i || ''',' || E'\n' ||
'' || E'\n' ||
'    -- Numeric fields for aggregation testing' || E'\n' ||
'    quantity INT DEFAULT ' || (i % 1000 + 1) || ',' || E'\n' ||
'    price DECIMAL(12,2) DEFAULT ' || ((i * 7) % 10000 + 100)::DECIMAL(12,2) || ',' || E'\n' ||
'    weight DECIMAL(10,3) DEFAULT ' || ((i * 11) % 100 + 1)::DECIMAL(10,3) || ',' || E'\n' ||
'    volume DECIMAL(10,3) DEFAULT ' || ((i * 19) % 1000 + 10)::DECIMAL(10,3) || E'\n' ||
');'
FROM generate_series(1, 50000) AS s(i)
\gexec

\echo '========================================='  
\echo 'PHASE 4: Adding foreign key constraints...'
\echo 'Adding 25,000+ self-referential constraints...'
\echo '=========================================' 

-- Add foreign key constraints AFTER table creation to avoid circular dependency issues
-- BULK generation of self-referential FKs for maximum speed

-- Generate all self-referential foreign key constraints at once
SELECT 
'ALTER TABLE load_table_' || i || E'\n' ||
'    ADD CONSTRAINT fk_parent_load_' || i || E'\n' ||
'    FOREIGN KEY (parent_load_id) REFERENCES load_table_' || (((i - 1) % 50000) + 1) || '(id);'
FROM generate_series(2, 25000) AS s(i)
\gexec

\echo 'Adding 5,000+ cross-reference constraints (related_load_1_id)...'

-- BULK generation of cross-reference FKs (every 3rd table gets related_load_1_id FK)
SELECT 
'ALTER TABLE load_table_' || i || E'\n' ||
'    ADD CONSTRAINT fk_related_1_' || i || E'\n' ||
'    FOREIGN KEY (related_load_1_id) REFERENCES load_table_' || (((i + 1000) % 50000) + 1) || '(id);'
FROM generate_series(1, 15000) AS s(i)
WHERE i % 3 = 0
\gexec

\echo 'Adding 3,000+ additional cross-reference constraints (related_load_2_id)...'

-- BULK generation of additional cross-reference FKs (every 5th table gets related_load_2_id FK)
SELECT 
'ALTER TABLE load_table_' || i || E'\n' ||
'    ADD CONSTRAINT fk_related_2_' || i || E'\n' ||
'    FOREIGN KEY (related_load_2_id) REFERENCES load_table_' || (((i + 5000) % 50000) + 1) || '(id);'
FROM generate_series(1, 15000) AS s(i)
WHERE i % 5 = 0
\gexec

-- =============================================================================
-- CROSS-SCHEMA FOREIGN KEYS (After base data is inserted)
-- =============================================================================

-- Note: These will be added in the data file after we insert base records

-- =============================================================================
-- INDEXES FOR TESTING INDEX PERFORMANCE
-- =============================================================================

\echo '========================================='  
\echo 'PHASE 5: Creating indexes for performance testing...'
\echo 'This creates thousands of indexes across different table types'
\echo '=========================================' 

-- BULK generation of indexes on various combinations of columns for maximum speed

\echo 'Creating 1,000+ name indexes...'

-- Create name indexes (every 10th table)
SELECT 'CREATE INDEX idx_load_' || i || '_name ON load_table_' || i || '(name);'
FROM generate_series(1, 10000) AS s(i)
WHERE i % 10 = 0
\gexec

\echo 'Creating 667+ category indexes...'

-- Create category indexes (every 15th table)
SELECT 'CREATE INDEX idx_load_' || i || '_category ON load_table_' || i || '(category);'
FROM generate_series(1, 10000) AS s(i)
WHERE i % 15 = 0
\gexec

\echo 'Creating 500+ composite status+priority indexes...'

-- Create composite status+priority indexes (every 20th table)
SELECT 'CREATE INDEX idx_load_' || i || '_status_priority ON load_table_' || i || '(status, priority);'
FROM generate_series(1, 10000) AS s(i)
WHERE i % 20 = 0
\gexec

\echo 'Creating 400+ temporal indexes on created_at...'

-- Create created_at indexes (every 25th table)
SELECT 'CREATE INDEX idx_load_' || i || '_created ON load_table_' || i || '(created_at);'
FROM generate_series(1, 10000) AS s(i)
WHERE i % 25 = 0
\gexec

\echo 'Creating 100+ GIN indexes for JSONB metadata columns...'

-- Create GIN indexes for JSONB metadata columns (every 50th table)
SELECT 'CREATE INDEX idx_load_' || i || '_metadata ON load_table_' || i || ' USING GIN(metadata);'
FROM generate_series(1, 5000) AS s(i)
WHERE i % 50 = 0
\gexec

-- =============================================================================
-- MATERIALIZED VIEWS FOR TESTING
-- =============================================================================

-- Create some materialized views that aggregate across multiple schemas
CREATE MATERIALIZED VIEW mv_cross_schema_summary AS
SELECT 
    'ecommerce' AS domain,
    COUNT(*) AS total_records,
    COUNT(DISTINCT organization_id) AS organizations,
    MAX(created_at) AS latest_record
FROM ecommerce.products
UNION ALL
SELECT 
    'healthcare' AS domain,
    COUNT(*) AS total_records,
    COUNT(DISTINCT organization_id) AS organizations,
    MAX(created_at) AS latest_record  
FROM healthcare.patients
UNION ALL
SELECT 
    'finance' AS domain,
    COUNT(*) AS total_records,
    COUNT(DISTINCT organization_id) AS organizations,
    MAX(created_at) AS latest_record
FROM finance.accounts;

-- Create summary view of load tables
CREATE MATERIALIZED VIEW mv_load_table_summary AS
SELECT 
    'load_tables' AS source,
    COUNT(*) AS total_tables
FROM information_schema.tables 
WHERE table_name LIKE 'load_table_%'
AND table_schema = 'public';

-- =============================================================================
-- PARTITIONED TABLES FOR TESTING (PostgreSQL 15 feature)
-- =============================================================================

-- Create a partitioned table for time-series data
CREATE TABLE analytics_events (
    id BIGSERIAL,
    event_name VARCHAR(100) NOT NULL,
    user_id VARCHAR(50),
    organization_id INT,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions for different time periods
CREATE TABLE analytics_events_2023 PARTITION OF analytics_events
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
    
CREATE TABLE analytics_events_2024 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
    
CREATE TABLE analytics_events_2025 PARTITION OF analytics_events
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================
-- This schema creates:
-- - 170+ schemas with business/geographic/organizational structure
-- - 4+ core tables per schema = 680+ base tables
-- - 3 main domain tables (ecommerce, healthcare, finance) = ~15 tables
-- - 50,000 load_table_* tables with complex relationships
-- - Thousands of foreign key constraints
-- - Thousands of indexes
-- - Multiple materialized views
-- - Partitioned tables
\echo 'Ready for data population phase...'

-- Total: 50,000+ tables across 170+ schemas with massive interconnectivity

\echo '========================================='  
\echo 'SCHEMA CREATION COMPLETE!'
\echo 'Created:'
\echo '- 170+ schemas with business/geographic/organizational structure' 
\echo '- 680+ core entity tables (organizations, locations, users, categories)'
\echo '- 50,000 load test tables with complex relationships'
\echo '- 28,000+ foreign key constraints'
\echo '- 3,000+ indexes (B-tree, GIN, composite)'
\echo '- Multiple materialized views and partitioned tables'
\echo 'Total: 50,000+ tables across 170+ schemas'
\echo '=========================================' 

-- This should absolutely stress test any database management UI!