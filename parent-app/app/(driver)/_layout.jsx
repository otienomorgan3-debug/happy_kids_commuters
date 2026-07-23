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
