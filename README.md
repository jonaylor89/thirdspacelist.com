# ThirdSpaceList 🏢☕📚

A mobile-first PWA for discovering work-friendly cafes, libraries, and community spaces with real-time data on WiFi speeds, noise levels, and amenities.

## Features ✨

- **Interactive Map & List View** - Browse places on an interactive map with clustering or in a clean list format
- **Real-time Observations** - Crowdsourced data on:
  - WiFi speed testing (download/upload/latency)
  - Noise level measurement via microphone
  - Outlet availability and crowdedness ratings
- **Smart Filtering** - Filter by category, amenities, workability score, and operating hours
- **Workability Score** - AI-powered aggregation of observations into a single score
- **PWA Support** - Installable app with offline functionality
- **Location-based Search** - Find places near you with distance calculations
- **User Contributions** - Submit observations and build your contribution profile

## Tech Stack 🛠️

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Database**: Supabase (PostgreSQL + PostGIS for geospatial data)
- **Search**: Typesense (Fast search engine with geolocation + filtering)
- **Maps**: Mapbox GL JS with clustering
- **Styling**: TailwindCSS
- **State Management**: Zustand + TanStack Query
- **PWA**: Service Worker + Web App Manifest
- **APIs**: OpenStreetMap data via Overpass API
- **DevOps**: Just command runner + Docker Compose

## Quick Start 🚀

### Prerequisites

- Node.js 18+
- [Just](https://github.com/casey/just) command runner
- Docker & Docker Compose
- A Supabase project
- A Mapbox account and access token

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/jonaylor89/thirdspacelist.git
cd thirdspacelist

# Install Just command runner
# macOS: brew install just
# Linux: curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to ~/bin

# Copy environment template
cp .env.example .env.local
```

### 2. Configure Environment Variables

Edit `.env.local` with your credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Mapbox Configuration
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token

# Typesense Configuration (for development)
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=dev-api-key-123
```

### 3. Complete Setup

```bash
# Run complete development setup
just setup
```

This will:
- Install dependencies
- Start Typesense search engine
- Set up database schema
- Seed places data from OpenStreetMap
- Sync data to Typesense

### 4. Start Development

```bash
# Start the development server
just dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Available Commands

```bash
# See all available commands
just

# Common commands:
just dev              # Start development server
just check            # Run linting and type checking  
just typesense        # Start search engine
just sync-typesense   # Sync data to search
just seed-places      # Import places from OpenStreetMap
just health-check     # Check all services
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for the complete command reference.

## Database Schema 🗄️

### Core Tables

- **`places`** - Locations with geospatial data, categories, and basic info
- **`observations`** - User-submitted measurements and ratings
- **`profiles`** - User profiles linked to Supabase Auth

### Key Features

- **PostGIS Integration** - Efficient geospatial queries for location-based search
- **Real-time Functions** - Automatic workability score calculation
- **Row Level Security** - Proper permissions and data isolation
- **Optimized Indexes** - Fast queries on location, categories, and scores

## API Routes 📡

### Places
- `GET /api/places` - Search places with filters and location
- `GET /api/places/[id]` - Get detailed place info with stats

### Observations
- `POST /api/observations` - Submit new observations
- `GET /api/observations` - Fetch observations with filtering

## Contributing 🤝

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Submit a pull request

### Code Standards

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Component-based architecture with proper separation of concerns
- API-first design with proper error handling

## Deployment 🚢

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app is a standard Next.js application and can be deployed to:
- Netlify
- Railway
- Digital Ocean App Platform
- Self-hosted with PM2

## Roadmap 🗺️

- [ ] User authentication and profiles
- [ ] Push notifications for updates
- [ ] Advanced filtering (hours, ratings, etc.)
- [ ] Social features (favorites, reviews)
- [ ] Multi-city support beyond NYC
- [ ] Integration with calendar apps
- [ ] Accessibility improvements
- [ ] Performance optimizations

## License 📄

MIT License - see [LICENSE](LICENSE) for details.

## Support 💬

- [Documentation](https://github.com/yourusername/thirdspacelist/wiki)
- [Issues](https://github.com/yourusername/thirdspacelist/issues)
- [Discussions](https://github.com/yourusername/thirdspacelist/discussions)

---

Built with ❤️ for remote workers and digital nomads everywhere.
