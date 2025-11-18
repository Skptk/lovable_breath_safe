/**
 * Application information and metadata
 */

export interface AppInfo {
  name: string;
  version: string;
  buildDate: string;
  credits: Array<{
    name: string;
    url: string;
    description?: string;
  }>;
  license: string;
  changelogUrl: string;
}

// Get version from package.json at build time
// In production, this would be injected via Vite
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE || new Date().toISOString();

export const appInfo: AppInfo = {
  name: 'Breath Safe',
  version: APP_VERSION,
  buildDate: BUILD_DATE,
  credits: [
    {
      name: 'OpenWeatherMap',
      url: 'https://openweathermap.org/',
      description: 'Weather and air quality data',
    },
    {
      name: 'AQICN',
      url: 'https://aqicn.org/',
      description: 'Air quality index data',
    },
    {
      name: 'Supabase',
      url: 'https://supabase.com/',
      description: 'Backend and database services',
    },
    {
      name: 'React',
      url: 'https://react.dev/',
      description: 'UI framework',
    },
    {
      name: 'Vite',
      url: 'https://vitejs.dev/',
      description: 'Build tool',
    },
    {
      name: 'Tailwind CSS',
      url: 'https://tailwindcss.com/',
      description: 'Styling framework',
    },
    {
      name: 'Radix UI',
      url: 'https://www.radix-ui.com/',
      description: 'UI component library',
    },
    {
      name: 'Lucide Icons',
      url: 'https://lucide.dev/',
      description: 'Icon library',
    },
  ],
  license: 'MIT',
  changelogUrl: '/changelog',
};

