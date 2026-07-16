import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function DriverLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2d6a4f',
        tabBarInactiveTintColor: '#a0aec0',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
          paddingBottom: 8,
          paddingTop: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }} />
      <Tabs.Screen name="route-guidance" options={{ title: 'Route', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗺️</Text> }} />
      <Tabs.Screen name="students" options={{ title: 'Students', tabBarIcon: () => <Text style={{ fontSize: 20 }}>👦</Text> }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: () => <Text style={{ fontSize: 20 }}>✅</Text> }} />
      <Tabs.Screen name="sos" options={{ title: 'SOS', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🚨</Text> }} />
    </Tabs>
  );
}
