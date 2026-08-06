-- Drop schema that was never wired to any feature (follows table, unused
-- users columns home_municipality / radius_km). Keeps the live D1 schema in
-- line with the code so deleteUserData and the users table stay minimal.
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS follows;

ALTER TABLE users DROP COLUMN IF EXISTS home_municipality;
ALTER TABLE users DROP COLUMN IF EXISTS radius_km;
