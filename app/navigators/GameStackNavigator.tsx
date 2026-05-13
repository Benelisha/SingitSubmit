import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { HomeTabsParamList } from "./HomeTabsNavigator"
import { useAppTheme } from "@/theme/context"
import { HomeTabsNavigator } from "./HomeTabsNavigator"
// import GameScreen from "@/screens/GameScreen"
import StoryScreen from "@/screens/StoryScreen"

export type GameStackParamList = {
  HomeTabs: undefined
  GameScreen: undefined
  StoryScreen: undefined
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
      initialRouteName="StoryScreen"
      >
       <Stack.Screen name="StoryScreen" component={StoryScreen} />
       {/* <Stack.Screen name="HomeTabs" component={HomeTabsNavigator} />
         <Stack.Screen
           name="GameScreen"
           component={GameScreen}
           options={{
             gestureEnabled: false,
             fullScreenGestureEnabled: false,
           }}
         /> */}
      </Stack.Navigator>
    )
}
