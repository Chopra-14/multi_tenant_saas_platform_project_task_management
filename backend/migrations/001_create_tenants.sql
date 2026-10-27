-- 001_create_tenants.sql

-- Up Migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'suspended', 'trial')) DEFAULT 'active',
    subscription_plan VARCHAR(20) NOT NULL CHECK (subscription_plan IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
    max_users INTEGER NOT NULL,
    max_projects INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Down Migration
-- -- -- -- -- DROP TABLE IF EXISTS tenants CASCADE;