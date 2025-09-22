-- Enable Row Level Security and allow authenticated user inserts on air_quality_readings
ALTER TABLE public.air_quality_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for authenticated users"
ON public.air_quality_readings
FOR INSERT
WITH CHECK (auth.uid() = user_id);
