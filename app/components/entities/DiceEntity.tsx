import React from "react"
import { Image, StyleSheet, View } from "react-native"

// Renders a dice sprite from entity frame data inside react-native-game-engine.
export const DiceEntityRenderer = ({
  position,
  scale = 1,
  frame = FACE_MAP[6],
  translateY = 0,
  rotateDeg = 0,
  zIndex = 20,
}: DiceRenderProps) => {
  const [row, col] = frame
  const safeScale = Math.max(scale, 0.1)
  const frameWidth = FRAME_W * safeScale
  const frameHeight = FRAME_H * safeScale
  const sheetWidth = SHEET_WIDTH * safeScale
  const sheetHeight = SHEET_HEIGHT * safeScale

  return (
    <View
      style={[
        styles.entity,
        {
          left: position.x,
          top: position.y,
          width: frameWidth,
          height: frameHeight,
          zIndex,
          transform: [{ translateY }, { rotate: `${rotateDeg}deg` }],
        },
      ]}
    >
      <View style={[styles.frameContainer, { width: frameWidth, height: frameHeight }]}>
        <Image
          source={require("../../../assets/dice.png")}
          style={[
            styles.sheet,
            {
              width: sheetWidth,
              height: sheetHeight,
              left: -col * frameWidth,
              top: -row * frameHeight,
            },
          ]}
          resizeMode="cover"
        />
      </View>
    </View>
  )
}

// Advances dice animation in engine time and updates sprite frame/motion values.
export const diceEntitySystem = (
  entities: Record<string, any>,
  { time, events }: { time: { delta: number }; events?: Array<Record<string, any>> },
) => {
  const deltaMs = time?.delta ?? 0
  if (!deltaMs) return entities

  const diceEntries = Object.entries(entities).filter(([, entity]) => entity?.type === "dice")
  if (!diceEntries.length) return entities

  const rollEvents = (events ?? []).filter((event) => event?.type === "dice-roll")
  const nextEntities = { ...entities }

  for (const [entityId, entity] of diceEntries) {
    let nextEntity = entity as DiceEntity

    for (const rollEvent of rollEvents) {
      const targetId = rollEvent.entityId
      if (targetId && targetId !== entityId) continue

      const nextRollId = typeof rollEvent.rollId === "number" ? rollEvent.rollId : nextEntity.rollId + 1
      if (nextRollId === nextEntity.rollId) continue

      const targetFace = clampFaceValue(rollEvent.value)
      nextEntity = startRoll(nextEntity, targetFace, nextRollId)
    }

    if (nextEntity.isRolling) {
      nextEntity = advanceRoll(nextEntity, deltaMs)
    }

    nextEntities[entityId] = nextEntity
  }

  return nextEntities
}

// Creates a game-engine dice entity with sprite animation state.
export const createDiceEntity = (config: Partial<DiceEntityConfig> = {}): DiceEntity => {
  const initialFace = clampFaceValue(config.value)

  return {
    type: "dice",
    renderer: DiceEntityRenderer,
    position: config.position ?? { x: 140, y: 240 },
    scale: config.scale ?? 1,
    zIndex: config.zIndex ?? 20,
    frame: FACE_MAP[initialFace],
    value: initialFace,
    rollId: config.rollId ?? 0,
    isRolling: false,
    translateY: 0,
    rotateDeg: 0,
    elapsedMs: 0,
    spinElapsedMs: 0,
    spinIndex: 0,
    peakRotation: 0,
    targetFace: initialFace,
    landingFrames: [FACE_MAP[initialFace]],
  }
}

// Starts a new dice roll and resets phase state for engine-driven animation.
const startRoll = (entity: DiceEntity, targetFace: number, rollId: number): DiceEntity => {
  const rotationDirection = Math.random() < 0.5 ? -1 : 1
  const peakRotation = (300 + Math.random() * 220) * rotationDirection

  return {
    ...entity,
    rollId,
    value: targetFace,
    targetFace,
    isRolling: true,
    elapsedMs: 0,
    spinElapsedMs: 0,
    spinIndex: 0,
    frame: FULL_SPIN_CYCLE[0],
    translateY: 0,
    rotateDeg: 0,
    peakRotation,
    landingFrames: [FACE_MAP[targetFace]],
  }
}

// Steps a rolling dice entity forward by delta time and resolves to a rest face.
const advanceRoll = (entity: DiceEntity, deltaMs: number): DiceEntity => {
  const elapsedMs = entity.elapsedMs + deltaMs

  if (elapsedMs < JUMP_UP_DURATION) {
    const progress = elapsedMs / JUMP_UP_DURATION
    const eased = easeOutQuad(progress)

    let spinElapsedMs = entity.spinElapsedMs + deltaMs
    let spinIndex = entity.spinIndex

    while (spinElapsedMs >= FRAME_INTERVAL_MS) {
      spinElapsedMs -= FRAME_INTERVAL_MS
      spinIndex = (spinIndex + 1) % FULL_SPIN_CYCLE.length
    }

    return {
      ...entity,
      elapsedMs,
      spinElapsedMs,
      spinIndex,
      frame: FULL_SPIN_CYCLE[spinIndex],
      translateY: -90 * eased,
      rotateDeg: entity.peakRotation * eased,
    }
  }

  const landElapsedMs = Math.min(elapsedMs - JUMP_UP_DURATION, LANDING_MOTION_MS + SETTLE_MS)
  const { translateY, rotateDeg } = getLandingMotion(entity.peakRotation, landElapsedMs)
  const frame = getLandingFrame(entity, landElapsedMs)
  const finished = landElapsedMs >= LANDING_MOTION_MS + SETTLE_MS

  if (finished) {
    return {
      ...entity,
      isRolling: false,
      elapsedMs,
      spinElapsedMs: 0,
      spinIndex: 0,
      frame: FACE_MAP[entity.targetFace],
      translateY: 0,
      rotateDeg: 0,
    }
  }

  return {
    ...entity,
    elapsedMs,
    frame,
    translateY,
    rotateDeg,
  }
}

