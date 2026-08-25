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
import { customAlert, customConfirm } from '@/utils/alert';
import { parseFormattedAmount } from '@/utils/format';

export default function DashboardScreen() {
  const {
    balance,
    startingBalance,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearMonthTransactions,
    categoryBudgets,
    totalCategoryLimits,
    topSpendingCategory,
    monthTransactions,
    updateCategory,
    updateStartingBalance,
    toggleCategoryLimitReached,
  } = useSavings();

  // Transaction Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [isRecurring, setIsRecurring] = useState(false);

  // Transaction Edit Modal state
  const [editTxModalVisible, setEditTxModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editTxDescription, setEditTxDescription] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxCategory, setEditTxCategory] = useState('');
  const [editTxType, setEditTxType] = useState<'income' | 'expense'>('expense');

  // Category Edit Modal state (to edit categories directly from dashboard)
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryBudget | null>(null);
  const [catName, setCatName] = useState('');
  const [catLimit, setCatLimit] = useState('');
  const [catColor, setCatColor] = useState('#84a59d');
  const [catIcon, setCatIcon] = useState('restaurant');
  const [catIsTemporary, setCatIsTemporary] = useState(false);

  // Starting Balance Modal state
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [editedStartingBalance, setEditedStartingBalance] = useState('');

  // Dynamic category list for modal selector with 'other' fallback
  const availableCategoryChips = React.useMemo(() => {
    const list = [...categoryBudgets];
    if (!list.some((c) => c.category === 'other')) {
      list.push({
        name: 'Sin categoría / Otros',
        category: 'other',
        limit: 200,
        spent: 0,
        color: '#504442',
        icon: 'more-horiz',
      });
    }
    return list;
  }, [categoryBudgets]);

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

  const colorsList = [
    '#84a59d',
    '#f5cac3',
    '#f6bd60',
    '#f28482',
    '#775651',
    '#ba1a1a',
    '#b8b8ff',
    '#b27092',
    '#bcb8b1',
    '#a2d2ff',
    '#d4a373',
  ];

  const iconsList = [
    'pets',                 // Perro / Mascota
    'medication',           // Suplementos alimenticios
    'tv',                   // Plataformas TV / Streaming
    'wifi',                 // Internet
    'smoking-rooms',        // Tabaco
    'celebration',          // Festivo
    'medical-services',     // Médico
    'favorite',             // Corazón
    'warning',              // Imprevistos
    'restaurant',           // Comida
    'home',                 // Hogar
    'directions-car',       // Transporte
    'shopping-bag',         // Compras
    'confirmation-number',  // Ocio
    'fitness-center',       // Gimnasio
    'movie',                // Cine
    'school',               // Educación
    'flight',               // Viajes
    'work',                 // Trabajo
    'savings',              // Huchas
    'build',                // Reparaciones / Imprevistos
  ];

  const handleSaveTransaction = async () => {
    const numAmount = parseFormattedAmount(amount);
    if (numAmount <= 0 || !description.trim()) {
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
      category: txType === 'income' ? 'income' : (category || 'other'),
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
    setCatIsTemporary(!!cat.isTemporary);
    setCatModalVisible(true);
  };

  const handleMarkLimitReached = async (cat: CategoryBudget) => {
    const res = await toggleCategoryLimitReached(cat.category);
    if (res.reached) {
      customAlert(
        '¡Presupuesto Alcanzado!',
        `Se ha alcanzado el límite de ${formatCurrency(cat.limit)} para la categoría "${res.name}".`
      );
    } else {
      customAlert(
        'Límite Quitado',
        `Se ha retirado el límite alcanzado para la categoría "${res.name}".`
      );
    }
  };

  const handleSaveCategory = async () => {
    const numLimit = parseFormattedAmount(catLimit);
    if (!catName.trim() || numLimit <= 0) {
      customAlert('Error', 'Por favor introduce un nombre y presupuesto válidos.');
      return;
    }

    if (editingCategory) {
      await updateCategory(
        editingCategory.category,
        {
          name: catName.trim(),
          limit: numLimit,
          color: catColor,
          icon: catIcon,
          isTemporary: catIsTemporary,
        },
        'month' // Only update for the current month when edited from Resumen!
      );
    }

    setCatModalVisible(false);
  };

  const handleOpenEditStartingBalance = () => {
    setEditedStartingBalance(startingBalance.toString());
    setBalanceModalVisible(true);
  };

  const handleSaveStartingBalance = async () => {
    const numBalance = parseFormattedAmount(editedStartingBalance);
    if (numBalance < 0) {
      customAlert('Error', 'Introduce una cantidad de presupuesto válida.');
      return;
    }

    if (numBalance < totalCategoryLimits) {
      customAlert(
        'Presupuesto Insuficiente',
        `No puedes establecer un saldo mensual de ${formatCurrency(numBalance)} porque es menor que la suma de los presupuestos de tus categorías (${formatCurrency(totalCategoryLimits)}).\n\nAumenta el saldo o edita los límites de tus categorías.`
      );
      return;
    }

    await updateStartingBalance(numBalance);
    setBalanceModalVisible(false);
  };

  const handleOpenEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setEditTxDescription(tx.description);
    setEditTxAmount(tx.amount.toString());
    setEditTxCategory(tx.category);
    setEditTxType(tx.type === 'saving' ? 'expense' : tx.type);
    setEditTxModalVisible(true);
  };

  const handleSaveEditTx = async () => {
    if (!editingTx) return;
    const numAmount = parseFormattedAmount(editTxAmount);
    if (numAmount <= 0 || !editTxDescription.trim()) {
      customAlert('Error', 'Por favor introduce una descripción y un importe válidos.');
      return;
    }

    await updateTransaction(editingTx.id, {
      description: editTxDescription.trim(),
      amount: numAmount,
      category: editTxType === 'income' ? 'income' : (editTxCategory || 'other'),
      type: editTxType,
    });

    setEditTxModalVisible(false);
    customAlert('Movimiento Modificado', 'El movimiento ha sido actualizado correctamente.');
  };

  const handleDeleteTx = (tx: Transaction) => {
    customConfirm(
      'Eliminar Movimiento',
      `¿Estás seguro de borrar el movimiento "${tx.description}" por ${formatCurrency(tx.amount)}?`,
      async () => {
        await deleteTransaction(tx.id);
        customAlert('Movimiento Borrado', 'El movimiento se ha eliminado correctamente.');
      }
    );
  };

  const handleClearAllMonthTxs = () => {
    customConfirm(
      'Vaciar Movimientos del Mes',
      `¿Deseas borrar todos los gastos e ingresos registrados en este mes y poner los presupuestos consumidos a 0 €?`,
      async () => {
        await clearMonthTransactions();
        customAlert('Mes Vaciado', 'Se han eliminado todos los movimientos de este mes.');
      }
    );
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const getCategoryMeta = (catName: string, type: 'income' | 'expense' | 'saving') => {
    if (type === 'income') return { icon: 'arrow-upward', color: '#84a59d', bg: 'rgba(132,165,157,0.15)' };
    if (type === 'saving') return { icon: 'shield', color: '#f5cac3', bg: 'rgba(245,202,195,0.2)' };
    
    const customMatch = availableCategoryChips.find((c) => c.category === catName);
    if (customMatch) {
      return { icon: customMatch.icon, color: customMatch.color, bg: `${customMatch.color}22` };
    }

    return { icon: 'help-outline', color: '#504442', bg: 'rgba(80,68,66,0.1)' };
  };

  const formatTxDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch {
      return '';
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
        {/* Card Presupuesto Disponible del Mes */}
        <View style={styles.glassCard}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.cardLabel}>Saldo del Mes</Text>
              <Text style={styles.cardSublabel}>Toca el icono de lápiz para editar el presupuesto inicial</Text>
            </View>
            <TouchableOpacity onPress={handleOpenEditStartingBalance} style={styles.editIconBadge}>
              <MaterialIcons name="edit" size={18} color="#775651" />
            </TouchableOpacity>
          </View>

          {/* Large Progress Circle displaying Available Balance */}
          <TouchableOpacity style={styles.progressContainer} onPress={handleOpenEditStartingBalance} activeOpacity={0.8}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressLabel}>DISPONIBLE</Text>
              <Text style={styles.progressAmount}>{formatCurrency(balance)}</Text>
            </View>

            <View style={styles.monthRequirementBanner}>
              <MaterialIcons name="info-outline" size={16} color="#775651" style={{ marginRight: 6 }} />
              <Text style={styles.monthRequirementText}>
                Tu mes requiere de <Text style={{ fontWeight: '700', color: '#775651' }}>{formatCurrency(totalCategoryLimits)}</Text>
              </Text>
            </View>

            <View style={styles.goalIndicatorContainer}>
              <View style={styles.budgetMetricsGrid}>
                <View style={styles.budgetMetricBox}>
                  <Text style={styles.metricBoxLabel}>Necesario para hacer el mes</Text>
                  <Text style={styles.metricBoxValue}>{formatCurrency(totalCategoryLimits)}</Text>
                </View>
                <View style={styles.metricBoxDivider} />
                <View style={styles.budgetMetricBox}>
                  <Text style={styles.metricBoxLabel}>Gastado</Text>
                  <Text style={[styles.metricBoxValue, { color: '#ba1a1a' }]}>{formatCurrency(monthExpenses)}</Text>
                </View>
                <View style={styles.metricBoxDivider} />
                <View style={styles.budgetMetricBox}>
                  <Text style={styles.metricBoxLabel}>Fondo Inicial</Text>
                  <Text style={styles.metricBoxValue}>{formatCurrency(startingBalance)}</Text>
                </View>
              </View>

              <View style={styles.goalBulletRow}>
                <Text style={styles.goalText}>Progreso de Consumo</Text>
                <Text style={styles.percentageText}>{spentProgress}% gastado</Text>
              </View>
              <View style={styles.miniProgressBarBg}>
                <View
                  style={[
                    styles.miniProgressBarFill,
                    {
                      width: `${spentProgress}%`,
                      backgroundColor: spentProgress >= 90 ? '#ba1a1a' : '#84a59d',
                    },
                  ]}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Flujo de Caja Card */}
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
                    width: `${monthIncome > 0 ? Math.min(100, (monthIncome / (startingBalance || 1)) * 100) : 0}%`,
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

        {/* Categoría de Mayor Gasto Highlight Card */}
        {topSpendingCategory && topSpendingCategory.spent > 0 && (
          <View style={[styles.glassCard, { borderColor: `${topSpendingCategory.color}55` }]}>
            <View style={styles.topCategoryHeader}>
              <View style={[styles.topCategoryIconBg, { backgroundColor: `${topSpendingCategory.color}22` }]}>
                <MaterialIcons name={topSpendingCategory.icon as any} size={24} color={topSpendingCategory.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.topCategoryTitleRow}>
                  <Text style={styles.topCategorySubtitle}>Categoría con Mayor Gasto</Text>
                  <Text style={styles.trophyIcon}>🏆</Text>
                </View>
                <Text style={styles.topCategoryName}>{topSpendingCategory.name}</Text>
              </View>
              <View style={[styles.topCategoryBadge, { backgroundColor: `${topSpendingCategory.color}25` }]}>
                <Text style={[styles.topCategoryBadgeText, { color: topSpendingCategory.color }]}>
                  {formatCurrency(topSpendingCategory.spent)}
                </Text>
              </View>
            </View>
            <Text style={styles.topCategoryPercentText}>
              {monthExpenses > 0
                ? `Acumula el ${Math.round((topSpendingCategory.spent / monthExpenses) * 100)}% de todos tus gastos de este mes (${formatCurrency(topSpendingCategory.spent)} de ${formatCurrency(monthExpenses)}).`
                : ''}
            </Text>
          </View>
        )}

        {/* Presupuestos del Mes (Categories list on Dashboard) */}
        <View style={styles.glassCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.sectionTitle}>Presupuestos de este Mes</Text>
              <Text style={styles.sectionSubtitle}>Toca una categoría para editarla o pulsa "Límite alcanzado".</Text>
            </View>
            <View style={styles.totalLimitsBadge}>
              <Text style={styles.totalLimitsBadgeLabel}>Suma Límites</Text>
              <Text style={styles.totalLimitsBadgeValue}>{formatCurrency(totalCategoryLimits)}</Text>
            </View>
          </View>
          
          {categoryBudgets.length === 0 ? (
            <Text style={styles.emptyText}>No hay categorías configuradas para este mes.</Text>
          ) : (
            <View style={styles.dashboardCategoryList}>
              {categoryBudgets.map((cat, idx) => {
                const percentage = Math.min(100, Math.round((cat.spent / (cat.limit || 1)) * 100));
                const remaining = cat.limit - cat.spent;
                const isLimitReached = cat.spent >= cat.limit;
                const progressColor = isLimitReached ? '#775651' : (percentage >= 90 ? '#ba1a1a' : cat.color);
                const isTopCategory = topSpendingCategory && topSpendingCategory.category === cat.category && cat.spent > 0;

                return (
                  <View key={cat.category + idx} style={styles.dashboardCategoryItem}>
                    <TouchableOpacity
                      style={styles.dashboardCategoryTop}
                      onPress={() => handleOpenEditCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dashboardCategoryLeft}>
                        <View style={[styles.miniIconBg, { backgroundColor: `${progressColor}22` }]}>
                          <MaterialIcons name={cat.icon as any} size={16} color={progressColor} />
                        </View>
                        <Text style={styles.dashboardCategoryName} numberOfLines={1} ellipsizeMode="tail">{cat.name}</Text>
                        {isTopCategory && (
                          <View style={styles.topBadgeTag}>
                            <Text style={styles.topBadgeTagText}>🏆 Mayor Gasto</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.dashboardCategoryAmount}>
                        {formatCurrency(cat.spent)} / {formatCurrency(cat.limit)}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.miniProgressBarBg}>
                      <View
                        style={[
                          styles.miniProgressBarFill,
                          { width: `${percentage}%`, backgroundColor: progressColor },
                        ]}
                      />
                    </View>

                    <View style={styles.dashboardCategoryBottomRow}>
                      <Text style={[styles.remainingText, { color: progressColor }]}>
                        {remaining > 0 ? `Quedan ${formatCurrency(remaining)}` : 'Límite alcanzado'}
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.limitReachedBtn,
                          isLimitReached && styles.limitReachedBtnDisabled,
                        ]}
                        onPress={() => handleMarkLimitReached(cat)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name={isLimitReached ? 'check-circle' : 'flag'}
                          size={14}
                          color={isLimitReached ? '#775651' : '#84a59d'}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.limitReachedBtnText,
                            isLimitReached && styles.limitReachedBtnTextDisabled,
                          ]}
                        >
                          {isLimitReached ? 'Alcanzado' : 'Límite alcanzado'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Recent Movimientos Card */}
        <View style={styles.glassCard}>
          <View style={styles.recentHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Movimientos de este Mes</Text>
              <Text style={styles.sectionSubtitle}>Edita o elimina cualquier gasto registrado</Text>
            </View>
            {monthTransactions.length > 0 && (
              <TouchableOpacity onPress={handleClearAllMonthTxs} style={styles.clearMonthBtn} activeOpacity={0.7}>
                <MaterialIcons name="delete-sweep" size={16} color="#ba1a1a" style={{ marginRight: 4 }} />
                <Text style={styles.clearMonthBtnText}>Vaciar Mes</Text>
              </TouchableOpacity>
            )}
          </View>

          {monthTransactions.length === 0 ? (
            <Text style={styles.emptyText}>No hay movimientos registrados en este mes.</Text>
          ) : (
            <View style={styles.txList}>
              {monthTransactions.map((tx) => {
                const meta = getCategoryMeta(tx.category, tx.type);
                const isExpense = tx.type === 'expense';
                return (
                  <View key={tx.id} style={styles.txItemRow}>
                    <View style={styles.txItemLeft}>
                      <View style={[styles.categoryIconBg, { backgroundColor: meta.bg }]}>
                        <MaterialIcons name={meta.icon as any} size={20} color={meta.color} />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txTitle} numberOfLines={1} ellipsizeMode="tail">{tx.description}</Text>
                        <Text style={styles.txDate}>{formatTxDate(tx.date)}</Text>
                      </View>
                    </View>

                    <View style={styles.txItemRightGroup}>
                      <Text
                        style={[
                          styles.txAmount,
                          { color: isExpense ? '#1e1b1a' : '#84a59d' },
                        ]}
                      >
                        {isExpense ? '-' : '+'}
                        {formatCurrency(tx.amount)}
                      </Text>

                      <View style={styles.txActionsGroup}>
                        <TouchableOpacity onPress={() => handleOpenEditTx(tx)} style={styles.txActionIconBtn} activeOpacity={0.7}>
                          <MaterialIcons name="edit" size={16} color="#504442" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteTx(tx)} style={styles.txActionIconBtn} activeOpacity={0.7}>
                          <MaterialIcons name="delete" size={16} color="#ba1a1a" />
                        </TouchableOpacity>
                      </View>
                    </View>
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
                    keyboardType={Platform.OS === 'web' ? ('default' as any) : 'decimal-pad'}
                    inputMode="decimal"
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
                  keyboardType={Platform.OS === 'web' ? ('default' as any) : 'decimal-pad'}
                  inputMode="decimal"
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
                    <View style={styles.categoryWrapGrid}>
                      {availableCategoryChips.map((cat) => {
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
                    </View>
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

      {/* Modal - Editar Movimiento */}
      <Modal animationType="slide" transparent={true} visible={editTxModalVisible}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditTxModalVisible(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color="#504442" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>Editar Movimiento</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>€</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#efe6e5"
                  keyboardType={Platform.OS === 'web' ? ('default' as any) : 'decimal-pad'}
                  inputMode="decimal"
                  value={editTxAmount}
                  onChangeText={setEditTxAmount}
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
                      placeholder="Ej. Compra de supermercado"
                      placeholderTextColor="#e0d8d7"
                      value={editTxDescription}
                      onChangeText={setEditTxDescription}
                    />
                  </View>
                </View>

                {editTxType === 'expense' && (
                  <>
                    <View style={styles.fieldDivider} />
                    <View style={styles.categorySelectSection}>
                      <Text style={styles.categorySectionLabel}>Categoría</Text>
                      <View style={styles.categoryWrapGrid}>
                        {availableCategoryChips.map((cat) => {
                          const isSelected = editTxCategory === cat.category;
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
                              onPress={() => setEditTxCategory(cat.category)}
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
                      </View>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEditTx}>
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
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
              <Text style={styles.modalHeaderTitle}>Presupuesto de Este Mes</Text>
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
                    keyboardType={Platform.OS === 'web' ? ('default' as any) : 'decimal-pad'}
                    inputMode="decimal"
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

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextGroup}>
                  <View style={styles.fieldIconBg}>
                    <MaterialIcons name={catIsTemporary ? 'event' : 'event-available'} size={20} color="#775651" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.toggleTitle}>
                      {catIsTemporary ? 'Categoría Temporal' : 'Categoría Fija'}
                    </Text>
                    <Text style={styles.toggleSubtitle}>
                      {catIsTemporary
                        ? 'Solo existe este mes (no se copiará a futuros meses)'
                        : 'Plantilla fija (se mantiene para todos los meses)'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={catIsTemporary}
                  onValueChange={setCatIsTemporary}
                  trackColor={{ false: '#e0d8d7', true: '#775651' }}
                  thumbColor={catIsTemporary ? '#ffffff' : '#f4eceb'}
                />
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
    paddingBottom: 140,
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
    textAlign: 'center',
  },
  progressAmount: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#84a59d',
    marginTop: 4,
    textAlign: 'center',
  },
  monthRequirementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.1)',
  },
  monthRequirementText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
  },
  goalIndicatorContainer: {
    width: '100%',
    marginTop: 16,
  },
  budgetMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.08)',
  },
  budgetMetricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricBoxLabel: {
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#504442',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
    textAlign: 'center',
  },
  metricBoxValue: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#775651',
  },
  metricBoxDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(80, 68, 66, 0.12)',
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
    minWidth: 0,
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
    flexShrink: 1,
  },
  topBadgeTag: {
    backgroundColor: 'rgba(212, 163, 115, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  topBadgeTagText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#775651',
  },
  topCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topCategoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCategoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topCategorySubtitle: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  trophyIcon: {
    fontSize: 12,
  },
  topCategoryName: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#1e1b1a',
    marginTop: 2,
    flexShrink: 1,
  },
  topCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexShrink: 0,
  },
  topCategoryBadgeText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
  },
  topCategoryPercentText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#504442',
    marginTop: 10,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  totalLimitsBadge: {
    backgroundColor: 'rgba(132, 165, 157, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  totalLimitsBadgeLabel: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: '#504442',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalLimitsBadgeValue: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#775651',
  },
  dashboardCategoryAmount: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#504442',
    flexShrink: 0,
  },
  dashboardCategoryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  limitReachedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(132, 165, 157, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  limitReachedBtnDisabled: {
    backgroundColor: 'rgba(119, 86, 81, 0.12)',
  },
  limitReachedBtnText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '600',
    color: '#84a59d',
  },
  limitReachedBtnTextDisabled: {
    color: '#775651',
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
    marginBottom: 12,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearMonthBtnText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#ba1a1a',
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#504442',
    textAlign: 'center',
    marginVertical: 12,
  },
  txList: {
    gap: 4,
  },
  txItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  txItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  txItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  txItemRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  txActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  txActionIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  categoryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  txInfo: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
  },
  txTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#1e1b1a',
    flexShrink: 1,
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
  categoryWrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 6,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    paddingVertical: 6,
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
