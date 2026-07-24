import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { responsiveFontSize, paddingScale, radiusScale } from '../utils/responsive';

export default function Button({ title, onPress, disabled, loading, variant = 'primary', style }) {
  const backgroundColor = variant === 'secondary' ? '#e2e8f0' : '#4a6fa5';
  const color = variant === 'secondary' ? '#2d3748' : '#fff';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          borderRadius: radiusScale(12),
          paddingVertical: paddingScale(14),
          paddingHorizontal: paddingScale(18),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: disabled || loading ? '#a0aec0' : backgroundColor,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={{ fontSize: responsiveFontSize(15), fontWeight: '700', color }}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
