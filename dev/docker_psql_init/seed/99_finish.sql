-- Remove the seed helpers. Statistics are left to autovacuum, which analyzes the new
-- tables shortly after the server starts (an explicit ANALYZE here adds ~10s to init).

SET client_min_messages = warning;

DROP SCHEMA seed CASCADE;
