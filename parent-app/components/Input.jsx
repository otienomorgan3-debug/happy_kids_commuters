import { TextInput, View, Text } from 'react-native';

export default function Input({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, style }) {
  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a0aec0"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        style={styles.input}
      />
    </View>
  );
}

const styles = {
  wrapper: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#4a5568', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#2d3748',
    backgroundColor: '#fff'
  },
};
