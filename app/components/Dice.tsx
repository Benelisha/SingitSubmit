import React, { useState, useRef, useCallback, useEffect } from "react"
import { View, Image, StyleSheet, Animated, Easing, StyleProp, ViewStyle } from "react-native"

// ─── Sprite sheet constants ───────────────────────────────────────────────────
const SHEET_WIDTH = 783
const SHEET_HEIGHT = 386
const COLS = 8
const ROWS = 4
const FRAME_W = SHEET_WIDTH / COLS // 97.875
const FRAME_H = SHEET_HEIGHT / ROWS // 96.5

/** Column indices that are spin frames (not a rest/face column). */
const SPIN_COLS = [0, 1, 2, 4, 5, 6]

/** Every non-rest frame in row order — 4 rows × 6 cols = 24 frames. */
const FULL_SPIN_CYCLE: [number, number][] = []
for (let r = 0; r < ROWS; r++) {
  for (const c of SPIN_COLS) {
    FULL_SPIN_CYCLE.push([r, c])
  }
}

/** Mapping from face value → [row, col] in the sprite sheet. */
const FACE_MAP: Record<number, [number, number]> = {
  1: [3, 3],
  2: [0, 3],
  3: [2, 7],
  4: [0, 7],
  5: [2, 3],
  6: [1, 7],
}

// ─── Timing constants ─────────────────────────────────────────────────────────
/** How long the die rises to its peak (ms). Sprite spins only during this phase. */
const JUMP_UP_DURATION = 220
/** How fast sprite frames flip during ascent (ms/frame). */
const FRAME_INTERVAL_MS = 30
/**
 * Fall + bounce timing:
 *   fall        300 ms  (easeIn gravity)
 *   bounce up   150 ms  (easeOut)
 *   bounce down 110 ms  (easeIn)
 *   settle        70 ms  (easeOut)
 */
const FALL_MS   = 300
const B1_UP_MS  = 100
const B1_DN_MS  =  80
const SETTLE_MS =  60
const PRE_LAND_SPIN_FRAMES = 8

const LANDING_MOTION_MS = FALL_MS + B1_UP_MS + B1_DN_MS

// ─── Types ────────────────────────────────────────────────────────────────────
type Frame = [number, number] // [row, col]

type DiceProps = {
  scale?: number
  value?: number
  rollId?: number
  style?: StyleProp<ViewStyle>
}

const clampFaceValue = (face?: number) => {
  const numericFace = typeof face === "number" ? face : 6
  return Math.min(6, Math.max(1, Math.round(numericFace)))
}

