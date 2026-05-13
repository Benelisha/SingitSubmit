import React, { Suspense, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { easing } from "maath"
import { Book, BookSheet } from "./Book"
import { useBookPage } from "./BookPageContext"

// Smoothly moves the camera between the tilted cover view and the flat page view.
// X is always 0 — we rely purely on Y/Z shift + tilt to frame the closed book.
const CameraRig = ({ page, totalPages }: { page: number; totalPages: number }) => {
  const { camera } = useThree()
  useFrame((_, delta) => {
    const isBookClosed = page === 0 || page === totalPages
    const targetY = isBookClosed ? 1 : 0
    const targetZ = isBookClosed ? 4 : 2.5
    easing.damp3(camera.position, [0, targetY, targetZ], 0.4, delta)
    camera.lookAt(0, 0, 0)
  })
  return null
}

// Wraps the book, animating the tilt and a gentle float bob on cover/back only.
const BookWrapper = ({ isBookClosed, sheets }: { isBookClosed: boolean; sheets: BookSheet[] }) => {
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
        <Book sheets={sheets} />
      </Suspense>
    </group>
  )
}

/**
 * 3-D scene setup: lighting + book.
 * Drop this inside a <Canvas> with shadows enabled.
 */
export const BookExperience = ({ sheets }: { sheets: BookSheet[] }) => {
  const { page } = useBookPage()
  const isBookClosed = page === 0 || page === sheets.length

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
      <CameraRig page={page} totalPages={sheets.length} />

      {/* Animated book wrapper */}
      <BookWrapper isBookClosed={isBookClosed} sheets={sheets} />
    </>
  )
}
