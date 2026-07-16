import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="parent-login" />
      <Stack.Screen name="parent-register" />
      <Stack.Screen name="driver-login" />
    </Stack>
  );
}