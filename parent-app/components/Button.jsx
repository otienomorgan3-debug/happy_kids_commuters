import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

export default function Button({ title, onPress, disabled, loading, variant = 'primary', style }) {
  const backgroundColor = variant === 'secondary' ? '#e2e8f0' : '#4a6fa5';
  const color = variant === 'secondary' ? '#2d3748' : '#fff';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: disabled || loading ? '#a0aec0' : backgroundColor },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.text, { color }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = {
  button: {
    borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center'
  },
  text: { fontSize: 15, fontWeight: '700' },
};
