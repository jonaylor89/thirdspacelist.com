# ThirdSpaceList Development Commands
# Run `just` to see all available commands

# Default recipe - show help
default:
    @just --list

dev:
    npm run dev

build:
    npm run build

start:
    npm run start

lint:
    npm run lint

format:
    npm run format

type-check:
    npm run type-check

check: lint type-check

migrate:
    supabase db push
    
seed-places:
    npm run seed-supabase

sync-typesense:
    npm run sync-typesense

seed-all: seed-places sync-typesense

typesense:
    docker-compose up -d typesense

typesense-stop:
    docker-compose down

typesense-logs:
    docker-compose logs -f typesense

typesense-health:
    curl http://localhost:8108/health

typesense-info:
    curl -H "X-TYPESENSE-API-KEY: dev-api-key-123" http://localhost:8108/collections/places

typesense-test query="*":
    curl -H "X-TYPESENSE-API-KEY: dev-api-key-123" "http://localhost:8108/collections/places/documents/search?q={{query}}&query_by=name,searchable_text"

install:
    npm install

update:
    npm update

clean:
    rm -rf .next
    rm -rf node_modules
    rm -rf typesense-data

fresh: clean install

setup: install typesense seed-all
    @echo "✅ Development setup complete!"
    @echo "🚀 Run 'just dev' to start the development server"

prod-build: check build

test-api:
    @echo "🔍 Testing API endpoints..."
    curl -s http://localhost:3000/api/places | jq .
    curl -s "http://localhost:3000/api/search/places?q=*" | jq .

health-check:
    @echo "🏥 Health checking services..."
    @echo "Next.js:"
    @curl -s http://localhost:3000/api/places > /dev/null && echo "✅ API running" || echo "❌ API not running"
    @echo "Typesense:"
    @curl -s http://localhost:8108/health > /dev/null && echo "✅ Typesense running" || echo "❌ Typesense not running"

deploy-prep: check prod-build
    @echo "✅ Ready for deployment"

up:
    docker-compose up -d

down:
    docker-compose down

restart: down up

logs:
    docker-compose logs -f

# Development Utilities
# Open Typesense admin (if available)
typesense-admin:
    @echo "Opening Typesense at http://localhost:8108"
    @command -v open >/dev/null 2>&1 && open "http://localhost:8108" || echo "Open http://localhost:8108 in your browser"

# Backup & Restore
# Backup Typesense data
backup-typesense:
    mkdir -p backups
    docker-compose exec typesense tar czf - /data | cat > "backups/typesense-$(date +%Y%m%d_%H%M%S).tar.gz"
    @echo "Backup created in backups/ directory"

# Development Shortcuts
# Quick restart of development environment
quick-restart: typesense-stop typesense dev

# Full reset (clean everything and start fresh)
reset: down clean fresh setup
    @echo "🔄 Complete reset finished!"

# Monitor Typesense performance
monitor-typesense:
    watch -n 2 'curl -s -H "X-TYPESENSE-API-KEY: dev-api-key-123" http://localhost:8108/stats.json | jq .'