// Samples landing frame progression across the fall+bounce animation window.
const getLandingFrame = (entity: DiceEntity, landElapsedMs: number): Frame => {
  const preLandFrames: Frame[] = []
  for (let i = 0; i < PRE_LAND_SPIN_FRAMES; i++) {
    const index = (entity.spinIndex + 1 + i) % FULL_SPIN_CYCLE.length
    preLandFrames.push(FULL_SPIN_CYCLE[index])
  }

  const sequence = [FULL_SPIN_CYCLE[entity.spinIndex], ...preLandFrames, ...entity.landingFrames]
  if (sequence.length === 1) return sequence[0]

  const progress = Math.min(1, landElapsedMs / LANDING_MOTION_MS)
  const frameIndex = Math.min(sequence.length - 1, Math.floor(progress * (sequence.length - 1)))
  return sequence[frameIndex]
}

// Returns Y translation and rotation values for the landing and settle phases.
const getLandingMotion = (peakRotation: number, elapsedMs: number) => {
  if (elapsedMs <= FALL_MS) {
    const t = elapsedMs / FALL_MS
    return {
      translateY: lerp(-90, 4, easeInQuad(t)),
      rotateDeg: lerp(peakRotation, 0, easeOutCubic(t)),
    }
  }

  if (elapsedMs <= FALL_MS + B1_UP_MS) {
    const t = (elapsedMs - FALL_MS) / B1_UP_MS
    return {
      translateY: lerp(4, -6, easeOutQuad(t)),
      rotateDeg: 0,
    }
  }

  if (elapsedMs <= FALL_MS + B1_UP_MS + B1_DN_MS) {
    const t = (elapsedMs - FALL_MS - B1_UP_MS) / B1_DN_MS
    return {
      translateY: lerp(-6, 1, easeInQuad(t)),
      rotateDeg: 0,
    }
  }

  const settleElapsed = Math.min(SETTLE_MS, elapsedMs - FALL_MS - B1_UP_MS - B1_DN_MS)
  const t = settleElapsed / SETTLE_MS

  return {
    translateY: lerp(1, 0, easeOutQuad(t)),
    rotateDeg: 0,
  }
}

// Linearly interpolates between numeric values.
const lerp = (from: number, to: number, t: number) => from + (to - from) * t

// Easing helper matching Animated Easing.out(Easing.quad).
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t)

// Easing helper matching Animated Easing.in(Easing.quad).
const easeInQuad = (t: number) => t * t

// Easing helper matching Animated Easing.out(Easing.cubic).
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

// Ensures a face value remains in the 1..6 range.
const clampFaceValue = (face?: number) => {
  const numericFace = typeof face === "number" ? face : 6
  return Math.min(6, Math.max(1, Math.round(numericFace)))
}

type Frame = [number, number]

type DiceRenderProps = {
  position: { x: number; y: number }
  scale?: number
  frame?: Frame
  translateY?: number
  rotateDeg?: number
  zIndex?: number
}

type DiceEntityConfig = {
  position: { x: number; y: number }
  scale: number
  zIndex: number
  value: number
  rollId: number
}

type DiceEntity = {
  type: "dice"
  renderer: typeof DiceEntityRenderer
  position: { x: number; y: number }
  scale: number
  zIndex: number
  frame: Frame
  value: number
  rollId: number
  isRolling: boolean
  translateY: number
  rotateDeg: number
  elapsedMs: number
  spinElapsedMs: number
  spinIndex: number
  peakRotation: number
  targetFace: number
  landingFrames: Frame[]
}

// Sprite sheet constants shared with the existing component implementation.
const SHEET_WIDTH = 783
const SHEET_HEIGHT = 386
const COLS = 8
const ROWS = 4
const FRAME_W = SHEET_WIDTH / COLS
const FRAME_H = SHEET_HEIGHT / ROWS

const SPIN_COLS = [0, 1, 2, 4, 5, 6]

const FULL_SPIN_CYCLE: Frame[] = []
for (let row = 0; row < ROWS; row++) {
  for (const col of SPIN_COLS) {
    FULL_SPIN_CYCLE.push([row, col])
  }
}

const FACE_MAP: Record<number, Frame> = {
  1: [3, 3],
  2: [0, 3],
  3: [2, 7],
  4: [0, 7],
  5: [2, 3],
  6: [1, 7],
}

const JUMP_UP_DURATION = 220
const FRAME_INTERVAL_MS = 30
const FALL_MS = 300
const B1_UP_MS = 70
const B1_DN_MS = 50
const SETTLE_MS = 35
const PRE_LAND_SPIN_FRAMES = 8
const LANDING_MOTION_MS = FALL_MS + B1_UP_MS + B1_DN_MS

const styles = StyleSheet.create({
  entity: {
    position: "absolute",
  },
  frameContainer: {
    overflow: "hidden",
  },
  sheet: {
    position: "absolute",
  },
})
