import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4a6fa5',
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
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Home', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat', tabBarIcon: () => <Text style={{ fontSize: 20 }}>💬</Text> }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: 'Track Bus', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗺️</Text> }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Alerts', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🔔</Text> }}
      />
      <Tabs.Screen
        name="emergency-alerts"
        options={{ title: 'Emergency', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🚨</Text> }}
      />
      <Tabs.Screen
        name="payments"
        options={{ title: 'Payments', tabBarIcon: () => <Text style={{ fontSize: 20 }}>💳</Text> }}
      />
      {/* Hidden screens */}
      <Tabs.Screen
        name="profile"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="transport-history"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="mark-absent"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="change-pickup"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="schedule-preview"
        options={{ href: null }}
      />
    </Tabs>
  );
}
