import React, { Suspense, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { easing } from "maath"
import { Book, BookSheet } from "./Book"
import { useBookPage } from "./BookPageContext"

// When true, shadows are only rendered in Cover mode and fade out in Read mode.
const NO_SHADOW_READMODE = true

// ─── Light rig ────────────────────────────────────────────────────────────────
// All 4 lights are always mounted. useFrame smoothly lerps their positions and
// intensities between Cover mode (dramatic / cinematic) and Read mode (bright /
// even — optimised for kids reading the page text).
const LightRig = ({ isBookClosed, keyLightRef }: { isBookClosed: boolean; keyLightRef: React.RefObject<any> }) => {
  const ambientRef  = useRef<any>(null)
  const keyRef      = keyLightRef
  const rimRef      = useRef<any>(null)
  const fillRef     = useRef<any>(null)

  useFrame((_, delta) => {
    const s = 0.4 // shared smoothing constant

    // Ambient — moody for cover, bright for reading
    if (ambientRef.current) {
      easing.damp(ambientRef.current, "intensity", isBookClosed ? 0.25 : 1.3, s, delta)
    }

    // Key — upper-right hero for cover; centered, close and frontal for reading
    if (keyRef.current) {
      easing.damp3(keyRef.current.position, isBookClosed ? [3, 7, 4] : [0, 3, 7], s, delta)
      easing.damp(keyRef.current, "intensity", isBookClosed ? 1.8 : 1.2, s, delta)
    }

    // Rim / left-fill — back-left blue rim for cover; wide left fill for reading
    if (rimRef.current) {
      easing.damp3(rimRef.current.position, isBookClosed ? [-3, 4, -3] : [-6, 2, 5], s, delta)
      easing.damp(rimRef.current, "intensity", isBookClosed ? 1.4 : .8, s, delta)
    }

    // Bounce / right-fill — warm bounce below for cover; wide right fill for reading
    if (fillRef.current) {
      easing.damp3(fillRef.current.position, isBookClosed ? [-1, -2, 4] : [6, 2, 5], s, delta)
      easing.damp(fillRef.current, "intensity", isBookClosed ? 0.5 : .8, s, delta)
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.25} />
      {/* Key — shadow-casting main light */}
      <directionalLight
        ref={keyRef}
        position={[3, 7, 4]}
        intensity={3.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      {/* Rim / left fill */}
      <directionalLight ref={rimRef} position={[-3, 4, -3]} intensity={1.4} />
      {/* Bounce / right fill */}
      <directionalLight ref={fillRef} position={[-1, -2, 4]} intensity={0.5} />
    </>
  )
}

// Shadow-receiving floor plane whose opacity fades in/out with the mode.
// The key light's castShadow is only disabled AFTER the opacity reaches ~0,
// so both directions (cover→read and read→cover) animate smoothly.
const ShadowPlane = ({ isBookClosed, keyLightRef }: { isBookClosed: boolean; keyLightRef: React.RefObject<any> }) => {
  const matRef = useRef<any>(null)
  useFrame((_, delta) => {
    if (!matRef.current) return
    const targetOpacity = NO_SHADOW_READMODE && !isBookClosed ? 0 : 0.22
    easing.damp(matRef.current, "opacity", targetOpacity, 0.4, delta)
    // Re-enable castShadow as soon as we start fading back in;
    // disable it only once fully faded out (avoids the instant-cut on exit).
    if (keyLightRef.current && NO_SHADOW_READMODE) {
      if (matRef.current.opacity < 0.01) {
        keyLightRef.current.castShadow = false
      } else {
        keyLightRef.current.castShadow = true
      }
    }
  })
  return (
    <mesh position-y={-1.5} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <shadowMaterial ref={matRef} transparent opacity={0.22} />
    </mesh>
  )
}

// Smoothly moves the camera between the tilted cover view and the flat page view.
// X is always 0 — we rely purely on Y/Z shift + tilt to frame the closed book.
const CameraRig = ({ page, totalPages }: { page: number; totalPages: number }) => {
  const { camera } = useThree()
  useFrame((_, delta) => {
    const isBookClosed = page === 0 || page === totalPages
    const targetX = isBookClosed ? 0 : 0
    const targetY = isBookClosed ? 1.5 : 0
    const targetZ = isBookClosed ? 3 : 2.5
    easing.damp3(camera.position, [targetX, targetY, targetZ], 0.4, delta)
    camera.lookAt(0, 0, 0)
  })
  return null
}

// Wraps the book, animating the tilt and a gentle float bob on cover/back only.
const BookWrapper = ({ isBookClosed, sheets, page }: { isBookClosed: boolean; sheets: BookSheet[]; page: number }) => {
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
    // X: -0.5 on start (page 0), 0.5 on end (last page), 0 while reading
    const targetX = page === 0 ? -0.5 : page === sheets.length ? 0.5 : 0
    easing.damp(groupRef.current.position, "x", targetX, 0.4, delta)
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
  const keyLightRef = useRef<any>(null)

  return (
    <>
      <LightRig isBookClosed={isBookClosed} keyLightRef={keyLightRef} />

      {/* Shadow receiver — opacity fades to 0 in Read mode */}
      <ShadowPlane isBookClosed={isBookClosed} keyLightRef={keyLightRef} />

      {/* Camera animation rig */}
      <CameraRig page={page} totalPages={sheets.length} />

      {/* Animated book wrapper */}
      <BookWrapper isBookClosed={isBookClosed} sheets={sheets} page={page} />
    </>
  )
}
