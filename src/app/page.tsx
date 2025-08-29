import { fetchPlaces } from '@/lib/places'
import HomePage from '@/components/HomePage'

export default async function Home() {
  // Server-side data fetching with default NYC location
  const defaultLocation: [number, number] = [-74.006, 40.7128]
  const initialPlaces = await fetchPlaces(defaultLocation)

  return (
    <HomePage 
      initialPlaces={initialPlaces} 
      initialLocation={defaultLocation}
    />
  )
}
