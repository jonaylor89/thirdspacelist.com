import { syncAllPlaces } from '../src/lib/typesense-sync'

async function main() {
  try {
    console.log('🚀 Starting Typesense sync...')
    console.log('Make sure Typesense is running: docker-compose up -d')
    
    const result = await syncAllPlaces()
    
    console.log(`✅ Sync completed! ${result.synced} places synced to Typesense`)
    console.log('🔍 You can now test search at http://localhost:8108/health')
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { main as syncToTypesense }
