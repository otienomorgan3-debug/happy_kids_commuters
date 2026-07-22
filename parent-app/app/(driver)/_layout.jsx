import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';

const TABS = [
  { name: 'home', title: 'Home' },
  { name: 'route-guidance', title: 'Route' },
  { name: 'students', title: 'Students' },
  { name: 'attendance', title: 'Attendance' },
  { name: 'sos', title: 'SOS' },
];

export default function DriverLayout() {
  if (Platform.OS === 'web') {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarPosition: 'top',
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#b7e4c7',
          tabBarStyle: { backgroundColor: '#2d6a4f', height: 0, display: 'none' },
        }}
      >
        {TABS.map(tab => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
        ))}
      </Tabs>
    );
  }

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
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
