import { TextInput, View, Text } from 'react-native';
import { responsiveFontSize, paddingScale, marginScale, radiusScale } from '../utils/responsive';

export default function Input({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, style }) {
  return (
    <View style={[{ marginBottom: marginScale(12) }, style]}>
      {label ? (
        <Text style={{
          fontSize: responsiveFontSize(13),
          fontWeight: '600',
          color: '#4a5568',
          marginBottom: marginScale(6),
        }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#a0aec0"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        style={{
          borderWidth: 1,
          borderColor: '#e2e8f0',
          borderRadius: radiusScale(12),
          paddingHorizontal: paddingScale(14),
          paddingVertical: paddingScale(12),
          fontSize: responsiveFontSize(14),
          color: '#2d3748',
          backgroundColor: '#fff'
        }}
      />
    </View>
  );
}
