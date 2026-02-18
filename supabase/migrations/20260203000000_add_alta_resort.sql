-- Add Alta Ski Area to resorts table
INSERT INTO public.resorts (
    name,
    slug,
    latitude,
    longitude,
    elevation_base,
    elevation_summit,
    timezone,
    website_url,
    webcam_urls
) VALUES (
    'Alta Ski Area',
    'alta',
    40.5884,
    -111.6386,
    8530,
    10550,
    'America/Denver',
    'https://www.alta.com',
    '[]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
