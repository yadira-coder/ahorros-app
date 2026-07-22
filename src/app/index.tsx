import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSavings, Transaction, CategoryBudget } from '@/context/SavingsContext';
import { Header } from '@/components/Header';
import { customAlert } from '@/utils/alert';

export default function DashboardScreen() {
  const {
    balance,
    startingBalance,
    transactions,
    addTransaction,
    categoryBudgets,
    monthTransactions,
    updateCategory,
    updateStartingBalance,
  } = useSavings();

  // Transaction Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [isRecurring, setIsRecurring] = useState(false);

  // Category Edit Modal state (to edit categories directly from dashboard)
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryBudget | null>(null);
  const [catName, setCatName] = useState('');
  const [catLimit, setCatLimit] = useState('');
  const [catColor, setCatColor] = useState('#84a59d');
  const [catIcon, setCatIcon] = useState('restaurant');

  // Starting Balance Modal state
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [editedStartingBalance, setEditedStartingBalance] = useState('');

  // Filter recent transactions of the selected month (last 3)
  const recentTransactions = monthTransactions.slice(0, 3);

  // Calculate month metrics
  const monthIncome = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthExpenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  // Spent progress percentage
  const spentProgress = Math.max(0, Math.min(100, Math.round((monthExpenses / (startingBalance || 1)) * 100)));

  // Categories list for transaction form
  const categoriesList = [
    { id: 'food', name: 'Comida', icon: 'restaurant', color: '#84a59d' },
    { id: 'transport', name: 'Transporte', icon: 'directions-car', color: '#f6bd60' },
    { id: 'home', name: 'Hogar', icon: 'home', color: '#775651' },
    { id: 'shopping', name: 'Compras', icon: 'shopping-bag', color: '#f28482' },
    { id: 'entertainment', name: 'Ocio', icon: 'confirmation-number', color: '#ba1a1a' },
    { id: 'other', name: 'Otro', icon: 'more-horiz', color: '#504442' },
  ];

  const colorsList = ['#84a59d', '#f5cac3', '#f6bd60', '#f28482', '#775651', '#ba1a1a'];
  const iconsList = ['restaurant', 'home', 'directions-car', 'shopping-bag', 'confirmation-number', 'fitness-center', 'movie', 'flight', 'work'];

  const handleSaveTransaction = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !description.trim()) {
      customAlert('Error', 'Por favor introduce un importe y descripción válidos.');
      return;
    }

    if (txType === 'expense') {
      const activeBudget = categoryBudgets.find(b => b.category === category);
      if (activeBudget) {
        const remaining = activeBudget.limit - activeBudget.spent;
        if (numAmount > remaining) {
          customAlert(
            '¡Presupuesto Superado!',
            `Este gasto (${formatCurrency(numAmount)}) supera el presupuesto restante de esta categoría (${formatCurrency(remaining)}).`
          );
        }
      }
    }

    await addTransaction({
      description: description.trim(),
      amount: numAmount,
      type: txType,
      category: txType === 'income' ? 'income' : category,
      isRecurring,
    });

    setAmount('');
    setDescription('');
    setCategory('food');
    setIsRecurring(false);
    setModalVisible(false);
  };

  const handleOpenEditCategory = (cat: CategoryBudget) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatLimit(cat.limit.toString());
    setCatColor(cat.color);
    setCatIcon(cat.icon);
    setCatModalVisible(true);
  };

  const handleSaveCategory = async () => {
    const numLimit = parseFloat(catLimit);
    if (!catName.trim() || isNaN(numLimit) || numLimit <= 0) {
      customAlert('Error', 'Por favor introduce un nombre y presupuesto válidos.');
      return;
    }

    if (editingCategory) {
      await updateCategory(editingCategory.category, {
        name: catName.trim(),
        limit: numLimit,
        color: catColor,
        icon: catIcon,
      });
    }

    setCatModalVisible(false);
  };

  const handleOpenEditStartingBalance = () => {
    setEditedStartingBalance(startingBalance.toString());
    setBalanceModalVisible(true);
  };

  const handleSaveStartingBalance = async () => {
    const numBalance = parseFloat(editedStartingBalance);
    if (isNaN(numBalance) || numBalance < 0) {
      customAlert('Error', 'Introduce una cantidad de presupuesto válida.');
      return;
    }

    await updateStartingBalance(numBalance);
    setBalanceModalVisible(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const getCategoryMeta = (catName: string, type: 'income' | 'expense' | 'saving') => {
    if (type === 'income') return { icon: 'arrow-upward', color: '#84a59d', bg: 'rgba(132,165,157,0.15)' };
    if (type === 'saving') return { icon: 'shield', color: '#f5cac3', bg: 'rgba(245,202,195,0.2)' };
    
    const customMatch = categoryBudgets.find((c) => c.category === catName);
    if (customMatch) {
      return { icon: customMatch.icon, color: customMatch.color, bg: `${customMatch.color}22` };
    }

    const matched = categoriesList.find((c) => c.id === catName);
    return matched
      ? { icon: matched.icon, color: matched.color, bg: `${matched.color}22` }
      : { icon: 'help-outline', color: '#504442', bg: 'rgba(80,68,66,0.1)' };
  };

  const formatTxDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return `Hoy, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Ayer, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
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
        {/* Main Available Spending Balance Card */}
        <TouchableOpacity
          style={styles.glassCard}
          onPress={handleOpenEditStartingBalance}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Saldo para el mes</Text>
              <Text style={styles.cardSublabel}>Disponible este mes (Toca para editar)</Text>
            </View>
            <View style={styles.editIconBadge}>
              <MaterialIcons name="edit" size={16} color="#775651" />
            </View>
          </View>

          {/* Progress Ring Visual */}
          <View style={styles.progressContainer}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressLabel}>Disponible</Text>
              <Text style={styles.progressAmount}>{formatCurrency(balance)}</Text>
            </View>
          </View>

          {/* Budget Limit Tracker */}
          <View style={styles.goalIndicatorContainer}>
            <View style={styles.goalBulletRow}>
              <View style={styles.bulletContainer}>
                <View style={[styles.bullet, { backgroundColor: '#f6bd60' }]} />
                <Text style={styles.goalText}>Fondo Inicial: {formatCurrency(startingBalance)}</Text>
              </View>
              <Text style={styles.percentageText}>{spentProgress}% gastado</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${spentProgress}%`, backgroundColor: spentProgress >= 90 ? '#ba1a1a' : '#84a59d' },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Flujo de Caja (Income vs Expense) */}
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>Flujo de Caja</Text>

          <View style={styles.cashFlowRow}>
            <View style={styles.cashFlowHeader}>
              <View style={styles.flowLabelGroup}>
                <MaterialIcons name="arrow-upward" size={16} color="#84a59d" />
                <Text style={styles.flowLabel}>Ingresos Registrados</Text>
              </View>
              <Text style={styles.flowValue}>{formatCurrency(monthIncome)}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${monthIncome > 0 ? 100 : 0}%`,
                    backgroundColor: '#84a59d',
                  },
                ]}
              />
            </View>
          </View>

          <View style={[styles.cashFlowRow, { marginTop: 16 }]}>
            <View style={styles.cashFlowHeader}>
              <View style={styles.flowLabelGroup}>
                <MaterialIcons name="arrow-downward" size={16} color="#f28482" />
                <Text style={styles.flowLabel}>Gastos Totales</Text>
              </View>
              <Text style={styles.flowValue}>{formatCurrency(monthExpenses)}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${startingBalance > 0 ? Math.min(100, (monthExpenses / startingBalance) * 100) : 0}%`,
                    backgroundColor: '#f28482',
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Presupuestos del Mes (Categories list on Dashboard) */}
        <View style={styles.glassCard}>
          <Text style={styles.sectionTitle}>Presupuestos de este Mes</Text>
          <Text style={styles.sectionSubtitle}>Pulsa sobre una categoría para modificar su presupuesto.</Text>
          
          {categoryBudgets.length === 0 ? (
            <Text style={styles.emptyText}>No hay categorías configuradas para este mes.</Text>
          ) : (
            <View style={styles.dashboardCategoryList}>
              {categoryBudgets.map((cat, idx) => {
                const percentage = Math.min(100, Math.round((cat.spent / (cat.limit || 1)) * 100));
                const remaining = cat.limit - cat.spent;
                const progressColor = cat.spent >= cat.limit ? '#775651' : (percentage >= 90 ? '#ba1a1a' : cat.color);

                return (
                  <TouchableOpacity
                    key={cat.category + idx}
                    style={styles.dashboardCategoryItem}
                    onPress={() => handleOpenEditCategory(cat)}
                  >
                    <View style={styles.dashboardCategoryTop}>
                      <View style={styles.dashboardCategoryLeft}>
                        <View style={[styles.miniIconBg, { backgroundColor: `${progressColor}22` }]}>
                          <MaterialIcons name={cat.icon as any} size={16} color={progressColor} />
                        </View>
                        <Text style={styles.dashboardCategoryName}>{cat.name}</Text>
                      </View>
                      <Text style={styles.dashboardCategoryAmount}>
                        {formatCurrency(cat.spent)} / {formatCurrency(cat.limit)}
                      </Text>
                    </View>
                    
                    <View style={styles.miniProgressBarBg}>
                      <View
                        style={[
                          styles.miniProgressBarFill,
                          { width: `${percentage}%`, backgroundColor: progressColor },
                        ]}
                      />
                    </View>
                    <Text style={[styles.remainingText, { color: progressColor }]}>
                      {remaining > 0 ? `Quedan ${formatCurrency(remaining)}` : 'Límite alcanzado'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Recent Movimientos Card */}
        <View style={styles.glassCard}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Movimientos de este Mes</Text>
          </View>

          {recentTransactions.length === 0 ? (
            <Text style={styles.emptyText}>No hay movimientos en este mes.</Text>
          ) : (
            <View style={styles.txList}>
              {recentTransactions.map((tx) => {
                const meta = getCategoryMeta(tx.category, tx.type);
                const isExpense = tx.type === 'expense';
                return (
                  <View key={tx.id} style={styles.txItem}>
                    <View style={styles.txItemLeft}>
                      <View style={[styles.categoryIconBg, { backgroundColor: meta.bg }]}>
                        <MaterialIcons name={meta.icon as any} size={20} color={meta.color} />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txTitle}>{tx.description}</Text>
                        <Text style={styles.txDate}>{formatTxDate(tx.date)}</Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isExpense ? '#1e1b1a' : '#84a59d' },
                      ]}
                    >
                      {isExpense ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <MaterialIcons name="add" size={28} color="#73534e" />
      </TouchableOpacity>

      {/* Modal - Configurar Saldo Inicial de Gasto */}
      <Modal animationType="fade" transparent={true} visible={balanceModalVisible}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.centerModalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View style={styles.actionModalCard}>
                <Text style={styles.actionModalTitle}>Configurar Saldo para el mes</Text>
                <Text style={styles.actionModalSubtitle}>
                  Presupuesto inicial disponible para este mes
                </Text>

                <View style={styles.actionInputContainer}>
                  <Text style={styles.currencySymbol}>€</Text>
                  <TextInput
                    style={styles.actionInput}
                    placeholder="2000"
                    keyboardType="numeric"
                    value={editedStartingBalance}
                    onChangeText={setEditedStartingBalance}
                    autoFocus
                  />
                </View>

                <View style={styles.actionModalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalCancelBtn]}
                    onPress={() => setBalanceModalVisible(false)}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalConfirmBtn]}
                    onPress={handleSaveStartingBalance}
                  >
                    <Text style={styles.modalConfirmBtnText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal - Añadir Gasto/Ingreso */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color="#504442" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>
                {txType === 'expense' ? 'Añadir Gasto' : 'Añadir Ingreso'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              <View style={styles.typeSwitcher}>
                <TouchableOpacity
                  style={[styles.typeBtn, txType === 'expense' && styles.typeBtnActive]}
                  onPress={() => setTxType('expense')}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      txType === 'expense' && styles.typeBtnTextActive,
                    ]}
                  >
                    Gasto
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, txType === 'income' && styles.typeBtnActive]}
                  onPress={() => setTxType('income')}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      txType === 'income' && styles.typeBtnTextActive,
                    ]}
                  >
                    Ingreso
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>€</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#efe6e5"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus
                />
              </View>
              <View style={styles.amountDivider} />

              <View style={styles.formCard}>
                <View style={styles.inputFieldGroup}>
                  <View style={styles.fieldIconBg}>
                    <MaterialIcons name="edit" size={20} color="#775651" />
                  </View>
                  <View style={styles.fieldInputs}>
                    <Text style={styles.fieldLabel}>Concepto</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej. Compra semanal"
                      placeholderTextColor="#e0d8d7"
                      value={description}
                      onChangeText={setDescription}
                    />
                  </View>
                </View>

                <View style={styles.fieldDivider} />

                {txType === 'expense' && (
                  <View style={styles.categorySelectSection}>
                    <Text style={styles.categorySectionLabel}>Categoría</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryChips}
                    >
                      {categoryBudgets.map((cat) => {
                        const isSelected = category === cat.category;
                        return (
                          <TouchableOpacity
                            key={cat.category}
                            style={[
                              styles.categoryChip,
                              isSelected && {
                                backgroundColor: '#f5cac3',
                                borderColor: '#f5cac3',
                              },
                            ]}
                            onPress={() => setCategory(cat.category)}
                          >
                            <MaterialIcons
                              name={cat.icon as any}
                              size={18}
                              color={isSelected ? '#73534e' : cat.color}
                            />
                            <Text
                              style={[
                                styles.categoryChipText,
                                isSelected && { color: '#73534e', fontWeight: 'bold' },
                              ]}
                            >
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {txType === 'expense' && <View style={styles.fieldDivider} />}

                <View style={styles.toggleRow}>
                  <View style={styles.toggleTextGroup}>
                    <View style={styles.fieldIconBg}>
                      <MaterialIcons name="autorenew" size={20} color="#775651" />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.toggleTitle}>Gasto Recurrente</Text>
                      <Text style={styles.toggleSubtitle}>Guardar como plantilla</Text>
                    </View>
                  </View>
                  <Switch
                    value={isRecurring}
                    onValueChange={setIsRecurring}
                    trackColor={{ false: '#e0d8d7', true: '#775651' }}
                    thumbColor={isRecurring ? '#ffffff' : '#f4eceb'}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveTransaction}>
                <Text style={styles.saveButtonText}>Guardar Movimiento</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Modal - Editar Categoría desde el Dashboard */}
      <Modal animationType="slide" transparent={true} visible={catModalVisible}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCatModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color="#504442" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Modificar Presupuesto</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              <View style={styles.previewContainer}>
                <View style={[styles.iconBgLarge, { backgroundColor: `${catColor}22` }]}>
                  <MaterialIcons name={catIcon as any} size={32} color={catColor} />
                </View>
                <Text style={styles.previewText}>{catName}</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Monto Límite Mensual</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.currencySymbol}>€</Text>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="100"
                    placeholderTextColor="#efe6e5"
                    keyboardType="numeric"
                    value={catLimit}
                    onChangeText={setCatLimit}
                    autoFocus
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Color distintivo</Text>
                <View style={styles.colorPalette}>
                  {colorsList.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        catColor === c && styles.colorCircleSelected,
                      ]}
                      onPress={() => setCatColor(c)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Seleccionar Icono</Text>
                <View style={styles.iconPalette}>
                  {iconsList.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      style={[
                        styles.iconCircle,
                        catIcon === ic && { backgroundColor: `${catColor}33`, borderColor: catColor },
                      ]}
                      onPress={() => setCatIcon(ic)}
                    >
                      <MaterialIcons name={ic as any} size={20} color={catIcon === ic ? catColor : '#504442'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCategory}>
                <Text style={styles.saveBtnText}>Guardar Cambios</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 20,
    paddingTop: 10,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  editIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.1)',
  },
  cardLabel: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  cardSublabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    marginTop: 2,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  progressCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 12,
    borderColor: 'rgba(132, 165, 157, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#504442',
  },
  progressAmount: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#84a59d',
    marginTop: 4,
  },
  goalIndicatorContainer: {
    width: '100%',
    marginTop: 10,
  },
  goalBulletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  goalText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
  },
  percentageText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#84a59d',
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
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  sectionSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#504442',
    marginTop: 2,
    marginBottom: 16,
  },
  cashFlowRow: {
    width: '100%',
  },
  cashFlowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flowLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#1e1b1a',
  },
  flowValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  dashboardCategoryList: {
    gap: 14,
  },
  dashboardCategoryItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dashboardCategoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dashboardCategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardCategoryName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  dashboardCategoryAmount: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#504442',
  },
  miniProgressBarBg: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  remainingText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#504442',
    textAlign: 'center',
    marginVertical: 12,
  },
  txList: {
    gap: 12,
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  txItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: {
    gap: 2,
  },
  txTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  txDate: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#504442',
  },
  txAmount: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 26, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '92%',
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
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnActive: {
    backgroundColor: '#775651',
  },
  typeBtnText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#504442',
  },
  typeBtnTextActive: {
    color: '#ffffff',
  },
  amountInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  currencySymbol: {
    fontFamily: 'Inter',
    fontSize: 28,
    color: '#775651',
    fontWeight: '600',
    marginRight: 6,
  },
  amountInput: {
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '600',
    color: '#1e1b1a',
    textAlign: 'left',
    minWidth: 120,
    padding: 0,
  },
  amountDivider: {
    height: 2,
    backgroundColor: 'rgba(80, 68, 66, 0.15)',
    width: 120,
    alignSelf: 'center',
    marginTop: -8,
    borderRadius: 1,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    gap: 16,
  },
  inputFieldGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldInputs: {
    marginLeft: 12,
    flex: 1,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#1e1b1a',
    paddingVertical: 4,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: 'rgba(80, 68, 66, 0.1)',
  },
  categorySelectSection: {
    gap: 8,
  },
  categorySectionLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  categoryChipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#504442',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  toggleSubtitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#504442',
  },
  saveButton: {
    backgroundColor: '#775651',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#775651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 8,
  },
  saveButtonText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Category Edit Modal styles
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
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
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
  // Starting Balance Modal styles (Centered)
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
    fontSize: 13,
    color: '#504442',
    textAlign: 'center',
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
    padding: 0,
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
