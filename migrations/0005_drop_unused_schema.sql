-- Drop schema that was never wired to any feature (follows table, unused
-- users columns home_municipality / radius_km). Keeps the live D1 schema in
-- line with the code so deleteUserData and the users table stay minimal.
-- ponytail: DROP directo (no IF EXISTS) porque D1/SQLite rechaza
-- "DROP COLUMN IF EXISTS"; la migración se aplica una vez y las columnas
-- existen en la base actual.
DROP TABLE follows;

ALTER TABLE users DROP COLUMN home_municipality;
ALTER TABLE users DROP COLUMN radius_km;
