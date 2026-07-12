-- 001_init.sql — BabyTrack initial schema
-- Creates the core tables for users, children, shared access, activity logs,
-- measurements, vaccinations, reminders, and invitations.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- children
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS children (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    birth_date DATE,
    gender     TEXT,
    photo_url  TEXT,
    blood_type TEXT,
    allergies  TEXT,
    notes      TEXT,
    owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_children_owner ON children(owner_id);

-- ---------------------------------------------------------------------------
-- child_users — shared access to a child (owner / editor / viewer)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS child_users (
    child_id   UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (child_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_child_users_user ON child_users(user_id);

-- ---------------------------------------------------------------------------
-- activity_logs — polymorphic by type; details in JSONB `data`
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id   UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    data       JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_child ON activity_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_child_type ON activity_logs(child_id, type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_child_ts ON activity_logs(child_id, timestamp DESC);

-- ---------------------------------------------------------------------------
-- measurements — weight / height / head circumference, etc.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS measurements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    value       NUMERIC(10, 3) NOT NULL,
    unit        TEXT NOT NULL,
    measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_measurements_child ON measurements(child_id);
CREATE INDEX IF NOT EXISTS idx_measurements_child_type ON measurements(child_id, type, measured_at);

-- ---------------------------------------------------------------------------
-- vaccinations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vaccinations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    vaccine_name    TEXT NOT NULL,
    scheduled_date  DATE NOT NULL,
    administered_date DATE,
    lot_number      TEXT,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vaccinations_child ON vaccinations(child_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_scheduled ON vaccinations(scheduled_date);

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id   UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    cron       TEXT,
    enabled    BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminders_child ON reminders(child_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);

-- ---------------------------------------------------------------------------
-- invitations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invitations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    role        TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_invitations_child ON invitations(child_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
