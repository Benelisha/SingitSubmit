import React, { Suspense, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { easing } from "maath"
import { Book } from "./Book"
import { useBookPage } from "./BookPageContext"
import { BOOK_SHEETS } from "./BookContent"

// Smoothly moves the camera between the tilted cover view and the flat page view.
const CameraRig = ({ page, totalPages }: { page: number; totalPages: number }) => {
  const { camera } = useThree()
  useFrame((_, delta) => {
    const isCover = page === 0
    const isBack = page === totalPages
    const isBookClosed = isCover || isBack
    const targetX = isCover ? -1 : isBack ? 1 : 0
    const targetY = isBookClosed ? 1 : 0
    const targetZ = isBookClosed ? 4 : 2.5
    easing.damp3(camera.position, [targetX, targetY, targetZ], 0.4, delta)
    camera.lookAt(0, 0, 0)
  })
  return null
}

// Wraps the book, animating the tilt and a gentle float bob on cover/back only.
const BookWrapper = ({ isBookClosed }: { isBookClosed: boolean }) => {
  const groupRef = useRef<any>(null)
  useFrame((state, delta) => {
    if (!groupRef.current) return
    const targetRotX = isBookClosed ? -Math.PI / 4 : 0
    easing.dampAngle(groupRef.current.rotation, "x", targetRotX, 0.4, delta)
    if (isBookClosed) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.1
    } else {
      easing.damp(groupRef.current.position, "y", 0, 0.4, delta)
    }
  })
  return (
    <group ref={groupRef} rotation-y={Math.PI}>
      <Suspense fallback={null}>
        <Book />
      </Suspense>
    </group>
  )
}

/**
 * 3-D scene setup: lighting + book.
 * Drop this inside a <Canvas> with shadows enabled.
 */
export const BookExperience = () => {
  const { page } = useBookPage()
  const isBookClosed = page === 0 || page === BOOK_SHEETS.length

  return (
    <>
      {/* Soft ambient fill */}
      <ambientLight intensity={0.6} />

      {/* Key light */}
      <directionalLight
        position={[2, 5, 2]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      {/* Gentle fill from below-left */}
      <directionalLight position={[-2, -1, 1]} intensity={0.4} />

      {/* Shadow receiver */}
      <mesh position-y={-1.5} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>

      {/* Camera animation rig */}
      <CameraRig page={page} totalPages={BOOK_SHEETS.length} />

      {/* Animated book wrapper */}
      <BookWrapper isBookClosed={isBookClosed} />
    </>
  )
}
