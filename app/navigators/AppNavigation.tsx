import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"

import Config from "@/config"
import { ErrorBoundary } from "@/screens/ErrorScreen/ErrorBoundary"
import { useAppTheme } from "@/theme/context"
import { SplashScreen } from "@/screens/SplashScreen"
import { GameStackNavigator } from "./GameStackNavigator"
import { useLang } from "@/context/LangContext"

export type AppStackParamList = {
  Steps: undefined
  SplashScreen: undefined
}

export interface AppNavigationProps
  extends Partial<React.ComponentProps<typeof NavigationContainer<AppStackParamList>>> { }

const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = () => {
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
      initialRouteName="SplashScreen"
    >
      <Stack.Screen name="SplashScreen" component={SplashScreen} />
      {/* <Stack.Screen name="Steps" component={StepsScreen} /> */}
     </Stack.Navigator>
   )
}

export function AppNavigation(props: AppNavigationProps) {
  const { navigationTheme } = useAppTheme()
  const { lang, langOption, setLang } = useLang()
  console.log("AppNavigation render", "Current Lang:", lang)
  return (
    <NavigationContainer theme={navigationTheme} {...props}>
      <ErrorBoundary catchErrors={Config.catchErrors}>
        <GameStackNavigator />
       </ErrorBoundary>
     </NavigationContainer>
   )
}
