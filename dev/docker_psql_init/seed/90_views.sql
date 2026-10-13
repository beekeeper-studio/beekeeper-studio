-- Views and materialized views over the core tables.
-- Runs on every supported version (9.6+).

SET client_min_messages = warning;

CREATE VIEW active_customers AS
SELECT id, account_id, first_name, last_name, email, company_name, lifecycle_stage, total_orders, total_spent, last_order_at
FROM customers
WHERE deleted_at IS NULL AND churned_at IS NULL;

CREATE VIEW open_tickets AS
SELECT t.id, t.subject, t.status, t.priority, t.created_at, a.name AS account_name, u.email AS assignee_email
FROM support_tickets t
JOIN accounts a ON a.id = t.account_id
LEFT JOIN users u ON u.id = t.assignee_id
WHERE t.status NOT IN ('solved', 'closed');

CREATE MATERIALIZED VIEW account_revenue_monthly AS
SELECT
  o.account_id,
  date_trunc('month', o.placed_at)::date AS month,
  o.currency,
  count(*) AS orders,
  sum(o.total) AS revenue,
  avg(o.total)::numeric(12, 2) AS average_order_value
FROM orders o
WHERE o.status NOT IN ('draft', 'cancelled')
GROUP BY 1, 2, 3;
CREATE UNIQUE INDEX account_revenue_monthly_key ON account_revenue_monthly (account_id, month, currency);
