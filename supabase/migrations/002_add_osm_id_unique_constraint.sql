-- Add unique constraint to osm_id column in places table
-- This allows for proper upsert operations during data seeding

ALTER TABLE places ADD CONSTRAINT places_osm_id_unique UNIQUE (osm_id);
