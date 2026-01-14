-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS activity_created_at_idx ON public.activity (created_at DESC);

-- Create index on market_slug for faster filtering (since we will filter by market soon)
CREATE INDEX IF NOT EXISTS activity_market_slug_idx ON public.activity (market_slug);
