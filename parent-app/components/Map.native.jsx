import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const NAIROBI = {
  latitude: -1.2921,
  longitude: 36.8219,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapNative({ buses, routesById }) {
  return (
    <View style={styles.wrapper}>
      <MapView style={styles.map} initialRegion={NAIROBI}>
        {buses.map(bus => (
          <Marker
            key={bus.bus_id}
            coordinate={{ latitude: bus.latitude, longitude: bus.longitude }}
            title={`Bus ${bus.bus_id}`}
            description={`Updated: ${new Date(bus.timestamp).toLocaleTimeString()}`}
          />
        ))}
        {Object.values(routesById).flatMap(route => (route.stops || []).map(stop => (
          <Marker
            key={`stop-${stop.id}`}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            title={stop.stop_name}
            description={stop.location || ''}
          />
        )))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  map: { height: 400, backgroundColor: '#e2e8f0' },
});
