import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getMe, getMyStudents, removeToken } from '../../constants/api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const router = useRouter();

  useEffect(() => {
    Promise.all([getMe(), getMyStudents()])
      .then(([meRes, studentsRes]) => {
        setUser(meRes.data.user);
        setStudents(studentsRes.data.students);
      })
      .catch(console.error);
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await removeToken();
          router.replace('/');
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'P'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>Parent Account</Text>
      </View>

      {/* Account details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        {[
          { label: 'Email', value: user?.email, icon: '📧' },
          { label: 'Phone', value: user?.phone, icon: '📞' },
          { label: 'Role', value: user?.role, icon: '👤' },
        ].map(item => (
          <View key={item.label} style={styles.infoRow}>
            <Text style={styles.infoIcon}>{item.icon}</Text>
            <View>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value || '—'}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Children */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Children ({students.length})</Text>
          <TouchableOpacity style={styles.addChildButton} onPress={() => router.push('/(parent)/add-child')}>
            <Text style={styles.addChildButtonText}>+ Add Child</Text>
          </TouchableOpacity>
        </View>
        {students.length === 0 ? (
          <Text style={styles.emptyText}>No children added yet</Text>
        ) : students.map(student => (
          <View key={student.id} style={styles.studentRow}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>
                {student.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentSchool}>{student.school_name}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#4a6fa5', alignItems: 'center',
    paddingTop: 60, paddingBottom: 32,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#63b3ed', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  role: { fontSize: 14, color: '#bee3f8', marginTop: 4 },
  section: {
    backgroundColor: '#fff', borderRadius: 16,
    margin: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15, fontWeight: 'bold',
    color: '#2d3748'
  },
  addChildButton: {
    backgroundColor: '#4a6fa5',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addChildButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f7fafc'
  },
  infoIcon: { fontSize: 20, marginRight: 12 },
  infoLabel: { fontSize: 12, color: '#718096' },
  infoValue: { fontSize: 15, color: '#2d3748', fontWeight: '500', marginTop: 2 },
  studentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f7fafc'
  },
  studentAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ebf4ff', alignItems: 'center',
    justifyContent: 'center', marginRight: 12
  },
  studentAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#4a6fa5' },
  studentName: { fontSize: 15, fontWeight: '600', color: '#2d3748' },
  studentSchool: { fontSize: 12, color: '#718096', marginTop: 2 },
  emptyText: { color: '#a0aec0', fontSize: 14 },
  logoutButton: {
    margin: 16, marginBottom: 40, backgroundColor: '#fff5f5',
    borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#fed7d7'
  },
  logoutText: { color: '#e53e3e', fontWeight: '600', fontSize: 15 },
});
