# Weather Background Images

This directory contains background images for the dynamic weather system in the Breath Safe webapp.

## Required Images

### Core Weather Conditions
- **`sunny.jpg`** - Clear, bright sky with visible sun
- **`partly-cloudy.jpg`** - Mixed sky with sun and clouds
- **`overcast.jpg`** - Gray, cloudy sky with no sun visible
- **`fog.jpg`** - Misty, atmospheric fog with reduced visibility
- **`rain.jpg`** - Rainy, wet atmosphere with visible rain drops
- **`snow.jpg`** - Snowy, winter atmosphere with visible snow
- **`night.jpg`** - Dark night sky with stars visible

### Time-Based Conditions
- **`sunrise.jpg`** - Warm, golden-orange sky with sun rising
- **`sunset.jpg`** - Deep orange-red sky with sun setting

## Image Specifications

### Format
- **File Format**: JPG/JPEG for optimal compression and compatibility
- **Color Space**: sRGB for web compatibility

### Resolution
- **Minimum**: 1920x1080 (Full HD)
- **Recommended**: 2560x1440 (2K) or 3840x2160 (4K)
- **Aspect Ratio**: 16:9 (landscape) for optimal coverage

### Style Guidelines
- **Atmospheric**: Images should create mood without interfering with readability
- **Subtle**: Avoid overly bright or distracting elements
- **Natural**: Outdoor scenes that complement the app's environmental focus
- **Consistent**: Similar lighting and color temperature across all images
- **Professional**: High-quality photography or artwork

### File Naming
- Use lowercase letters and hyphens
- Include file extension (.jpg)
- Match exactly with the filenames in the code

## Priority System

The background system uses a priority hierarchy:

1. **Sunrise/Sunset** (highest priority) - When within 30 minutes of sunrise/sunset
2. **Night Time** - When between sunset and sunrise
3. **Weather Conditions** - Based on current weather data
4. **Fallback** - Default to partly-cloudy if no other condition matches

## Integration

These images are automatically selected by the `BackgroundManager` component based on:
- Current weather conditions from Open-Meteo API
- Sunrise/sunset times from weather data
- Time of day calculations
- User's current location

## Performance Notes

- Images are loaded on-demand when weather conditions change
- Smooth 500ms opacity transitions between background changes
- Responsive scaling for mobile and desktop devices
- Theme-aware overlay adjustments for light/dark modes
