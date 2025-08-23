# Weather Background Images

This directory contains background images for different weather conditions in the Breath Safe webapp.

## Required Images

The following high-quality background images should be added to this directory:

### Core Weather Conditions
- `sunny.jpg` - Clear/sunny weather with bright sky
- `partly-cloudy.jpg` - Partly cloudy sky with some sun
- `overcast.jpg` - Overcast/foggy conditions
- `rain.jpg` - Rainy weather with clouds and rain
- `night.jpg` - Clear night sky with stars
- `snow.jpg` - Snowy weather conditions

## Image Requirements

- **Format**: JPG/JPEG for optimal compression
- **Resolution**: Minimum 1920x1080, recommended 2560x1440 or higher
- **Quality**: High-quality, professional images
- **Style**: Subtle, atmospheric backgrounds that don't interfere with card readability
- **Theme**: Natural, outdoor scenes that complement the app's environmental focus

## Usage

These images are automatically selected based on:
1. Current weather conditions from Open-Meteo API
2. Time of day (night vs. day)
3. User's current location

## Fallback

If images are missing, the app will use `partly-cloudy.jpg` as the default background.

## Notes

- Images should be optimized for web use (compressed but high quality)
- Consider both light and dark theme compatibility
- Ensure images work well with the glass morphism card overlay
- Test on both desktop and mobile devices
