import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Bone,
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MathUtils,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  Texture,
  Uint16BufferAttribute,
  Vector3,
} from "three"
import { useFrame } from "@react-three/fiber"
import { RenderTexture } from "@react-three/drei/native"
import { easing } from "maath"
import { useBookPage } from "./BookPageContext"

export interface BookSheet {
  frontContent: React.ReactNode
  backContent: React.ReactNode
}

// ---------------------------------------------------------------------------
// Geometry constants
// ---------------------------------------------------------------------------
const PAGE_WIDTH = 1.28
const PAGE_HEIGHT = 1.71 // 4:3 aspect ratio
const PAGE_DEPTH = 0.003
const PAGE_SEGMENTS = 30
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS

const EASING_FACTOR = 0.5
const EASING_FACTOR_FOLD = 0.3
// const INSIDE_CURVE_STRENGTH = 0.18
// const OUTSIDE_CURVE_STRENGTH = 0.05
// const TURNING_CURVE_STRENGTH = 0.09
const INSIDE_CURVE_STRENGTH = 0.2
const OUTSIDE_CURVE_STRENGTH = 0
const TURNING_CURVE_STRENGTH = 0

// ---------------------------------------------------------------------------
// Shared page geometry (built once, reused by every Page)
// ---------------------------------------------------------------------------
const pageGeometry = new BoxGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH, PAGE_SEGMENTS, 2)
pageGeometry.translate(PAGE_WIDTH / 2, 0, 0) // spine is at x=0

const _vertex = new Vector3()
const skinIndexes: number[] = []
const skinWeights: number[] = []

for (let i = 0; i < pageGeometry.attributes.position.count; i++) {
  _vertex.fromBufferAttribute(pageGeometry.attributes.position, i)
  const x = _vertex.x
  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH))
  const skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH
  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0)
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0)
}

pageGeometry.setAttribute("skinIndex", new Uint16BufferAttribute(skinIndexes, 4))
pageGeometry.setAttribute("skinWeight", new Float32BufferAttribute(skinWeights, 4))

// ─── Shared edge / spine materials (indices 0–3, never modified) ─────────────
const whiteColor = new Color("white")
const emissiveColor = new Color("orange")

const pageSideMaterials = [
  new MeshStandardMaterial({ color: whiteColor }),  // +x right edge
  new MeshStandardMaterial({ color: "#111" }),       // −x spine
  new MeshStandardMaterial({ color: whiteColor }),  // +y top
  new MeshStandardMaterial({ color: whiteColor }),  // −y bottom
]

// ─── Page ─────────────────────────────────────────────────────────────────────
interface PageProps {
  number: number
  totalSheets: number
  frontContent: React.ReactNode
  backContent: React.ReactNode
  page: number           // delayed page index driving the animation
  opened: boolean
  bookClosed: boolean
  [key: string]: unknown
}

