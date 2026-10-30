import { Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FoundationScreen() {
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Finza</Text>
    <Text style={styles.text}>Entender. Planear. Invertir con propósito.</Text>
    <Text style={styles.text}>Base técnica del proyecto. El registro, inicio de sesión y movimientos se incorporarán en la próxima entrega.</Text>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, gap: 20 },
  title: { color: '#14233D', fontSize: 32, fontWeight: '700' },
  text: { color: '#14233D', fontSize: 18, lineHeight: 28 },
});
