import { Tabs } from 'expo-router';
import { Text, Platform, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const TABS = [
  { name: 'dashboard', title: 'Home', icon: '🏠', route: '/(parent)/dashboard' },
  { name: 'chat', title: 'Chat', icon: '💬', route: '/(parent)/chat' },
  { name: 'map', title: 'Track Bus', icon: '🗺️', route: '/(parent)/map' },
  { name: 'notifications', title: 'Alerts', icon: '🔔', route: '/(parent)/notifications' },
  { name: 'emergency-alerts', title: 'Emergency', icon: '🚨', route: '/(parent)/emergency-alerts' },
  { name: 'payments', title: 'Payments', icon: '💳', route: '/(parent)/payments' },
];

function WebHeader() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: '#4a6fa5', paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16, gap: 8, flexWrap: 'wrap' }}>
      {TABS.map(tab => {
        const active = pathname.includes(tab.route);
        return (
          <Text
            key={tab.name}
            onPress={() => router.push(tab.route)}
            style={{ color: active ? '#fff' : '#bee3f8', fontSize: 13, fontWeight: active ? '700' : '500', marginRight: 14 }}
          >
            {tab.icon} {tab.title}
          </Text>
        );
      })}
    </View>
  );
}

export default function ParentLayout() {
  if (Platform.OS === 'web') {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarPosition: 'top',
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#bee3f8',
          tabBarStyle: { backgroundColor: '#4a6fa5', height: 0, display: 'none' },
        }}
      >
        {TABS.map(tab => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
        ))}
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="transport-history" options={{ href: null }} />
        <Tabs.Screen name="mark-absent" options={{ href: null }} />
        <Tabs.Screen name="change-pickup" options={{ href: null }} />
        <Tabs.Screen name="schedule-preview" options={{ href: null }} />
      </Tabs>
    );
  }

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
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.title, tabBarIcon: () => <Text style={{ fontSize: 20 }}>{tab.icon}</Text> }}
        />
      ))}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="transport-history" options={{ href: null }} />
      <Tabs.Screen name="mark-absent" options={{ href: null }} />
      <Tabs.Screen name="change-pickup" options={{ href: null }} />
      <Tabs.Screen name="schedule-preview" options={{ href: null }} />
    </Tabs>
  );
}
