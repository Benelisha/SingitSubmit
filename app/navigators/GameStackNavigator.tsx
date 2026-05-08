import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { HomeTabsParamList } from "./HomeTabsNavigator"
import { useAppTheme } from "@/theme/context"
import { HomeTabsNavigator } from "./HomeTabsNavigator"
import GameScreen from "@/screens/GameScreen"

export type GameStackParamList = {
  HomeTabs: undefined
  GameScreen: undefined
}

const Stack = createNativeStackNavigator<GameStackParamList>()

export function GameStackNavigator() {
  const {
    theme: { colors },
  } = useAppTheme()

  return (
     <Stack.Navigator
      screenOptions={{
        headerShown: false,
        navigationBarColor: colors.background,
        contentStyle: {
          backgroundColor: colors.background,
          },
        }}
      initialRouteName="HomeTabs"
      >
       <Stack.Screen name="HomeTabs" component={HomeTabsNavigator} />
         <Stack.Screen
           name="GameScreen"
           component={GameScreen}
           options={{
             gestureEnabled: false,
             fullScreenGestureEnabled: false,
           }}
         />
      </Stack.Navigator>
    )
}