const Page = ({ number, totalSheets, frontContent, backContent, page, opened, bookClosed, ...props }: PageProps) => {
  const groupRef = useRef<any>(null)
  const skinnedMeshRef = useRef<SkinnedMesh | null>(null)
  const turnedAt = useRef(0)
  const lastOpened = useRef(opened)
  // Animated curve scale: 1 on cover/back, 0.5 while flipping, eases to 0.02 when settled in read mode
  const curveScaleRef = useRef(1)

  // Stable face materials — their `.map` is set imperatively by the RenderTexture
  // functional `attach` callbacks below.
  const frontMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: whiteColor,
        roughness: number === 0 ? 0.6 : 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
    [number],
  )

  const backMat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: whiteColor,
        roughness: number === totalSheets - 1 ? 0.6 : 0.1,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
    [number, totalSheets],
  )

  // Build the SkinnedMesh once; reuse the same frontMat/backMat objects so that
  // when RenderTexture writes to their .map the mesh sees it immediately.
  const skinnedMesh = useMemo(() => {
    const bones: Bone[] = []
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      const bone = new Bone()
      if (i === 0) bone.position.x = 0
      else bone.position.x = SEGMENT_WIDTH
      if (i > 0) bones[i - 1].add(bone)
      bones.push(bone)
    }
    const skeleton = new Skeleton(bones)
    const mesh = new SkinnedMesh(pageGeometry, [...pageSideMaterials, frontMat, backMat])
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    mesh.add(skeleton.bones[0])
    mesh.bind(skeleton)
    return mesh
  }, [frontMat, backMat])

  // Per-frame: page-curl animation
  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) return

    if (lastOpened.current !== opened) {
      turnedAt.current = Date.now()
      lastOpened.current = opened
    }
    let turningTime = Math.min(400, Date.now() - turnedAt.current) / 400
    turningTime = Math.sin(turningTime * Math.PI)

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2
    if (!bookClosed) targetRotation += MathUtils.degToRad(number * 0.8)

    // In read mode: ease curl toward 0.02 once the flip animation finishes (~500 ms).
    // During a flip or when cover/back is showing, restore the normal curl strength.
    const timeSinceFlip = Date.now() - turnedAt.current
    const isFlipping = timeSinceFlip < 500
    const targetCurveScale = bookClosed ? 1.0 : isFlipping ? 0.5 : 0.85
    // Fast snap back when a flip starts; slow, smooth settle to flat in read mode
    easing.damp(curveScaleRef, "current", targetCurveScale, isFlipping ? 5 : 0.35, delta)

    const bones = skinnedMeshRef.current.skeleton.bones
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? groupRef.current : bones[i]

      const insideCurve = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0
      const outsideCurve = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0
      const turningIntensity = Math.sin(i * Math.PI * (1 / bones.length)) * turningTime

      let rotationAngle =
        INSIDE_CURVE_STRENGTH * curveScaleRef.current * insideCurve * targetRotation -
        OUTSIDE_CURVE_STRENGTH * curveScaleRef.current * outsideCurve * targetRotation +
        TURNING_CURVE_STRENGTH * turningIntensity * targetRotation

      let foldAngle = MathUtils.degToRad(Math.sin(targetRotation) * 2)

      if (bookClosed) {
        rotationAngle = i === 0 ? targetRotation : 0
        foldAngle = 0
      }

      easing.dampAngle(target.rotation, "y", rotationAngle, EASING_FACTOR, delta)

      const foldIntensity =
        i > 8 ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime : 0
      easing.dampAngle(target.rotation, "x", foldAngle * foldIntensity, EASING_FACTOR_FOLD, delta)
    }
  })

  const { setPage: _setPage } = useBookPage()
  void _setPage // kept for portal children (BookContent buttons use context directly)

  // Functional `attach` callbacks: R3F calls attach(parent, self) where
  // self = the FBO texture exposed by RenderTexture. We write it to the face material.
  const attachFront = useMemo(
    () =>
      (_parent: any, self: Texture) => {
        frontMat.map = self
        frontMat.needsUpdate = true
        return () => {
          frontMat.map = null
          frontMat.needsUpdate = true
        }
      },
    [frontMat],
  )

  const attachBack = useMemo(
    () =>
      (_parent: any, self: Texture) => {
        backMat.map = self
        backMat.needsUpdate = true
        return () => {
          backMat.map = null
          backMat.needsUpdate = true
        }
      },
    [backMat],
  )

  return (
    <group
      {...props}
      ref={groupRef}
    >
      {/* The animated page leaf */}
      <primitive
        object={skinnedMesh}
        ref={skinnedMeshRef}
        position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
        onPointerDown={(e: any) => e.stopPropagation()}
      />

      {/* Front face (+z) — rendered into a 512×682 FBO */}
      <RenderTexture attach={attachFront as any} width={512} height={682}>
        {frontContent}
      </RenderTexture>

      {/* Back face (−z) — rendered into a 512×682 FBO */}
      <RenderTexture attach={attachBack as any} width={512} height={682}>
        {backContent}
      </RenderTexture>
    </group>
  )
}

// ─── Book ─────────────────────────────────────────────────────────────────────

export const Book = ({ sheets, ...props }: { sheets: BookSheet[]; [key: string]: unknown }) => {
  const { page } = useBookPage()
  const [delayedPage, setDelayedPage] = useState(page)

  // Step one leaf at a time so every flip animation plays
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const goToPage = () => {
      setDelayedPage((prev) => {
        if (prev === page) return prev
        timeout = setTimeout(goToPage, Math.abs(page - prev) > 2 ? 50 : 150)
        return page > prev ? prev + 1 : prev - 1
      })
    }
    goToPage()
    return () => clearTimeout(timeout)
  }, [page])

  return (
    <group {...props} rotation-y={Math.PI / 2}>
      {sheets.map((sheet, index) => (
        <Page
          key={index}
          number={index}
          totalSheets={sheets.length}
          frontContent={sheet.frontContent}
          backContent={sheet.backContent}
          page={delayedPage}
          opened={delayedPage > index}
          bookClosed={delayedPage === 0 || delayedPage === sheets.length}
        />
      ))}
    </group>
  )
}
