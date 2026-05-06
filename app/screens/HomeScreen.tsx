import { View, Text } from "react-native";

/** HomeScreen – simple screen that displays a welcome message.
 *  Used after the splash‑screen delay so the user sees a
 *  “Hello from HomeScreen” UI before the rest of the app loads.
 */
export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Hello from HomeScreen</Text>
    </View>
  );
}
