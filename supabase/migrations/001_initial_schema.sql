-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create profiles table
CREATE TABLE profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    full_name text,
    avatar_url text,
    contribution_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create places table
CREATE TABLE places (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    osm_id text UNIQUE,
    name text NOT NULL,
    categories text[] NOT NULL DEFAULT '{}',
    location geography(POINT, 4326) NOT NULL,
    address text,
    website text,
    phone text,
    opening_hours text,
    wifi_available boolean,
    outlets_available boolean,
    workability_score numeric(3,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create observations table
CREATE TABLE observations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    place_id uuid REFERENCES places(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    wifi_speed_download numeric(10,2),
    wifi_speed_upload numeric(10,2),
    wifi_latency numeric(10,2),
    noise_level numeric(5,2),
    outlet_count integer,
    crowdedness integer CHECK (crowdedness >= 1 AND crowdedness <= 5),
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX places_location_idx ON places USING GIST (location);
CREATE INDEX places_categories_idx ON places USING GIN (categories);
CREATE INDEX places_workability_score_idx ON places (workability_score DESC);
CREATE INDEX observations_place_id_idx ON observations (place_id);
CREATE INDEX observations_user_id_idx ON observations (user_id);
CREATE INDEX observations_created_at_idx ON observations (created_at DESC);

-- Create a function to find nearby places
CREATE OR REPLACE FUNCTION nearby_places(lat numeric, lng numeric, radius_meters numeric)
RETURNS TABLE (
    id uuid,
    name text,
    categories text[],
    address text,
    workability_score numeric,
    distance_meters numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.categories,
        p.address,
        p.workability_score,
        ST_Distance(p.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) as distance_meters
    FROM places p
    WHERE ST_DWithin(
        p.location,
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
        radius_meters
    )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update workability scores
CREATE OR REPLACE FUNCTION update_workability_score(place_uuid uuid)
RETURNS void AS $$
DECLARE
    avg_wifi numeric;
    avg_noise numeric;
    avg_crowdedness numeric;
    outlet_availability numeric;
    final_score numeric;
BEGIN
    -- Calculate average WiFi speed (normalized to 0-1, max 100 Mbps)
    SELECT LEAST(AVG(wifi_speed_download) / 100.0, 1.0)
    INTO avg_wifi
    FROM observations 
    WHERE place_id = place_uuid 
    AND wifi_speed_download IS NOT NULL
    AND created_at > NOW() - INTERVAL '30 days';

    -- Calculate noise score (lower is better, normalized to 0-1)
    SELECT 1.0 - (AVG(noise_level) - 30.0) / 50.0
    INTO avg_noise
    FROM observations 
    WHERE place_id = place_uuid 
    AND noise_level IS NOT NULL
    AND created_at > NOW() - INTERVAL '30 days';

    -- Calculate crowdedness score (lower is better, normalized to 0-1)
    SELECT 1.0 - (AVG(crowdedness) - 1.0) / 4.0
    INTO avg_crowdedness
    FROM observations 
    WHERE place_id = place_uuid 
    AND crowdedness IS NOT NULL
    AND created_at > NOW() - INTERVAL '30 days';

    -- Calculate outlet availability (percentage of recent observations with outlets > 0)
    SELECT COALESCE(
        COUNT(CASE WHEN outlet_count > 0 THEN 1 END)::numeric / COUNT(*)::numeric,
        0.0
    )
    INTO outlet_availability
    FROM observations 
    WHERE place_id = place_uuid 
    AND outlet_count IS NOT NULL
    AND created_at > NOW() - INTERVAL '30 days';

    -- Calculate weighted final score
    final_score := COALESCE(avg_wifi * 0.3, 0) + 
                   COALESCE(avg_noise * 0.3, 0) + 
                   COALESCE(avg_crowdedness * 0.2, 0) + 
                   COALESCE(outlet_availability * 0.2, 0);

    -- Update the place
    UPDATE places 
    SET workability_score = final_score,
        updated_at = NOW()
    WHERE id = place_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update workability score after observations
CREATE OR REPLACE FUNCTION trigger_update_workability_score()
RETURNS trigger AS $$
BEGIN
    PERFORM update_workability_score(NEW.place_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workability_after_observation
    AFTER INSERT OR UPDATE ON observations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_workability_score();

-- Create trigger to update contribution count
CREATE OR REPLACE FUNCTION update_contribution_count()
RETURNS trigger AS $$
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        UPDATE profiles 
        SET contribution_count = contribution_count + 1,
            updated_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_contribution_count
    AFTER INSERT ON observations
    FOR EACH ROW
    EXECUTE FUNCTION update_contribution_count();

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Places are viewable by everyone" 
    ON places FOR SELECT 
    USING (true);

CREATE POLICY "Observations are viewable by everyone" 
    ON observations FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert observations" 
    ON observations FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
