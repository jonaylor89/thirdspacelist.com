create view places_with_coords as
select 
    *,
    ST_Y(location::geometry) as lat,
    ST_X(location::geometry) as lng
from places;
