import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSavings, CategoryBudget } from '@/context/SavingsContext';
import { Header } from '@/components/Header';

export default function CategoriesScreen() {
  const {
    categoryBudgets,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useSavings();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryBudget | null>(null);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [color, setColor] = useState('#84a59d');
  const [icon, setIcon] = useState('restaurant');

  const colorsList = ['#84a59d', '#f5cac3', '#f6bd60', '#f28482', '#775651', '#ba1a1a'];
  
  const iconsList = [
    'restaurant',
    'home',
    'directions-car',
    'shopping-bag',
    'confirmation-number',
    'fitness-center',
    'movie',
    'school',
    'medical-services',
    'flight',
    'work',
    'local-grocery-store',
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const getCategoryTag = (cat: string) => {
    switch (cat) {
      case 'food':
        return 'Alimentación';
      case 'home':
        return 'Hogar';
      case 'entertainment':
        return 'Entretenimiento';
      case 'transport':
        return 'Movilidad';
      case 'shopping':
        return 'Shopping';
      default:
        return 'General';
    }
  };

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setName('');
    setLimit('');
    setColor('#84a59d');
    setIcon('restaurant');
    setModalVisible(true);
  };

  const handleOpenEditModal = (cat: CategoryBudget) => {
    setEditingCategory(cat);
    setName(cat.name);
    setLimit(cat.limit.toString());
    setColor(cat.color);
    setIcon(cat.icon);
    setModalVisible(true);
  };

  const handleSaveCategory = async () => {
    const numLimit = parseFloat(limit);
    if (!name.trim() || isNaN(numLimit) || numLimit <= 0) {
      Alert.alert('Error', 'Por favor introduce un nombre y presupuesto válidos.');
      return;
    }

    if (editingCategory) {
      // Update existing
      await updateCategory(editingCategory.category, {
        name: name.trim(),
        limit: numLimit,
        color,
        icon,
      });
    } else {
      // Create new
      // Generate key safely
      const generatedKey = name.toLowerCase().trim().replace(/\s+/g, '-');
      
      // Verify duplicate key
      if (categoryBudgets.some((b) => b.category === generatedKey)) {
        Alert.alert('Error', 'Ya existe una categoría con un nombre similar.');
        return;
      }

      await addCategory({
        name: name.trim(),
        category: generatedKey,
        limit: numLimit,
        color,
        icon,
      });
    }

    setModalVisible(false);
  };

  const handleDeleteCategory = (cat: CategoryBudget) => {
    Alert.alert(
      'Eliminar Categoría',
      `¿Estás seguro de que quieres eliminar la categoría "${cat.name}"? Los movimientos de esta categoría se marcarán como "Otros".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(cat.category);
          },
        },
      ]
    );
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
        {/* Screen Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Categorías</Text>
          <Text style={styles.pageSubtitle}>Controla tus límites de gastos por área este mes.</Text>
        </View>

        {/* Categories List */}
        <View style={styles.cardsContainer}>
          {categoryBudgets.map((item, idx) => {
            const spent = item.spent;
            const limitVal = item.limit;
            const percentage = Math.min(100, Math.round((spent / (limitVal || 1)) * 100));
            const remaining = limitVal - spent;
            
            // Choose color and label based on budget state
            let progressColor = item.color || '#84a59d';
            let badgeBg = `${progressColor}22`;
            let remainingText = '';
            let remainingTextColor = '#504442';

            if (spent >= limitVal) {
              progressColor = '#775651'; // Primary warm brown
              badgeBg = 'rgba(119, 86, 81, 0.15)';
              remainingText = 'Presupuesto completado o excedido';
              remainingTextColor = '#775651';
            } else if (percentage >= 90) {
              progressColor = '#ba1a1a'; // Red alert
              badgeBg = 'rgba(186, 26, 26, 0.12)';
              remainingText = `¡Límite casi alcanzado! Te quedan ${formatCurrency(remaining)}`;
              remainingTextColor = '#ba1a1a';
            } else {
              remainingText = `Te quedan ${formatCurrency(remaining)} este mes`;
              remainingTextColor = progressColor;
            }

            return (
              <View key={item.category + idx} style={styles.glassCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.iconBg, { backgroundColor: badgeBg }]}>
                      <MaterialIcons name={item.icon as any} size={22} color={progressColor} />
                    </View>
                    <View>
                      <Text style={styles.categoryName}>{item.name}</Text>
                      <View style={[styles.tagBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.tagBadgeText, { color: progressColor }]}>
                          {getCategoryTag(item.category)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Edit and Delete Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.actionBtn}>
                      <MaterialIcons name="edit" size={18} color="#504442" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCategory(item)} style={styles.actionBtn}>
                      <MaterialIcons name="delete" size={18} color="#ba1a1a" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Progress Indicators */}
                <View style={styles.progressSection}>
                  <View style={styles.labelsRow}>
                    <Text style={styles.spentLabel}>{formatCurrency(spent)} gastados</Text>
                    <Text style={styles.limitLabel}>Presupuesto: {formatCurrency(limitVal)}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${percentage}%`, backgroundColor: progressColor },
                      ]}
                    />
                  </View>
                </View>

                <Text style={[styles.remainingStatus, { color: remainingTextColor }]}>
                  {remainingText}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB to Add Category */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAddModal}>
        <MaterialIcons name="add" size={28} color="#73534e" />
      </TouchableOpacity>

      {/* Create/Edit Category Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color="#504442" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>
                {editingCategory ? 'Editar Categoría' : 'Crear Nueva Categoría'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {/* Preview block */}
              <View style={styles.previewContainer}>
                <View style={[styles.iconBgLarge, { backgroundColor: `${color}22` }]}>
                  <MaterialIcons name={icon as any} size={32} color={color} />
                </View>
                <Text style={styles.previewText}>
                  {name.trim() || 'Nombre Categoría'}
                </Text>
              </View>

              {/* Title input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nombre de la categoría</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Suscripciones, Gimnasio"
                  placeholderTextColor="#efe6e5"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Limit amount */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Límite de Presupuesto Mensual</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.currencySymbol}>€</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="100"
                    placeholderTextColor="#efe6e5"
                    keyboardType="numeric"
                    value={limit}
                    onChangeText={setLimit}
                  />
                </View>
              </View>

              {/* Color selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Color distintivo</Text>
                <View style={styles.colorPalette}>
                  {colorsList.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        color === c && styles.colorCircleSelected,
                      ]}
                      onPress={() => setColor(c)}
                    />
                  ))}
                </View>
              </View>

              {/* Icon selector */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Seleccionar Icono</Text>
                <View style={styles.iconPalette}>
                  {iconsList.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      style={[
                        styles.iconCircle,
                        icon === ic && { backgroundColor: `${color}33`, borderColor: color },
                      ]}
                      onPress={() => setIcon(ic)}
                    >
                      <MaterialIcons name={ic as any} size={22} color={icon === ic ? color : '#504442'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCategory}>
                <Text style={styles.saveBtnText}>
                  {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
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
  userInfo: {
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
  calendarButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  titleSection: {
    marginVertical: 24,
    gap: 4,
  },
  pageTitle: {
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '700',
    color: '#1e1b1a',
  },
  pageSubtitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#504442',
  },
  cardsContainer: {
    gap: 16,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tagBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  progressSection: {
    marginVertical: 12,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  spentLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#1e1b1a',
  },
  limitLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#504442',
  },
  progressBarBg: {
    height: 10,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  remainingStatus: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 95,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5cac3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#73534e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  // Modal Style
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 26, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '88%',
    backgroundColor: '#f7ede2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80, 68, 66, 0.1)',
  },
  closeBtn: {
    padding: 4,
  },
  modalHeaderTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  modalForm: {
    padding: 20,
    gap: 20,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconBgLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#1e1b1a',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontFamily: 'Inter',
    fontSize: 18,
    color: '#775651',
    fontWeight: '600',
    marginRight: 6,
  },
  colorPalette: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: '#775651',
  },
  iconPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#775651',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#775651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 10,
  },
  saveBtnText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