// ─── Component ───────────────────────────────────────────────────────────────
export function Dice({ scale = 1, value = 6, rollId = 0, style }: DiceProps) {
  const initialFace = clampFaceValue(value)
  const [currentFrame, setCurrentFrame] = useState<Frame>(FACE_MAP[initialFace])
  const [isRolling, setIsRolling] = useState(false)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const landingTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const spinIndexRef  = useRef(0)
  const translateY    = useRef(new Animated.Value(0)).current
  const rotate        = useRef(new Animated.Value(0)).current

  const parentScale = containerSize
    ? Math.min(containerSize.width / FRAME_W, containerSize.height / FRAME_H)
    : undefined
  const resolvedScale = Math.max(parentScale ?? scale, 0.1)
  const scaledFrameWidth = FRAME_W * resolvedScale
  const scaledFrameHeight = FRAME_H * resolvedScale
  const scaledSheetWidth = SHEET_WIDTH * resolvedScale
  const scaledSheetHeight = SHEET_HEIGHT * resolvedScale
  const scaledPadding = 10 * resolvedScale
  const lastRollIdRef = useRef(rollId)

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const clearLandingTimers = useCallback(() => {
    landingTimersRef.current.forEach((timer) => clearTimeout(timer))
    landingTimersRef.current = []
  }, [])

  const runLandingFrames = useCallback((frames: Frame[], totalDurationMs: number) => {
    clearLandingTimers()

    if (!frames.length) return

    setCurrentFrame(frames[0])

    if (frames.length === 1) return

    const stepMs = totalDurationMs / (frames.length - 1)

    for (let i = 1; i < frames.length; i++) {
      const timer = setTimeout(() => {
        setCurrentFrame(frames[i])
      }, i * stepMs)
      landingTimersRef.current.push(timer)
    }
  }, [clearLandingTimers])

  useEffect(() => {
    return () => {
      stopInterval()
      clearLandingTimers()
    }
  }, [stopInterval, clearLandingTimers])

  const roll = useCallback((targetFace: number) => {
    if (isRolling) return

    const result = clampFaceValue(targetFace)
    const landingFrames = [FACE_MAP[result]]
    const rotationDirection = Math.random() < 0.5 ? -1 : 1
    const peakRotation = (300 + Math.random() * 220) * rotationDirection // +/-300deg-520deg

    translateY.setValue(0)
    rotate.setValue(0)
    spinIndexRef.current = 0
    clearLandingTimers()
    setIsRolling(true)
    setCurrentFrame(FULL_SPIN_CYCLE[0])

    intervalRef.current = setInterval(() => {
      spinIndexRef.current = (spinIndexRef.current + 1) % FULL_SPIN_CYCLE.length
      setCurrentFrame(FULL_SPIN_CYCLE[spinIndexRef.current])
    }, FRAME_INTERVAL_MS)

    // ── Phase 1: jump up + optional rotate ────────────────────────────
    const phase1Anims: Animated.CompositeAnimation[] = []

    phase1Anims.push(
      Animated.timing(translateY, {
        toValue: -90,
        duration: JUMP_UP_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    )

    phase1Anims.push(
      Animated.timing(rotate, {
        toValue: peakRotation,
        duration: JUMP_UP_DURATION,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    )

    const startPhase2 = () => {
      // At peak: stop spin cycle and start the mapped 3-step landing sequence.
      stopInterval()

      const preLandFrames: Frame[] = []
      for (let i = 0; i < PRE_LAND_SPIN_FRAMES; i++) {
        const idx = (spinIndexRef.current + 1 + i) % FULL_SPIN_CYCLE.length
        preLandFrames.push(FULL_SPIN_CYCLE[idx])
      }

      const landingSequence = [FULL_SPIN_CYCLE[spinIndexRef.current], ...preLandFrames, ...landingFrames]
      const landingDurationMs = LANDING_MOTION_MS
      runLandingFrames(landingSequence, landingDurationMs)

      // ── Phase 2: fall with bounces + rotation snaps to 0 ─────────
      const phase2Anims: Animated.CompositeAnimation[] = []

      phase2Anims.push(
        Animated.sequence([
          // Fall to ground (slight overshoot)
          Animated.timing(translateY, {
            toValue: 6,
            duration: FALL_MS,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          // Bounce up
          Animated.timing(translateY, {
            toValue: -10,
            duration: B1_UP_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // Bounce back down (slight overshoot)
          Animated.timing(translateY, {
            toValue: 2,
            duration: B1_DN_MS,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          // Settle
          Animated.timing(translateY, {
            toValue: 0,
            duration: SETTLE_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      )

      phase2Anims.push(
        Animated.timing(rotate, {
          toValue: 0,
          duration: LANDING_MOTION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      )

      const endRoll = () => {
        clearLandingTimers()
        setCurrentFrame(landingFrames[landingFrames.length - 1])
        setIsRolling(false)
      }

      Animated.parallel(phase2Anims).start(endRoll)
    }

    if (!phase1Anims.length) {
      const timer = setTimeout(startPhase2, JUMP_UP_DURATION)
      landingTimersRef.current.push(timer)
    } else if (phase1Anims.length === 1) {
      phase1Anims[0].start(startPhase2)
    } else {
      Animated.parallel(phase1Anims).start(startPhase2)
    }
  }, [
    isRolling,
    rotate,
    translateY,
    stopInterval,
    runLandingFrames,
    clearLandingTimers,
  ])

  useEffect(() => {
    if (rollId === lastRollIdRef.current) return
    lastRollIdRef.current = rollId
    roll(value)
  }, [rollId, value, roll])

  useEffect(() => {
    if (isRolling) return
    if (rollId !== lastRollIdRef.current) return

    const nextFace = clampFaceValue(value)
    setCurrentFrame(FACE_MAP[nextFace])
  }, [value, isRolling, rollId])

  const [row, col] = currentFrame
  const rotateInterpolated = rotate.interpolate({
    inputRange: [-2160, 2160],
    outputRange: ["-2160deg", "2160deg"],
  })

  return (
    <Animated.View
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout
        if (width > 0 && height > 0) {
          setContainerSize((prev) => {
            if (prev && prev.width === width && prev.height === height) return prev
            return { width, height }
          })
        }
      }}
      style={[
        styles.animWrapper,
        style,
        { padding: scaledPadding },
        { transform: [{ translateY }, { rotate: rotateInterpolated }] },
      ]}
    >
      <View style={[styles.frameContainer, { width: scaledFrameWidth, height: scaledFrameHeight }]}>
        <Image
          source={require("../../assets/dice.png")}
          style={[
            styles.sheet,
            {
              width: scaledSheetWidth,
              height: scaledSheetHeight,
              left: -col * scaledFrameWidth,
              top:  -row * scaledFrameHeight,
            },
          ]}
          resizeMode="cover"
        />
      </View>
    </Animated.View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  animWrapper: {
    padding: 0,
  },
  frameContainer: {
    width: 0,
    height: 0,
    overflow: "hidden",
  },
  sheet: {
    position: "absolute",
  },
})
