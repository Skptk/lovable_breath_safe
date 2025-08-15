# Google Maps Integration Setup

This guide will help you set up Google Maps integration for the Air Quality Tracker app.

## 🗺️ What's Been Added

### **1. Google Maps Component**
- **Interactive map** showing user's current location
- **Real-time air quality data** integration
- **Nearby monitoring stations** with AQI-based color coding
- **Responsive design** for mobile and desktop

### **2. Features**
- **User Location Marker**: Blue circle showing your current position
- **Station Markers**: Colored circles representing nearby monitoring stations
- **AQI Color Coding**: Green (good) to Red (hazardous) based on air quality
- **Info Windows**: Click markers to see station details
- **Real-time Updates**: Map updates with latest air quality data

## 🔑 Setup Steps

### **Step 1: Get Google Maps API Key**

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click "Select a project" → "New Project"
   - Name it "Air Quality Tracker" or similar
   - Click "Create"

3. **Enable Maps JavaScript API**
   - Go to "APIs & Services" → "Library"
   - Search for "Maps JavaScript API"
   - Click on it and press "Enable"

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

### **Step 2: Configure the App**

1. **Update Configuration File**
   ```typescript
   // src/config/maps.ts
   export const GOOGLE_MAPS_CONFIG = {
     API_KEY: 'YOUR_ACTUAL_API_KEY_HERE', // Replace this
     // ... other settings
   };
   ```

2. **Update HTML File**
   ```html
   <!-- index.html -->
   <script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_ACTUAL_API_KEY_HERE&libraries=places"></script>
   ```

### **Step 3: Test the Integration**

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Open the app** and navigate to the Map page
3. **Allow location access** when prompted
4. **Verify the map loads** with your current location

## 🎯 How It Works

### **1. Location Detection**
- App requests user's GPS location
- Uses browser's Geolocation API
- Falls back to network-based location if GPS fails

### **2. Map Initialization**
- Google Maps loads with your location as center
- Sets appropriate zoom level (13 = neighborhood view)
- Applies custom styling for better air quality focus

### **3. Marker System**
- **Blue Marker**: Your current location
- **Colored Markers**: Nearby monitoring stations
  - 🟢 Green: AQI 0-50 (Good)
  - 🟡 Yellow: AQI 51-100 (Moderate)
  - 🟠 Orange: AQI 101-150 (Unhealthy for Sensitive Groups)
  - 🔴 Red: AQI 151-200 (Unhealthy)
  - 🟣 Purple: AQI 201-300 (Very Unhealthy)
  - ⚫ Dark Red: AQI 301+ (Hazardous)

### **4. Interactive Features**
- **Click markers** to see station details
- **Info windows** show AQI, distance, and health impact
- **Real-time updates** from your air quality data

## 🔧 Customization Options

### **1. Map Styling**
```typescript
// src/config/maps.ts
export const GOOGLE_MAPS_CONFIG = {
  // Change default zoom level
  DEFAULT_ZOOM: 15, // More zoomed in
  
  // Customize marker sizes
  USER_MARKER: {
    scale: 10, // Larger user marker
    // ... other settings
  },
  
  // Customize AQI colors
  AQI_COLORS: {
    good: '#00FF00', // Custom green
    // ... other colors
  }
};
```

### **2. Map Features**
- **Terrain view**: Change `mapTypeId` to `TERRAIN`
- **Satellite view**: Change `mapTypeId` to `SATELLITE`
- **Custom styles**: Add more styling rules to the `styles` array

### **3. Marker Behavior**
- **Click events**: Customize what happens when markers are clicked
- **Hover effects**: Add hover animations or tooltips
- **Custom icons**: Replace circles with custom SVG icons

## 🚨 Important Notes

### **1. API Key Security**
- **Never commit** your API key to version control
- **Use environment variables** in production
- **Restrict API key** to your domain in Google Cloud Console

### **2. Usage Limits**
- **Free tier**: $200/month credit
- **Maps JavaScript API**: ~$7 per 1000 map loads
- **Monitor usage** in Google Cloud Console

### **3. Browser Compatibility**
- **Modern browsers**: Full support
- **Mobile devices**: Excellent support
- **Older browsers**: May have limited functionality

## 🐛 Troubleshooting

### **1. Map Not Loading**
- Check API key is correct
- Verify Maps JavaScript API is enabled
- Check browser console for errors
- Ensure internet connection is stable

### **2. Location Not Working**
- Check browser location permissions
- Try refreshing the page
- Check if location services are enabled on device
- Verify HTTPS is used (required for location)

### **3. Markers Not Showing**
- Check if user location is available
- Verify nearby locations data is loaded
- Check browser console for JavaScript errors

## 🚀 Next Steps

### **1. Enhanced Features**
- **Real-time updates**: WebSocket integration for live AQI data
- **Route planning**: Show routes to avoid high-pollution areas
- **Historical data**: Time-lapse maps showing air quality trends
- **Weather overlay**: Combine with weather data for better context

### **2. Performance Optimization**
- **Marker clustering**: Group nearby markers for better performance
- **Lazy loading**: Load map data as needed
- **Caching**: Cache map tiles and location data
- **Progressive enhancement**: Basic map for slow connections

### **3. Mobile Optimization**
- **Touch gestures**: Pinch to zoom, swipe to pan
- **Offline support**: Cache map data for offline use
- **Progressive Web App**: Add to home screen functionality

## 📱 Mobile Experience

The Google Maps integration is fully optimized for mobile devices:

- **Responsive design** adapts to screen size
- **Touch-friendly** controls and interactions
- **Fast loading** with mobile-optimized settings
- **Battery efficient** location detection
- **Offline fallback** when possible

## 🌍 Global Support

The map integration works worldwide:

- **International locations** supported
- **Local place names** in native languages
- **Metric/Imperial units** based on location
- **Regional air quality standards** consideration
- **Multi-language support** for international users

Your Google Maps integration is now ready! Just add your API key and start exploring air quality data on an interactive map. 🗺️✨
