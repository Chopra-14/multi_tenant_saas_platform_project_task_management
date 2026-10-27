-- seeds/seed_data.sql

-- Insert Super Admin (password: Admin@123)
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active)
VALUES (
    uuid_generate_v4(),
    NULL,
    'superadmin@system.com',
    crypt('Admin@123', gen_salt('bf', 12)),
    'Super Admin',
    'super_admin',
    true
);

-- Insert Demo Tenant (free plan limits will be overridden later)
INSERT INTO tenants (id, name, subdomain, status, subscription_plan, max_users, max_projects, created_at, updated_at)
VALUES (
    uuid_generate_v4(),
    'Demo Company',
    'demo',
    'active',
    'pro',
    25,
    15,
    now(),
    now()
) RETURNING id INTO demo_tenant_id;

-- Insert Tenant Admin (password: Demo@123)
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active)
VALUES (
    uuid_generate_v4(),
    demo_tenant_id,
    'admin@demo.com',
    crypt('Demo@123', gen_salt('bf', 12)),
    'Demo Admin',
    'tenant_admin',
    true
) RETURNING id INTO demo_admin_id;

-- Insert Regular Users (password: User@123)
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active)
VALUES
    (uuid_generate_v4(), demo_tenant_id, 'user1@demo.com', crypt('User@123', gen_salt('bf', 12)), 'User One', 'user', true),
    (uuid_generate_v4(), demo_tenant_id, 'user2@demo.com', crypt('User@123', gen_salt('bf', 12)), 'User Two', 'user', true);

-- Insert Sample Projects
INSERT INTO projects (id, tenant_id, name, description, status, created_by, created_at, updated_at)
VALUES
    (uuid_generate_v4(), demo_tenant_id, 'Project Alpha', 'First demo project', 'active', demo_admin_id, now(), now()),
    (uuid_generate_v4(), demo_tenant_id, 'Project Beta', 'Second demo project', 'active', demo_admin_id, now(), now()) RETURNING id INTO proj_alpha_id;

-- Insert Sample Tasks for Project Alpha (assigned to user1)
INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date, created_at, updated_at)
SELECT uuid_generate_v4(), proj_alpha_id, demo_tenant_id, t.title, t.desc, 'todo', t.pri, u.id, CURRENT_DATE + interval '7 days', now(), now()
FROM (VALUES
    ('Design homepage mockup', 'Create high‑fidelity design', 'high'),
    ('Implement auth flow', 'JWT login & registration', 'medium'),
    ('Set up CI/CD', 'GitHub Actions pipeline', 'low')
) AS t(title, desc, pri)
JOIN users u ON u.email = 'user1@demo.com';
