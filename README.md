# Breath Safe - Air Quality Mobile App

A React TypeScript mobile application that tracks real-time air quality data using your location. Built with modern web technologies and best practices.

## 🚀 Features

- **Real-time Air Quality Monitoring**: Get current AQI and pollutant levels
- **Location-based Data**: Automatically detects your location for accurate readings
- **User Authentication**: Secure sign-up and sign-in with Supabase
- **Responsive Design**: Mobile-first design with beautiful UI components
- **Data Caching**: Efficient data fetching with React Query
- **Error Handling**: Graceful error boundaries and user-friendly error messages

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (Database + Authentication)
- **Data Fetching**: React Query for caching and state management
- **Build Tool**: Vite
- **Deployment**: Supabase Edge Functions

## 📱 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone https://github.com/Skptk/lovable_breath_safe.git
cd breath-safe-mobile-main
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env.local` file in the root directory:
```bash
VITE_SUPABASE_URL=https://bmqdbetupttlthpadseq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcWRiZXR1cHR0bHRocGFkc2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjQzNDcsImV4cCI6MjA3MDc0MDM0N30.wCHsFY73VDM93uJAWRLd4-XA_fTB7efJC7rXzsjhn8c
```

4. Start the development server
```bash
npm run dev
```

## 🚀 Deployment Options

Since local development has email verification limitations, here are deployment options to test authentication properly:

### Option 1: Deploy to Netlify (Recommended for Quick Testing)

1. **Fork/Clone** this repository to your GitHub account
2. **Sign up** for [Netlify](https://netlify.com) (free)
3. **Connect** your GitHub repository
4. **Deploy** - Netlify will automatically detect the Vite configuration
5. **Set environment variables** in Netlify dashboard:
   - `VITE_SUPABASE_URL`: `https://bmqdbetupttlthpadseq.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

### Option 2: Deploy to Vercel

1. **Fork/Clone** this repository to your GitHub account
2. **Sign up** for [Vercel](https://vercel.com) (free)
3. **Import** your GitHub repository
4. **Deploy** - Vercel will automatically detect the Vite configuration
5. **Set environment variables** in Vercel dashboard

### Option 3: GitHub Pages

1. **Push** your changes to GitHub
2. **Enable GitHub Pages** in repository settings
3. **Set source** to GitHub Actions
4. **Configure secrets** in repository settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Why Deploy?

- **Email Verification**: Supabase email verification requires a proper domain
- **Authentication Testing**: Test the full authentication flow
- **Real Environment**: Simulate production conditions
- **No Local Limitations**: Bypass localhost restrictions

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── AirQualityDashboard.tsx
│   ├── Navigation.tsx
│   └── ErrorBoundary.tsx
├── hooks/               # Custom React hooks
│   └── useAuth.ts
├── pages/               # Application pages
│   ├── Index.tsx
│   ├── Auth.tsx
│   └── ...
├── integrations/        # External service integrations
│   └── supabase/       # Supabase client and types
└── lib/                 # Utility functions
```

## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 🔒 Security Features

- Environment variables for sensitive data
- Supabase Row Level Security (RLS)
- Secure authentication flow
- Input validation and sanitization

## 🐛 Error Handling

The app includes comprehensive error handling:
- **Error Boundaries**: Catches React component errors
- **Toast Notifications**: User-friendly error messages
- **Retry Mechanisms**: Automatic retry for failed requests
- **Fallback UI**: Graceful degradation when services fail

## 📊 Data Sources

- **Air Quality Data**: OpenWeatherMap Air Pollution API
- **Location Services**: Browser Geolocation API
- **User Data**: Supabase PostgreSQL database

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions, please:
1. Check the existing issues
2. Create a new issue with detailed information
3. Contact the development team

---

Built with ❤️ using modern web technologies

## Project info

**URL**: https://lovable.dev/projects/c694edaf-0adb-4c06-bff9-28cb39f8c01f


The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS