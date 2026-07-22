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
import { useSavings, SavingGoal } from '@/context/SavingsContext';
import { Header } from '@/components/Header';

export default function HuchasScreen() {
  const {
    savingGoals,
    addSavingGoal,
    deleteSavingGoal,
    updateSavingGoalProgress,
    updateSavingGoal,
    balance,
  } = useSavings();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [color, setColor] = useState('#84a59d');

  // Deposit/Withdraw Modal state
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [actionAmount, setActionAmount] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<SavingGoal | null>(null);

  const colorsList = ['#84a59d', '#f5cac3', '#f6bd60', '#f28482', '#775651', '#ba1a1a'];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const handleOpenAddModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTarget('');
    setColor('#84a59d');
    setModalVisible(true);
  };

  const handleOpenEditModal = (goal: SavingGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTarget(goal.target.toString());
    setColor(goal.color);
    setModalVisible(true);
  };

  const handleSaveGoal = async () => {
    const numTarget = parseFloat(target);
    if (!title.trim() || isNaN(numTarget) || numTarget <= 0) {
      Alert.alert('Error', 'Por favor introduce un nombre y meta válidos.');
      return;
    }

    if (editingGoal) {
      await updateSavingGoal(editingGoal.id, {
        title: title.trim(),
        target: numTarget,
        color,
      });
    } else {
      await addSavingGoal({
        title: title.trim(),
        target: numTarget,
        color,
        icon: 'savings', // Piggy bank icon by default
      });
    }

    setModalVisible(false);
  };

  const handleDeleteGoal = (goal: SavingGoal) => {
    Alert.alert(
      'Eliminar Hucha',
      `¿Estás seguro de que quieres eliminar la hucha "${goal.title}"? El dinero guardado aquí volverá a tu saldo general.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteSavingGoal(goal.id);
          },
        },
      ]
    );
  };

  const handleOpenActionModal = (goal: SavingGoal, type: 'deposit' | 'withdraw') => {
    setSelectedGoal(goal);
    setActionType(type);
    setActionAmount('');
    setActionModalVisible(true);
  };

  const handleExecuteAction = async () => {
    const amount = parseFloat(actionAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Introduce una cantidad válida.');
      return;
    }

    if (!selectedGoal) return;

    if (actionType === 'deposit') {
      if (amount > balance) {
        Alert.alert('Saldo Insuficiente', 'No puedes aportar más de tu saldo disponible.');
        return;
      }
      await updateSavingGoalProgress(selectedGoal.id, amount);
    } else {
      if (amount > selectedGoal.current) {
        Alert.alert('Error', 'No puedes retirar más de lo ahorrado en esta hucha.');
        return;
      }
      await updateSavingGoalProgress(selectedGoal.id, -amount);
    }

    setActionModalVisible(false);
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
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Mis Huchas</Text>
          <Text style={styles.pageSubtitle}>Administra tus fondos de ahorro individuales.</Text>
        </View>

        {/* Balance Info */}
        <View style={styles.balanceInfoCard}>
          <Text style={styles.balanceLabel}>Saldo para el mes disponible</Text>
          <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
          <Text style={styles.balanceNote}>Las huchas son independientes y no descuentan de este saldo diario.</Text>
        </View>

        {/* Huchas List */}
        <View style={styles.goalsContainer}>
          {savingGoals.length === 0 ? (
            <Text style={styles.emptyText}>No tienes huchas creadas. ¡Crea una pulsando el botón +!</Text>
          ) : (
            savingGoals.map((goal) => {
              const percentage = Math.min(100, Math.round((goal.current / (goal.target || 1)) * 100));
              const remaining = goal.target - goal.current;
              
              return (
                <View key={goal.id} style={styles.glassCard}>
                  {/* Card Top */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.pigIconBg, { backgroundColor: `${goal.color}22` }]}>
                        <MaterialIcons name="savings" size={24} color={goal.color} />
                      </View>
                      <View>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        <Text style={styles.goalRatio}>
                          {formatCurrency(goal.current)} de {formatCurrency(goal.target)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => handleOpenEditModal(goal)} style={styles.actionBtn}>
                        <MaterialIcons name="edit" size={18} color="#504442" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteGoal(goal)} style={styles.actionBtn}>
                        <MaterialIcons name="delete" size={18} color="#ba1a1a" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${percentage}%`, backgroundColor: goal.color },
                        ]}
                      />
                    </View>
                    <View style={styles.progressLabelsRow}>
                      <Text style={styles.progressPercent}>{percentage}% completado</Text>
                      <Text style={styles.progressRemaining}>
                        {remaining > 0 ? `Faltan ${formatCurrency(remaining)}` : '¡Completada! 🥳'}
                      </Text>
                    </View>
                  </View>

                  {/* Deposit/Withdraw Buttons */}
                  <View style={styles.quickButtons}>
                    <TouchableOpacity
                      style={[styles.quickBtn, { borderColor: goal.color }]}
                      onPress={() => handleOpenActionModal(goal, 'deposit')}
                    >
                      <MaterialIcons name="add" size={16} color={goal.color} style={{ marginRight: 4 }} />
                      <Text style={[styles.quickBtnText, { color: goal.color }]}>Aportar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickBtn, { borderColor: '#504442' }]}
                      onPress={() => handleOpenActionModal(goal, 'withdraw')}
                      disabled={goal.current === 0}
                    >
                      <MaterialIcons
                        name="remove"
                        size={16}
                        color={goal.current === 0 ? '#efe6e5' : '#504442'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.quickBtnText,
                          { color: goal.current === 0 ? '#efe6e5' : '#504442' },
                        ]}
                      >
                        Retirar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* FAB to Add Hucha */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenAddModal}>
        <MaterialIcons name="add" size={28} color="#73534e" />
      </TouchableOpacity>

      {/* Create/Edit Hucha Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color="#504442" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>
                {editingGoal ? 'Editar Hucha' : 'Crear Nueva Hucha'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.modalForm}>
              {/* Icon visual reminder */}
              <View style={styles.defaultIconRemind}>
                <View style={[styles.pigIconBgLarge, { backgroundColor: `${color}22` }]}>
                  <MaterialIcons name="savings" size={36} color={color} />
                </View>
                <Text style={styles.iconRemindText}>Icono por defecto: Cerdito Hucha</Text>
              </View>

              {/* Title input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nombre de la hucha</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Vacaciones de verano"
                  placeholderTextColor="#efe6e5"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Target amount */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Monto Objetivo (Meta)</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.currencySymbol}>€</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="2000"
                    placeholderTextColor="#efe6e5"
                    keyboardType="numeric"
                    value={target}
                    onChangeText={setTarget}
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

              {/* Save Button */}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
                <Text style={styles.saveBtnText}>
                  {editingGoal ? 'Guardar Cambios' : 'Crear Hucha'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Deposit/Withdraw Action Modal */}
      <Modal animationType="fade" transparent={true} visible={actionModalVisible}>
        <View style={styles.centerModalOverlay}>
          <View style={styles.actionModalCard}>
            <Text style={styles.actionModalTitle}>
              {actionType === 'deposit' ? 'Aportar a Hucha' : 'Retirar de Hucha'}
            </Text>
            <Text style={styles.actionModalSubtitle}>
              Hucha: {selectedGoal?.title}
            </Text>

            <View style={styles.actionInputContainer}>
              <Text style={styles.currencySymbol}>€</Text>
              <TextInput
                style={styles.actionInput}
                placeholder="0.00"
                keyboardType="numeric"
                value={actionAmount}
                onChangeText={setActionAmount}
                autoFocus
              />
            </View>

            {/* Quick selectors */}
            <View style={styles.quickAmountRow}>
              {[10, 50, 100, 200].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={styles.quickAmountBtn}
                  onPress={() => setActionAmount(amt.toString())}
                >
                  <Text style={styles.quickAmountText}>+{amt}€</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Modal Actions */}
            <View style={styles.actionModalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalCancelBtn]}
                onPress={() => setActionModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalConfirmBtn]}
                onPress={handleExecuteAction}
              >
                <Text style={styles.modalConfirmBtnText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    color: '#775651',
  },
  pageSubtitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#504442',
  },
  balanceInfoCard: {
    backgroundColor: '#efe6e5',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#504442',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#775651',
    marginTop: 4,
  },
  balanceNote: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
    marginTop: 6,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  goalsContainer: {
    gap: 16,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#504442',
    textAlign: 'center',
    marginVertical: 32,
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
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pigIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  goalRatio: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    marginTop: 2,
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
    marginVertical: 16,
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressPercent: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#1e1b1a',
  },
  progressRemaining: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#504442',
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  quickBtnText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
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
    height: '80%',
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
  defaultIconRemind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pigIconBgLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRemindText: {
    fontFamily: 'Inter',
    fontSize: 14,
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
  // Center Modal Styles (Deposit/Withdraw)
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 26, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  actionModalCard: {
    width: '100%',
    backgroundColor: '#f7ede2',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    gap: 12,
  },
  actionModalTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: '#775651',
  },
  actionModalSubtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#504442',
  },
  actionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#775651',
    marginVertical: 12,
    width: '60%',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  actionInput: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600',
    color: '#1e1b1a',
    textAlign: 'center',
    minWidth: 80,
  },
  quickAmountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  quickAmountBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickAmountText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    fontWeight: '600',
  },
  actionModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
  },
  modalCancelBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#504442',
  },
  modalConfirmBtn: {
    backgroundColor: '#775651',
  },
  modalConfirmBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
