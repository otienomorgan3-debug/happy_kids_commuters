import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

const FALLBACK_REGION = { latitude: -1.2921, longitude: 36.8219, latitudeDelta: 0.12, longitudeDelta: 0.12 };

export default function RouteGuidanceMap({ route, currentLocation }) {
  const stops = useMemo(() => (route?.stops || [])
    .map((stop) => ({ ...stop, latitude: Number(stop.latitude), longitude: Number(stop.longitude) }))
    .filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude)), [route]);
  const coordinates = stops.map(({ latitude, longitude }) => ({ latitude, longitude }));
  const initialRegion = coordinates[0]
    ? { ...coordinates[0], latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : currentLocation ? { ...currentLocation, latitudeDelta: 0.08, longitudeDelta: 0.08 } : FALLBACK_REGION;

  return (
    <View style={styles.wrapper}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {coordinates.length > 1 && <Polyline coordinates={coordinates} strokeColor="#2d6a4f" strokeWidth={5} />}
        {stops.map((stop) => (
          <Marker key={stop.id} coordinate={{ latitude: stop.latitude, longitude: stop.longitude }} title={`${stop.stop_order}. ${stop.stop_name}`} description={stop.location || ''} />
        ))}
        {currentLocation && <Marker coordinate={currentLocation} title="Your current location" pinColor="#2563eb" />}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, overflow: 'hidden', elevation: 2 },
  map: { height: 280 },
});
