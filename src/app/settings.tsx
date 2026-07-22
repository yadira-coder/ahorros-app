import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSavings } from '@/context/SavingsContext';
import { Header } from '@/components/Header';

export default function SettingsScreen() {
  const { savingGoal, updateMonthlyGoal, resetDatabase } = useSavings();
  const [newGoal, setNewGoal] = useState(savingGoal.toString());

  const handleUpdateGoal = async () => {
    const numGoal = parseFloat(newGoal);
    if (isNaN(numGoal) || numGoal <= 0) {
      Alert.alert('Error', 'Por favor introduce una cantidad de meta válida.');
      return;
    }
    await updateMonthlyGoal(numGoal);
    Alert.alert('Meta Actualizada', `Tu meta mensual de ahorro ahora es de ${formatCurrency(numGoal)}.`);
  };

  const handleReset = () => {
    Alert.alert(
      'Restablecer Base de Datos',
      '¿Estás seguro de que quieres restablecer la app? Todos tus movimientos y metas se borrarán y volverán a los valores por defecto.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            await resetDatabase();
            setNewGoal('1000');
            Alert.alert('Restablecido', 'La base de datos ha sido restablecida.');
          },
        },
      ]
    );
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Background Blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Shared Header component with Multi-Month Switcher */}
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Goal adjustment card */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Meta de Ahorro Mensual</Text>
          <Text style={styles.cardSubtitle}>
            Ajusta la cantidad que deseas intentar ahorrar cada mes.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>€</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              value={newGoal}
              onChangeText={setNewGoal}
              placeholder="1000"
              placeholderTextColor="#e0d8d7"
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateGoal}>
            <Text style={styles.saveBtnText}>Actualizar Meta</Text>
          </TouchableOpacity>
        </View>

        {/* Database management card */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Gestión de Datos</Text>
          <Text style={styles.cardSubtitle}>
            Esta aplicación guarda los datos localmente en tu iPhone de forma gratuita y privada.
          </Text>

          <View style={styles.infoRow}>
            <MaterialIcons name="security" size={20} color="#84a59d" />
            <Text style={styles.infoText}>Almacenamiento Local (AsyncStorage)</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="wifi-off" size={20} color="#84a59d" />
            <Text style={styles.infoText}>100% Funcional sin Internet</Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <MaterialIcons name="delete-forever" size={20} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.resetBtnText}>Restablecer Datos</Text>
          </TouchableOpacity>
        </View>

        {/* App Info card */}
        <View style={styles.glassCard}>
          <Text style={styles.cardTitle}>Información</Text>
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>Nombre</Text>
            <Text style={styles.appInfoVal}>Ahorros App</Text>
          </View>
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>Versión</Text>
            <Text style={styles.appInfoVal}>1.0.0 (Expo Go)</Text>
          </View>
          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoLabel}>Estilo</Text>
            <Text style={styles.appInfoVal}>Serene Hearth</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7ede2',
  },
  blob1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(245, 202, 195, 0.15)',
    zIndex: -1,
  },
  blob2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(132, 165, 157, 0.15)',
    zIndex: -1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(247, 237, 226, 0.8)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileMoneyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#84a59d',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#84a59d',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#84a59d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  cardSubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    marginTop: 4,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#775651',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    height: 48,
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#1e1b1a',
  },
  saveBtn: {
    backgroundColor: '#775651',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  infoText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#1e1b1a',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(80, 68, 66, 0.1)',
    marginVertical: 16,
  },
  resetBtn: {
    flexDirection: 'row',
    backgroundColor: '#ba1a1a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80, 68, 66, 0.05)',
  },
  appInfoLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#504442',
  },
  appInfoVal: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1b1a',
  },
});
