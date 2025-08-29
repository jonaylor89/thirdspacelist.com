-- Fix the nearby_places function to return actual coordinates (fix naming conflict)

DROP FUNCTION IF EXISTS nearby_places(numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION nearby_places(lat numeric, lng numeric, radius_meters numeric)
RETURNS TABLE (
    id uuid,
    name text,
    categories text[],
    address text,
    workability_score numeric,
    distance_meters double precision,
    place_lng double precision,
    place_lat double precision
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.categories,
        p.address,
        p.workability_score,
        ST_Distance(p.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) as distance_meters,
        ST_X(p.location::geometry) as place_lng,
        ST_Y(p.location::geometry) as place_lat
    FROM places p
    WHERE ST_DWithin(
        p.location,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
        radius_meters
    )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;
