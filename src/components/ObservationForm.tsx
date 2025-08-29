'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ObservationFormProps {
  placeId: string
  placeName: string
  onSubmit: (observation: ObservationData) => Promise<void>
  onCancel: () => void
}

export interface ObservationData {
  placeId: string
  wifiSpeedDownload?: number
  wifiSpeedUpload?: number
  wifiLatency?: number
  noiseLevel?: number
  outletCount?: number
  crowdedness?: number
  notes?: string
}

interface SpeedTestResult {
  download: number
  upload: number
  latency: number
}

interface NoiseTestResult {
  level: number
  duration: number
}

export function ObservationForm({ placeId, placeName, onSubmit, onCancel }: ObservationFormProps) {
  const [wifiTest, setWifiTest] = useState<SpeedTestResult | null>(null)
  const [noiseTest, setNoiseTest] = useState<NoiseTestResult | null>(null)
  const [outletCount, setOutletCount] = useState<number | undefined>()
  const [crowdedness, setCrowdedness] = useState<number | undefined>()
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTestingWifi, setIsTestingWifi] = useState(false)
  const [isTestingNoise, setIsTestingNoise] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const runWifiSpeedTest = async () => {
    setIsTestingWifi(true)
    try {
      const result = await performSpeedTest()
      setWifiTest(result)
    } catch (error) {
      console.error('Speed test failed:', error)
    } finally {
      setIsTestingWifi(false)
    }
  }

  const runNoiseTest = async () => {
    setIsTestingNoise(true)
    try {
      const result = await performNoiseTest()
      setNoiseTest(result)
    } catch (error) {
      console.error('Noise test failed:', error)
      alert('Noise test requires microphone access')
    } finally {
      setIsTestingNoise(false)
    }
  }

  const performSpeedTest = async (): Promise<SpeedTestResult> => {
    const testUrl = 'https://httpbin.org/bytes/1048576' // 1MB test file
    const iterations = 3

    let totalDownload = 0
    let totalLatency = 0

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      
      try {
        const response = await fetch(`${testUrl}?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-cache',
        })
        
        const latencyTime = performance.now() - startTime
        const data = await response.arrayBuffer()
        const endTime = performance.now()
        
        const downloadTime = (endTime - startTime) / 1000 // seconds
        const downloadSpeed = (data.byteLength * 8) / downloadTime / 1_000_000 // Mbps
        
        totalDownload += downloadSpeed
        totalLatency += latencyTime
      } catch (error) {
        console.error('Speed test iteration failed:', error)
      }
    }

    // Simple upload test (smaller payload)
    let uploadSpeed = 0
    try {
      const uploadData = new Uint8Array(131072) // 128KB
      const startTime = performance.now()
      
      await fetch('https://httpbin.org/post', {
        method: 'POST',
        body: uploadData,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      })
      
      const endTime = performance.now()
      const uploadTime = (endTime - startTime) / 1000
      uploadSpeed = (uploadData.byteLength * 8) / uploadTime / 1_000_000 // Mbps
    } catch (error) {
      console.error('Upload test failed:', error)
    }

    return {
      download: Math.round((totalDownload / iterations) * 10) / 10,
      upload: Math.round(uploadSpeed * 10) / 10,
      latency: Math.round(totalLatency / iterations),
    }
  }

  const performNoiseTest = async (): Promise<NoiseTestResult> => {
    const duration = 5000 // 5 seconds

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      
      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      source.connect(analyserRef.current)

      const samples: number[] = []
      const interval = setInterval(() => {
        analyserRef.current!.getByteFrequencyData(dataArray)
        
        // Calculate RMS (Root Mean Square)
        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / bufferLength)
        samples.push(rms)
      }, 100)

      await new Promise(resolve => setTimeout(resolve, duration))
      clearInterval(interval)

      // Clean up
      stream.getTracks().forEach(track => track.stop())
      audioContextRef.current?.close()

      // Calculate average and convert to approximate dB
      const averageRMS = samples.reduce((sum, sample) => sum + sample, 0) / samples.length
      const approximateDB = 20 * Math.log10(averageRMS / 255) + 90 // Rough conversion to dB

      return {
        level: Math.max(30, Math.min(90, Math.round(approximateDB))), // Clamp between 30-90 dB
        duration: duration / 1000,
      }
    } catch (error) {
      throw new Error('Could not access microphone')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const observation: ObservationData = {
        placeId,
        wifiSpeedDownload: wifiTest?.download,
        wifiSpeedUpload: wifiTest?.upload,
        wifiLatency: wifiTest?.latency,
        noiseLevel: noiseTest?.level,
        outletCount,
        crowdedness,
        notes: notes.trim() || undefined,
      }

      await onSubmit(observation)
    } catch (error) {
      console.error('Failed to submit observation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach(track => track.stop())
      audioContextRef.current?.close()
    }
  }, [])

  const crowdednessLabels = ['Very quiet', 'Quiet', 'Moderate', 'Busy', 'Very busy']

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Add Observation for {placeName}
        </h3>
        <p className="text-sm text-gray-600">
          Help others by sharing your experience at this location
        </p>
      </div>

      {/* WiFi Speed Test */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">📶 WiFi Speed</h4>
        {!wifiTest ? (
          <button
            type="button"
            onClick={runWifiSpeedTest}
            disabled={isTestingWifi}
            className={cn(
              'w-full px-4 py-3 rounded-lg border-2 border-dashed transition-colors',
              isTestingWifi
                ? 'border-blue-300 bg-blue-50 text-blue-600'
                : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
            )}
          >
            {isTestingWifi ? 'Testing WiFi Speed...' : 'Run WiFi Speed Test'}
          </button>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Download</p>
                <p className="text-lg font-semibold text-green-600">
                  {wifiTest.download} Mbps
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Upload</p>
                <p className="text-lg font-semibold text-green-600">
                  {wifiTest.upload} Mbps
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Latency</p>
                <p className="text-lg font-semibold text-green-600">
                  {wifiTest.latency}ms
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setWifiTest(null)}
              className="text-sm text-gray-500 hover:text-gray-700 mt-2"
            >
              Reset test
            </button>
          </div>
        )}
      </div>

      {/* Noise Level Test */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">🔊 Noise Level</h4>
        {!noiseTest ? (
          <button
            type="button"
            onClick={runNoiseTest}
            disabled={isTestingNoise}
            className={cn(
              'w-full px-4 py-3 rounded-lg border-2 border-dashed transition-colors',
              isTestingNoise
                ? 'border-orange-300 bg-orange-50 text-orange-600'
                : 'border-gray-300 hover:border-orange-300 hover:bg-orange-50'
            )}
          >
            {isTestingNoise ? 'Measuring noise level...' : 'Measure Noise Level'}
          </button>
        ) : (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600">Noise Level</p>
              <p className="text-2xl font-semibold text-green-600">
                {noiseTest.level} dB
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {noiseTest.level < 40 ? 'Very quiet' :
                 noiseTest.level < 50 ? 'Quiet' :
                 noiseTest.level < 60 ? 'Moderate' :
                 noiseTest.level < 70 ? 'Noisy' : 'Very noisy'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNoiseTest(null)}
              className="text-sm text-gray-500 hover:text-gray-700 mt-2"
            >
              Reset test
            </button>
          </div>
        )}
      </div>

      {/* Manual Observations */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Manual Observations</h4>
        
        {/* Outlet Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔌 Available Outlets
          </label>
          <select
            value={outletCount || ''}
            onChange={(e) => setOutletCount(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Not specified</option>
            <option value="0">None visible</option>
            <option value="1">1-2 outlets</option>
            <option value="3">3-5 outlets</option>
            <option value="6">6+ outlets</option>
          </select>
        </div>

        {/* Crowdedness */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            👥 Crowdedness Level
          </label>
          <div className="space-y-2">
            {crowdednessLabels.map((label, index) => (
              <label key={index} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="crowdedness"
                  value={index + 1}
                  checked={crowdedness === index + 1}
                  onChange={() => setCrowdedness(index + 1)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          📝 Additional Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional observations about this place..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          rows={3}
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg transition-colors',
            isSubmitting
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-700'
          )}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Observation'}
        </button>
      </div>
    </form>
  )
}
