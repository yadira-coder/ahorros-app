import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSavings } from '@/context/SavingsContext';

const { width } = Dimensions.get('window');

const MONTH_NAMES: { [key: string]: string } = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};

// Generates a selection range: 3 months before and 6 months after July 2026
const AVAILABLE_MONTHS = [
  { label: 'Abril 2026', value: '2026-04' },
  { label: 'Mayo 2026', value: '2026-05' },
  { label: 'Junio 2026', value: '2026-06' },
  { label: 'Julio 2026', value: '2026-07' },
  { label: 'Agosto 2026', value: '2026-08' },
  { label: 'Septiembre 2026', value: '2026-09' },
  { label: 'Octubre 2026', value: '2026-10' },
  { label: 'Noviembre 2026', value: '2026-11' },
  { label: 'Diciembre 2026', value: '2026-12' },
  { label: 'Enero 2027', value: '2027-01' },
];

export function Header() {
  const { currentMonth, setCurrentMonth } = useSavings();
  const [modalVisible, setModalVisible] = useState(false);

  // Convert "2026-07" to "Julio 2026"
  const getDisplayMonth = (monthCode: string) => {
    const [year, month] = monthCode.split('-');
    const name = MONTH_NAMES[month] || month;
    return `${name} ${year}`;
  };

  const handleSelectMonth = async (monthCode: string) => {
    await setCurrentMonth(monthCode);
    setModalVisible(false);
  };

  return (
    <View style={styles.header}>
      {/* Clickable House (Home) Logo Badge */}
      <TouchableOpacity
        style={styles.logoBadgeContainer}
        onPress={() => router.push('/')}
        activeOpacity={0.7}
      >
        <View style={styles.walletLogo}>
          <MaterialIcons name="home" size={22} color="#ffffff" />
        </View>
      </TouchableOpacity>

      {/* Clickable Month Title Switcher */}
      <TouchableOpacity
        style={styles.monthSelectorBtn}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle}>{getDisplayMonth(currentMonth)}</Text>
        <MaterialIcons name="arrow-drop-down" size={24} color="#84a59d" style={styles.arrowIcon} />
      </TouchableOpacity>

      {/* Calendar Button */}
      <TouchableOpacity
        style={styles.calendarButton}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="calendar-today" size={20} color="#84a59d" />
      </TouchableOpacity>

      {/* Selector Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Seleccionar Mes</Text>
            <Text style={styles.modalSubtitle}>
              Las categorías y transacciones se adaptarán al mes seleccionado.
            </Text>

            <FlatList
              data={AVAILABLE_MONTHS}
              keyExtractor={(item) => item.value}
              numColumns={2}
              columnWrapperStyle={styles.row}
              renderItem={({ item }) => {
                const isSelected = item.value === currentMonth;
                return (
                  <TouchableOpacity
                    style={[
                      styles.monthBtn,
                      isSelected && styles.monthBtnSelected,
                    ]}
                    onPress={() => handleSelectMonth(item.value)}
                  >
                    <Text
                      style={[
                        styles.monthBtnText,
                        isSelected && styles.monthBtnTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.listContainer}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(247, 237, 226, 0.85)',
  },
  logoBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#775651', // Warm brown
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#84a59d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  monthSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginRight: 'auto',
    marginLeft: 10,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: '#84a59d',
  },
  arrowIcon: {
    marginLeft: 2,
  },
  calendarButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 26, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#f7ede2',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#84a59d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: '#775651',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#504442',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  listContainer: {
    gap: 8,
  },
  row: {
    justifyContent: 'space-between',
    gap: 8,
  },
  monthBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  monthBtnSelected: {
    backgroundColor: '#84a59d',
    borderColor: '#84a59d',
  },
  monthBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#504442',
  },
  monthBtnTextSelected: {
    color: '#ffffff',
  },
});
