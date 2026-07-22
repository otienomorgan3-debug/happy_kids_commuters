import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const NAIROBI = { latitude: -1.2921, longitude: 36.8219 };

export default function MapWeb({ buses, routesById }) {
  const mapHtml = buses.length > 0 ? `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #map { height: 400px; width: 100%; border-radius: 12px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${NAIROBI.latitude}, ${NAIROBI.longitude}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    var busIcon = L.divIcon({ html: '🚌', className: '', iconSize: [30, 30], iconAnchor: [15, 15] });
    var stopIcon = L.divIcon({ html: '🏫', className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
    ${buses.map(bus => `L.marker([${bus.latitude}, ${bus.longitude}], { icon: busIcon }).addTo(map).bindPopup('<b>Bus ${bus.bus_id}</b><br/>Updated: ${new Date(bus.timestamp).toLocaleTimeString()}');`).join('')}
    ${Object.values(routesById).flatMap(route => (route.stops || []).map(stop => `L.marker([${stop.latitude}, ${stop.longitude}], { icon: stopIcon }).addTo(map).bindPopup('<b>${stop.stop_name}</b><br/>${stop.location || ''}');`)).join('')}
    var group = new L.featureGroup([${buses.map(b => `L.marker([${b.latitude}, ${b.longitude}])`).join(',')}${Object.values(routesById).flatMap(route => (route.stops || []).map(s => `,L.marker([${s.latitude}, ${s.longitude}])`)).join('')}]);
    map.fitBounds(group.getBounds().pad(0.2));
  </script>
</body>
</html>` : `<p style="padding:20px;text-align:center;color:#666;">No active buses to display. Pull down to refresh.</p>`;

  return (
    <View style={styles.wrapper}>
      <WebView source={{ html: mapHtml }} style={styles.webMap} scrollEnabled={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  webMap: { height: 400, backgroundColor: '#e2e8f0' },
});
