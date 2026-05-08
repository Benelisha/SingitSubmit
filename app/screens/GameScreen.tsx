import { useCallback, useEffect, useRef, useState } from "react"
import { View, ViewStyle, StyleSheet, BackHandler, Pressable } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { useFocusEffect } from "@react-navigation/native"
import { GameStackParamList } from "@/navigators/GameStackNavigator"
import { useAppTheme } from "@/theme/context"
import { Button } from "@/components/UI/Button"
import { GameView } from "@/components/GameView"
import { Dice } from "@/components/Dice"

type Props = NativeStackScreenProps<GameStackParamList, "GameScreen">

// Render the battle game screen with overlay controls and dice actions.
export default function GameScreen({ navigation }: Props) {
  const { themed } = useAppTheme()
  // Current face value shown for each bottom dice.
  const [diceValues, setDiceValues] = useState<number[]>([6, 2, 3, 4, 1])
  // Bumping one id triggers roll animation only for that specific dice.
  const [diceRollIds, setDiceRollIds] = useState<number[]>([0, 0, 0, 0, 0])
  const attackTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  // Clear and reset pending attack animation timers to avoid stale updates.
  const clearAttackTimers = useCallback(() => {
    attackTimersRef.current.forEach((timer) => clearTimeout(timer))
    attackTimersRef.current = []
  }, [])

  // Dispose queued timers when the screen unmounts.
  useEffect(() => {
    return () => clearAttackTimers()
  }, [clearAttackTimers])

  // Block Android hardware back presses while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => true)
      return () => subscription.remove()
    }, []),
  )

  // Roll all five dice with a short stagger to create an attack animation.
  const handleAttack = useCallback(() => {
    clearAttackTimers()
    for (let index = 0; index < 5; index++) {
      const timer = setTimeout(() => {
        setDiceValues((prev) => {
          const updated = [...prev]
          const previousValue = updated[index]
          let nextValue = Math.floor(Math.random() * 6) + 1
          if (nextValue === previousValue) {
            nextValue = (nextValue % 6) + 1
          }
          updated[index] = nextValue
          return updated
        })
        setDiceRollIds((prev) => {
          const updated = [...prev]
          updated[index] = updated[index] + 1
          return updated
        })
      }, index * 60)

      attackTimersRef.current.push(timer)
    }
  }, [clearAttackTimers])

  // Re-roll a single selected dice and ensure the value changes.
  const handleSingleDicePress = useCallback((index: number) => {
    setDiceValues((prev) => {
      const updated = [...prev]
      const previousValue = updated[index]
      let nextValue = Math.floor(Math.random() * 6) + 1
      if (nextValue === previousValue) {
        nextValue = (nextValue % 6) + 1
      }
      updated[index] = nextValue
      return updated
    })
    setDiceRollIds((prev) => {
      const updated = [...prev]
      updated[index] = updated[index] + 1
      return updated
    })
  }, [])

  return (
    <View style={themed($container)}>
      <GameView diceValues={diceValues} diceRollIds={diceRollIds} />
      <View style={$overlay} pointerEvents="box-none">
        <View style={themed($topLeftContainer)}>
          <Button
            text="<"
            onPress={() => navigation.goBack()}
            style={themed($backButton)}
          />
        </View>

        <View style={themed($bottomControls)}>
          <View style={$diceRow}>
            {diceValues.map((diceValue, index) => (
              <Pressable
                key={index}
                onPress={() => handleSingleDicePress(index)}
                style={$diceItem}
              >
                <Dice style={$diceFill} value={diceValue} rollId={diceRollIds[index]} />
              </Pressable>
            ))}
          </View>

          <Button
            text="Attack"
            onPress={handleAttack}
            style={themed($button)}
          />
        </View>
      </View>
    </View>
  )
}

const $container: ViewStyle = {
  flex: 1,
}

const $overlay: ViewStyle = {
  ...StyleSheet.absoluteFillObject,
  justifyContent: "space-between",
  paddingTop: 16,
  paddingBottom: 40,
}

const $topLeftContainer: ViewStyle = {
  alignItems: "flex-start",
  paddingHorizontal: 16,
}

const $backButton: ViewStyle = {
  alignSelf: "flex-start",
}

const $bottomControls: ViewStyle = {
  alignItems: "center",
}

const $diceRow: ViewStyle = {
  transform: [{ translateX: -13 }],
  marginBottom: 12,
  width: "100%",
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
}

const $diceItem: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  width: 68,
  height: 68,
  marginHorizontal: 2,
}

const $diceFill: ViewStyle = {
  width: "100%",
  height: "100%",
  alignSelf: "center",
}

const $button: ViewStyle = {
  alignSelf: "center",
}
