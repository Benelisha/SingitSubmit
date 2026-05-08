import React, { useCallback, useEffect, useMemo, useRef } from "react"
import { Dimensions, View, StyleSheet, TouchableOpacity } from "react-native"
import { GameEngine } from "react-native-game-engine"
import { createDiceEntity, diceEntitySystem } from "./entities/DiceEntity"

// Entity renderer component used by GameEngine — props are spread directly from entity data
const EntityRenderer = ({ color, size, position }: { color?: string; size?: number; position: { x: number; y: number } }) => (
  <View
    style={[
      styles.entity,
      {
        backgroundColor: color || "#fff",
        width: size || 40,
        height: size || 40,
        left: position.x,
        top: position.y,
      },
    ]}
  />
)

// Physics system — moves entities based on velocity
const physicsSystem = (entities: any, { time }: { time: { delta: number } }) => {
  const delta = time.delta / 1000
  return Object.keys(entities).reduce((acc: any, key) => {
    const entity = entities[key]
    if (entity.position && entity.velocity) {
      acc[key] = {
        ...entity,
        position: {
          x: entity.position.x + entity.velocity.x * delta,
          y: entity.position.y + entity.velocity.y * delta,
        },
      }
    } else {
      acc[key] = entity
    }
    return acc
  }, {})
}

// Player control system — handles dispatched touch events
const playerControlSystem = (entities: any, { events }: { events: any[] }) => {
  if (!events || !events.length) return entities
  const player = entities.player
  if (!player) return entities

  let updated = player
  events.forEach((event) => {
    if (event.type === "player-move") {
      updated = { ...updated, velocity: event.velocity }
    } else if (event.type === "player-stop") {
      updated = { ...updated, velocity: { x: 0, y: 0 } }
    }
  })
  return { ...entities, player: updated }
}

// Boundary collision system — keeps entities in the game area
const collisionSystem = (entities: any) => {
  return Object.keys(entities).reduce((acc: any, key) => {
    const entity = entities[key]
    if (entity.position && entity.velocity) {
      acc[key] = {
        ...entity,
        velocity: {
          x: entity.position.x <= 0 ? Math.abs(entity.velocity.x) : entity.velocity.x,
          y: entity.position.y <= 0 ? Math.abs(entity.velocity.y) : entity.velocity.y,
        },
      }
    } else {
      acc[key] = entity
    }
    return acc
  }, {})
}

const SYSTEMS = [playerControlSystem, diceEntitySystem, physicsSystem, collisionSystem]

const DEFAULT_DICE_VALUES = [6, 2, 3, 4, 1]
const ENGINE_DICE_SCALE = 0.6
const ENGINE_DICE_SIZE = 97.875 * ENGINE_DICE_SCALE
const ENGINE_DICE_SPACING = 8

type GameViewProps = {
  diceValues?: number[]
  diceRollIds?: number[]
}

// Main GameView component
export function GameView({ diceValues = DEFAULT_DICE_VALUES, diceRollIds = [0, 0, 0, 0, 0] }: GameViewProps) {
  const { width, height } = Dimensions.get("window")
  const gameEngineRef = useRef<any>(null)
  const prevDiceValuesRef = useRef<number[]>(diceValues)
  const prevDiceRollIdsRef = useRef<number[]>(diceRollIds)
  const engineDicePositions = useMemo(() => {
    const rowWidth = ENGINE_DICE_SIZE * DEFAULT_DICE_VALUES.length + ENGINE_DICE_SPACING * (DEFAULT_DICE_VALUES.length - 1)
    const startX = Math.max(16, (width - rowWidth) / 2)
    const baseY = Math.max(120, height - 240)

    return DEFAULT_DICE_VALUES.map((_, index) => ({
      x: startX + index * (ENGINE_DICE_SIZE + ENGINE_DICE_SPACING),
      y: baseY,
    }))
  }, [height, width])

  const initialEntities = useMemo(
    () => ({
      player: {
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        color: "#00ff00",
        size: 30,
        renderer: EntityRenderer,
      },
      enemy1: {
        position: { x: 80, y: 200 },
        velocity: { x: 0, y: 0 },
        color: "#ff0000",
        size: 20,
        renderer: EntityRenderer,
      },
      enemy2: {
        position: { x: 220, y: 300 },
        velocity: { x: 0, y: 0 },
        color: "#ff0000",
        size: 20,
        renderer: EntityRenderer,
      },
      dice0: createDiceEntity({ position: engineDicePositions[0], scale: ENGINE_DICE_SCALE, value: diceValues[0] ?? DEFAULT_DICE_VALUES[0], zIndex: 50 }),
      dice1: createDiceEntity({ position: engineDicePositions[1], scale: ENGINE_DICE_SCALE, value: diceValues[1] ?? DEFAULT_DICE_VALUES[1], zIndex: 50 }),
      dice2: createDiceEntity({ position: engineDicePositions[2], scale: ENGINE_DICE_SCALE, value: diceValues[2] ?? DEFAULT_DICE_VALUES[2], zIndex: 50 }),
      dice3: createDiceEntity({ position: engineDicePositions[3], scale: ENGINE_DICE_SCALE, value: diceValues[3] ?? DEFAULT_DICE_VALUES[3], zIndex: 50 }),
      dice4: createDiceEntity({ position: engineDicePositions[4], scale: ENGINE_DICE_SCALE, value: diceValues[4] ?? DEFAULT_DICE_VALUES[4], zIndex: 50 }),
    }),
    [diceValues, engineDicePositions],
  )

  useEffect(() => {
    const prevValues = prevDiceValuesRef.current
    const prevRollIds = prevDiceRollIdsRef.current

    for (let index = 0; index < engineDicePositions.length; index++) {
      const nextValue = diceValues[index] ?? DEFAULT_DICE_VALUES[index]
      const nextRollId = diceRollIds[index] ?? 0
      if (prevValues[index] === nextValue && prevRollIds[index] === nextRollId) continue

      gameEngineRef.current?.dispatch({
        type: "dice-roll",
        entityId: `dice${index}`,
        value: nextValue,
        rollId: nextRollId,
      })
    }

    prevDiceValuesRef.current = [...diceValues]
    prevDiceRollIdsRef.current = [...diceRollIds]
  }, [diceValues, diceRollIds, engineDicePositions.length])

  const handleTouchStart = useCallback(() => {
    gameEngineRef.current?.dispatch({ type: "player-move", velocity: { x: -5, y: -5 } })
  }, [])

  const handleTouchEnd = useCallback(() => {
    gameEngineRef.current?.dispatch({ type: "player-stop" })
  }, [])

  return (
    <View style={styles.gameContainer}>
      <TouchableOpacity
        style={styles.touchArea}
        onPressIn={handleTouchStart}
        onPressOut={handleTouchEnd}
        activeOpacity={1}
      />
      <GameEngine
        ref={gameEngineRef}
        style={styles.gameArea}
        systems={SYSTEMS}
        entities={initialEntities}
      />
    </View>
  )
}


const styles = StyleSheet.create({
  gameContainer: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    ...StyleSheet.absoluteFillObject,
  },
  touchArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gameArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#16213e",
  },
  entity: {
    position: "absolute" as const,
    borderRadius: 4,
  },
})