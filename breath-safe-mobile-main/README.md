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
git clone <your-repo-url>
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
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. Start the development server
```bash
npm run dev
```

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