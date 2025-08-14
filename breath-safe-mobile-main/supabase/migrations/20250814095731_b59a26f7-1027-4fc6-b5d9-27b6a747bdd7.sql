-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create air_quality_readings table for historical data
CREATE TABLE public.air_quality_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  location_name TEXT,
  aqi INTEGER NOT NULL,
  pm25 DECIMAL(8, 2),
  pm10 DECIMAL(8, 2),
  no2 DECIMAL(8, 2),
  so2 DECIMAL(8, 2),
  co DECIMAL(8, 2),
  o3 DECIMAL(8, 2),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_points table for tracking points earned
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL,
  aqi_value INTEGER NOT NULL,
  location_name TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pollutant_details table for descriptions
CREATE TABLE public.pollutant_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pollutant_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  health_effects TEXT,
  safe_levels TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create affiliate_products table for air purifiers
CREATE TABLE public.affiliate_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_range TEXT,
  affiliate_url TEXT NOT NULL,
  retailer TEXT NOT NULL,
  image_url TEXT,
  rating DECIMAL(2, 1),
  coverage_area TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.air_quality_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pollutant_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for air_quality_readings
CREATE POLICY "Users can view their own readings" 
ON public.air_quality_readings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own readings" 
ON public.air_quality_readings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for user_points
CREATE POLICY "Users can view their own points" 
ON public.user_points 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points" 
ON public.user_points 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for pollutant_details (public read)
CREATE POLICY "Everyone can view pollutant details" 
ON public.pollutant_details 
FOR SELECT 
USING (true);

-- Create RLS policies for affiliate_products (public read)
CREATE POLICY "Everyone can view active products" 
ON public.affiliate_products 
FOR SELECT 
USING (is_active = true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert pollutant details data
INSERT INTO public.pollutant_details (pollutant_code, name, description, health_effects, safe_levels) VALUES
('PM25', 'PM2.5', 'Fine particulate matter with particles smaller than 2.5 micrometers in diameter', 'Can penetrate deep into lungs and bloodstream, causing respiratory and cardiovascular problems', 'WHO guideline: 15 μg/m³ annual average'),
('PM10', 'PM10', 'Particulate matter with particles smaller than 10 micrometers in diameter', 'Can irritate eyes, nose, and throat; aggravate asthma and other respiratory conditions', 'WHO guideline: 45 μg/m³ annual average'),
('NO2', 'Nitrogen Dioxide', 'A reddish-brown gas that forms when fossil fuels are burned at high temperatures', 'Can inflame airways and reduce lung function; linked to respiratory infections', 'WHO guideline: 25 μg/m³ annual average'),
('SO2', 'Sulfur Dioxide', 'A colorless gas with a sharp odor produced by burning sulfur-containing fuels', 'Can cause breathing difficulties and worsen asthma; irritates eyes and throat', 'WHO guideline: 40 μg/m³ daily average'),
('CO', 'Carbon Monoxide', 'An odorless, colorless gas produced by incomplete combustion of carbon-containing fuels', 'Reduces oxygen delivery to organs and tissues; can cause headaches and fatigue', 'WHO guideline: 30 mg/m³ 1-hour average'),
('O3', 'Ozone', 'A gas formed when pollutants react with sunlight, creating ground-level ozone', 'Can cause chest pain, coughing, and throat irritation; worsens asthma', 'WHO guideline: 100 μg/m³ 8-hour average');

-- Insert sample affiliate products
INSERT INTO public.affiliate_products (name, description, price_range, affiliate_url, retailer, image_url, rating, coverage_area) VALUES
('LEVOIT Air Purifier Core 300', 'True HEPA filter removes 99.97% of particles', '$80-120', 'https://amazon.com/dp/B07VVK39F7', 'Amazon', '/placeholder.svg', 4.5, 'Up to 219 sq ft'),
('Honeywell HPA300', 'HEPA air purifier for large rooms', '$200-250', 'https://amazon.com/dp/B00BWYO53G', 'Amazon', '/placeholder.svg', 4.3, 'Up to 465 sq ft'),
('Xiaomi Mi Air Purifier 3H', 'Smart air purifier with app control', '$150-200', 'https://aliexpress.com/item/xiaomi-air-purifier', 'AliExpress', '/placeholder.svg', 4.4, 'Up to 484 sq ft'),
('Dyson Pure Cool TP04', 'Tower fan and air purifier combination', '$400-500', 'https://amazon.com/dp/B07KLB19QN', 'Amazon', '/placeholder.svg', 4.2, 'Up to 800 sq ft');

-- Create function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();