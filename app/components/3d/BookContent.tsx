/**
 * BookContent.tsx
 *
 * Custom R3F content for each face of the 3D book.
 * Everything here runs INSIDE a <RenderTexture> portal, so:
 *  - Only Three.js / R3F / drei primitives are allowed (no React Native <View> / <Text>)
 *  - React context IS preserved (useBookPage works)
 *  - Hooks work normally inside each component
 *
 * Edit BOOK_SHEETS at the bottom to customise page content.
 */

import React, { useState } from "react"
import { Asset } from "expo-asset"
import { PerspectiveCamera, Text, RoundedBox, useTexture } from "@react-three/drei/native"
import { useBookPage } from "./BookPageContext"

// ─── Pre-resolve asset URIs at module load time ───────────────────────────────
// In Expo, require() returns a numeric module ID; Asset.fromModule() gives us
// the real URI string that useTexture (Three.js TextureLoader) can fetch.
const LOGO_URI = Asset.fromModule(require("../../../assets/images/logo.png")).uri
const WELCOME_URI = Asset.fromModule(require("../../../assets/images/welcome-face.png")).uri

// Camera parameters that give a ~1.44 × 1.92 viewport at z=0
// which maps closely onto the 1.28 × 1.71 page leaf.
const CAM_Z = 1.5
const CAM_FOV = 65

// ─── Reusable interactive button ─────────────────────────────────────────────

interface ButtonProps {
  position: [number, number, number]
  label: string
  color: string
  hoverColor: string
  onPress: () => void
}

const PageButton = ({ position, label, color, hoverColor, onPress }: ButtonProps) => {
  const [hovered, setHovered] = useState(false)
  return (
    <group position={position}>
      {/* Button shape */}
      <RoundedBox
        args={[0.58, 0.13, 0.01]}
        radius={0.025}
        smoothness={4}
        onPointerOver={(e: any) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={(e: any) => { e.stopPropagation(); setHovered(false) }}
        onClick={(e: any) => { e.stopPropagation(); onPress() }}
      >
        <meshStandardMaterial color={hovered ? hoverColor : color} />
      </RoundedBox>
      {/* Button label */}
      <Text
        position={[0, 0, 0.008]}
        fontSize={0.055}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

// ─── Cover page ───────────────────────────────────────────────────────────────

export const CoverPage = () => {
  const { setPage } = useBookPage()
  const logo = useTexture(LOGO_URI)

  return (
    <>
      <color attach="background" args={["#5c3a1e"]} />
      <PerspectiveCamera makeDefault position={[0, 0, CAM_Z]} fov={CAM_FOV} />
      <ambientLight intensity={1} />

      {/* Background plane */}
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[3, 4]} />
        <meshBasicMaterial color="#7a4a1e" />
      </mesh>

      {/* Top decorative rule */}
      <mesh position={[0, 0.72, 0]}>
        <planeGeometry args={[1.1, 0.025]} />
        <meshBasicMaterial color="#c8961e" />
      </mesh>

      {/* Logo / hero image */}
      <mesh position={[0, 0.35, 0]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshBasicMaterial map={logo} transparent />
      </mesh>

      {/* Title */}
      <Text
        position={[0, -0.06, 0.01]}
        fontSize={0.12}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.1}
        textAlign="center"
      >
        The Golden Pages
      </Text>

      {/* Subtitle */}
      <Text
        position={[0, -0.29, 0.01]}
        fontSize={0.063}
        color="#e8c87a"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.0}
        textAlign="center"
      >
        A 3D Book Experience
      </Text>

      {/* Bottom decorative rule */}
      <mesh position={[0, -0.5, 0]}>
        <planeGeometry args={[1.1, 0.025]} />
        <meshBasicMaterial color="#c8961e" />
      </mesh>

      {/* CTA button */}
      <PageButton
        position={[0, -0.74, 0.01]}
        label="Begin Reading  →"
        color="#8b4500"
        hoverColor="#c06020"
        onPress={() => setPage(1)}
      />
    </>
  )
}

// ─── Chapter / text page ──────────────────────────────────────────────────────

interface ChapterPageProps {
  chapter: string
  heading: string
  body: string[]
  prevPage: number | null
  nextPage: number | null
}

export const ChapterPage = ({ chapter, heading, body, prevPage, nextPage }: ChapterPageProps) => {
  const { setPage } = useBookPage()

  return (
    <>
      <color attach="background" args={["#f7f0de"]} />
      <PerspectiveCamera makeDefault position={[0, 0, CAM_Z]} fov={CAM_FOV} />
      <ambientLight intensity={1} />

      {/* Chapter label */}
      <Text
        position={[0, 0.83, 0.01]}
        fontSize={0.046}
        color="#9a7030"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
      >
        {chapter.toUpperCase()}
      </Text>

      {/* Horizontal rule */}
      <mesh position={[0, 0.748, 0]}>
        <planeGeometry args={[0.95, 0.006]} />
        <meshBasicMaterial color="#c8a040" />
      </mesh>

      {/* Heading */}
      <Text
        position={[0, 0.59, 0.01]}
        fontSize={0.09}
        color="#3a2200"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.1}
        textAlign="center"
      >
        {heading}
      </Text>

      {/* Body lines */}
      {body.map((line, i) => (
        <Text
          key={i}
          position={[-0.52, 0.39 - i * 0.142, 0.01]}
          fontSize={0.058}
          color="#3a2200"
          anchorX="left"
          anchorY="middle"
          maxWidth={1.06}
        >
          {line}
        </Text>
      ))}

      {/* Navigation */}
      {prevPage !== null && (
        <PageButton
          position={[-0.31, -0.85, 0.01]}
          label="← Prev"
          color="#6b4010"
          hoverColor="#9b6020"
          onPress={() => setPage(prevPage as number)}
        />
      )}
      {nextPage !== null && (
        <PageButton
          position={[0.31, -0.85, 0.01]}
          label="Next →"
          color="#6b4010"
          hoverColor="#9b6020"
          onPress={() => setPage(nextPage as number)}
        />
      )}
    </>
  )
}

// ─── Illustration / image page ────────────────────────────────────────────────

interface IllustrationPageProps {
  imageSrc: string
  caption: string
  prevPage: number | null
  nextPage: number | null
}

export const IllustrationPage = ({ imageSrc, caption, prevPage, nextPage }: IllustrationPageProps) => {
  const { setPage } = useBookPage()
  const tex = useTexture(imageSrc)

  return (
    <>
      <color attach="background" args={["#ece5d0"]} />
      <PerspectiveCamera makeDefault position={[0, 0, CAM_Z]} fov={CAM_FOV} />
      <ambientLight intensity={1} />

      {/* Gold border frame */}
      <mesh position={[0, 0.19, -0.005]}>
        <planeGeometry args={[1.16, 0.93]} />
        <meshBasicMaterial color="#c8a040" />
      </mesh>

      {/* Image */}
      <mesh position={[0, 0.19, 0]}>
        <planeGeometry args={[1.07, 0.85]} />
        <meshBasicMaterial map={tex} />
      </mesh>

      {/* Caption background */}
      <mesh position={[0, -0.38, 0]}>
        <planeGeometry args={[1.1, 0.22]} />
        <meshBasicMaterial color="#d4b878" />
      </mesh>

      {/* Caption text */}
      <Text
        position={[0, -0.38, 0.005]}
        fontSize={0.058}
        color="#3a2200"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.0}
        textAlign="center"
        fontStyle="italic"
      >
        {caption}
      </Text>

      {/* Navigation */}
      {prevPage !== null && (
        <PageButton
          position={[-0.31, -0.85, 0.01]}
          label="← Prev"
          color="#6b4010"
          hoverColor="#9b6020"
          onPress={() => setPage(prevPage as number)}
        />
      )}
      {nextPage !== null && (
        <PageButton
          position={[0.31, -0.85, 0.01]}
          label="Next →"
          color="#6b4010"
          hoverColor="#9b6020"
          onPress={() => setPage(nextPage as number)}
        />
      )}
    </>
  )
}

// ─── Back cover page ─────────────────────────────────────────────────────────

export const BackCoverPage = () => {
  const { setPage } = useBookPage()

  return (
    <>
      <color attach="background" args={["#2e1800"]} />
      <PerspectiveCamera makeDefault position={[0, 0, CAM_Z]} fov={CAM_FOV} />
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0.3, 1]} intensity={1.5} color="#ffd700" />

      {/* Decorative torus ring */}
      <mesh position={[0, 0.24, 0]}>
        <torusGeometry args={[0.24, 0.018, 16, 64]} />
        <meshStandardMaterial color="#c8961e" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Ring fill */}
      <mesh position={[0, 0.24, -0.002]}>
        <circleGeometry args={[0.2, 48]} />
        <meshBasicMaterial color="#1a0c00" />
      </mesh>

      {/* "The End" */}
      <Text
        position={[0, -0.14, 0.01]}
        fontSize={0.12}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
      >
        The End
      </Text>

      {/* Tagline */}
      <Text
        position={[0, -0.38, 0.01]}
        fontSize={0.058}
        color="#c8a060"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.0}
        textAlign="center"
      >
        Thank you for reading
      </Text>

      {/* Back to cover */}
      <PageButton
        position={[0, -0.76, 0.01]}
        label="← Back to Cover"
        color="#6b3800"
        hoverColor="#9b5810"
        onPress={() => setPage(0)}
      />
    </>
  )
}

// ─── BOOK_SHEETS ─────────────────────────────────────────────────────────────
// 4 page leaves → page states 0 (cover closed) … 4 (back cover).
// frontContent = face visible when leaf is NOT yet turned (right side of spread)
// backContent  = face visible when leaf IS turned   (left side of spread)

export const BOOK_SHEETS = [
  {
    frontContent: <CoverPage />,
    backContent: (
      <ChapterPage
        chapter="Chapter One"
        heading="The Beginning"
        body={[
          "In a land where books live",
          "and breathe, the first page",
          "turned with a golden shimmer.",
          "",
          "Every word is a doorway,",
          "every sentence a new world",
          "waiting to be discovered.",
        ]}
        prevPage={0}
        nextPage={2}
      />
    ),
  },
  {
    frontContent: (
      <ChapterPage
        chapter="Chapter Two"
        heading="The Journey"
        body={[
          "The traveller walked between",
          "lines of ink and meaning,",
          "each step a new discovery.",
          "",
          "Mountains of metaphor rose",
          "on the horizon, and rivers",
          "of rhythm flowed below.",
        ]}
        prevPage={1}
        nextPage={3}
      />
    ),
    backContent: (
      <IllustrationPage
        imageSrc={WELCOME_URI}
        caption="A vision from between the pages"
        prevPage={2}
        nextPage={3}
      />
    ),
  },
  {
    frontContent: (
      <ChapterPage
        chapter="Chapter Three"
        heading="The Discovery"
        body={[
          "Deep inside the tome there lay",
          "a secret known only to those",
          "who dared read on.",
          "",
          "It was not a treasure of gold",
          "nor silver — but of stories",
          "more precious than either.",
        ]}
        prevPage={2}
        nextPage={4}
      />
    ),
    backContent: (
      <IllustrationPage
        imageSrc={LOGO_URI}
        caption="The mark of the author"
        prevPage={3}
        nextPage={4}
      />
    ),
  },
  {
    frontContent: (
      <ChapterPage
        chapter="Chapter Four"
        heading="The Return"
        body={[
          "Every great story must circle",
          "back to where it began, but",
          "the reader returns changed.",
          "",
          "The pages that once held",
          "mystery now glow with the",
          "warmth of understanding.",
        ]}
        prevPage={3}
        nextPage={4}
      />
    ),
    backContent: <BackCoverPage />,
  },
]
