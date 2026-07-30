import { View, Text, StyleSheet } from 'react-native';

// The stop-by-stop GPS guidance remains available on web without requiring a
// native map provider. Mobile uses the native map implementation above.
export default function RouteGuidanceMap({ route, currentLocation }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>🗺️ Live route map</Text>
      <Text style={styles.text}>{route?.stops?.length || 0} route stops loaded</Text>
      {currentLocation && <Text style={styles.text}>📍 GPS location acquired</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16, backgroundColor: '#e8f5e9' },
  title: { color: '#22543d', fontWeight: '700', fontSize: 15 },
  text: { color: '#35604a', marginTop: 5, fontSize: 13 },
});
