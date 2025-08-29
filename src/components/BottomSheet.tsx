'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  snapPoints?: number[]
  initialSnap?: number
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.3, 0.6, 0.9],
  initialSnap = 0
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  const handleStart = (clientY: number) => {
    setIsDragging(true)
    setStartY(clientY)
    setCurrentY(clientY)
  }

  const handleMove = (clientY: number) => {
    if (!isDragging) return
    setCurrentY(clientY)
  }

  const handleEnd = () => {
    if (!isDragging) return
    
    const deltaY = currentY - startY
    const windowHeight = window.innerHeight
    const threshold = windowHeight * 0.1

    if (deltaY > threshold) {
      // Dragging down
      if (currentSnap === 0) {
        onClose()
      } else {
        setCurrentSnap(Math.max(0, currentSnap - 1))
      }
    } else if (deltaY < -threshold) {
      // Dragging up
      setCurrentSnap(Math.min(snapPoints.length - 1, currentSnap + 1))
    }

    setIsDragging(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientY)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY)
  }

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientY)
  }

  const handleTouchMove = (e: TouchEvent) => {
    handleMove(e.touches[0].clientY)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleEnd)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleEnd)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleEnd)
      }
    }
  }, [isDragging, currentY, startY])

  if (!isOpen) return null

  const heightPercentage = snapPoints[currentSnap]
  const translateY = isDragging ? Math.max(0, currentY - startY) : 0

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 transition-opacity z-40',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl z-50 transition-transform duration-300 ease-out"
        style={{
          height: `${heightPercentage * 100}vh`,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {/* Handle */}
        <div
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-4 pb-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  )
}
