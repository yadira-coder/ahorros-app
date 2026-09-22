import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSavings, PlannedExpense } from '@/context/SavingsContext';
import { Header } from '@/components/Header';
import { customAlert, customConfirm } from '@/utils/alert';
import { parseFormattedAmount } from '@/utils/format';

const { width } = Dimensions.get('window');

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  icon: string;
  color: string;
  bg: string;
}

const MONTH_ORDER = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export default function ReportsScreen() {
  const {
    addTransaction,
    savingGoal,
    currentMonth,
    transactions,
    categoryBudgets,
    topSpendingCategory,
    initialAccumulatedSavings,
    updateInitialAccumulatedSavings,
    plannedExpenses,
    addPlannedExpense,
    updatePlannedExpense,
    deletePlannedExpense,
    updateCategory,
  } = useSavings();

  const [accumulatedModalVisible, setAccumulatedModalVisible] = useState(false);
  const [editedAccumulated, setEditedAccumulated] = useState('');

  // Expense Study Period State
  const [studyPeriod, setStudyPeriod] = useState<'quarterly' | 'semiannual' | 'annual'>('quarterly');

  // Planned Expenses State
  const [plannedModalVisible, setPlannedModalVisible] = useState(false);
  const [editingPlanned, setEditingPlanned] = useState<PlannedExpense | null>(null);
  const [plannedTitle, setPlannedTitle] = useState('');
  const [plannedAmount, setPlannedAmount] = useState('');
  const [plannedMonth, setPlannedMonth] = useState('2026-10'); // e.g. Octubre 2026
  const [plannedFrequency, setPlannedFrequency] = useState<'one_time' | 'quarterly' | 'annual'>('one_time');

  const handleOpenAddPlanned = () => {
    setEditingPlanned(null);
    setPlannedTitle('');
    setPlannedAmount('');
    setPlannedMonth(currentMonth || '2026-10');
    setPlannedFrequency('one_time');
    setPlannedModalVisible(true);
  };

  const handleOpenEditPlanned = (exp: PlannedExpense) => {
    setEditingPlanned(exp);
    setPlannedTitle(exp.title);
    setPlannedAmount(exp.amount.toString());
    setPlannedMonth(exp.targetMonth);
    setPlannedFrequency(exp.frequency || 'one_time');
    setPlannedModalVisible(true);
  };

  const handleSavePlanned = async () => {
    const numAmt = parseFormattedAmount(plannedAmount);
    if (!plannedTitle.trim() || numAmt <= 0) {
      customAlert('Error', 'Por favor introduce un concepto y monto válido.');
      return;
    }

    if (editingPlanned) {
      await updatePlannedExpense(editingPlanned.id, {
        title: plannedTitle.trim(),
        amount: numAmt,
        targetMonth: plannedMonth,
        frequency: plannedFrequency,
      });
    } else {
      await addPlannedExpense({
        title: plannedTitle.trim(),
        amount: numAmt,
        targetMonth: plannedMonth,
        frequency: plannedFrequency,
      });
      const freqLabel = plannedFrequency === 'quarterly' ? 'de forma trimestral (cada 3 meses)' : plannedFrequency === 'annual' ? 'de forma anual (cada 12 meses)' : 'puntualmente';
      customAlert(
        'Gasto Previsto Creado',
        `Se ha programado "${plannedTitle.trim()}" ${freqLabel} desde ${plannedMonth}. Se creará automáticamente la Categoría Temporal por valor de ${formatCurrency(numAmt)} en dichos meses.`
      );
    }

    setPlannedModalVisible(false);
  };

  const handleDeletePlanned = (id: string) => {
    customConfirm('Eliminar Gasto Previsto', '¿Estás seguro de que deseas eliminar este gasto futuro programado?', async () => {
      await deletePlannedExpense(id);
    });
  };

  const [templates, setTemplates] = useState<TemplateItem[]>([
    {
      id: 't1',
      name: 'Internet Casa',
      category: 'home',
      amount: 45.00,
      icon: 'wifi',
      color: '#84a59d',
      bg: 'rgba(132, 165, 157, 0.15)',
    },
    {
      id: 't2',
      name: 'Suplementos / Gimnasio',
      category: 'entertainment',
      amount: 35.00,
      icon: 'medication',
      color: '#b27092',
      bg: 'rgba(178, 112, 146, 0.15)',
    },
    {
      id: 't3',
      name: 'Suscripción TV / Streaming',
      category: 'entertainment',
      amount: 15.99,
      icon: 'tv',
      color: '#775651',
      bg: 'rgba(119, 86, 81, 0.15)',
    },
  ]);

  // Calculate dynamic 6-month historical savings based on actual recorded transactions
  const getPast6MonthsHistory = () => {
    const [yearStr, monthStr] = currentMonth.split('-');
    let year = parseInt(yearStr);
    let monthIdx = parseInt(monthStr) - 1; // 0-indexed month

    const history = [];
    let maxVal = 0;
    let totalTransactionsCount = 0;

    for (let i = 5; i >= 0; i--) {
      let pastYear = year;
      let pastMonthIdx = monthIdx - i;
      while (pastMonthIdx < 0) {
        pastMonthIdx += 12;
        pastYear -= 1;
      }

      const pastMonthCode = `${pastYear}-${String(pastMonthIdx + 1).padStart(2, '0')}`;
      const monthLabel = MONTH_ORDER[pastMonthIdx];

      const pastTxs = transactions.filter((tx) => tx.date.substring(0, 7) === pastMonthCode);
      totalTransactionsCount += pastTxs.length;

      const income = pastTxs.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = pastTxs.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const saving = pastTxs.filter((t) => t.type === 'saving').reduce((acc, t) => acc + t.amount, 0);

      const netSaved = Math.max(0, income - expense + saving);
      if (netSaved > maxVal) maxVal = netSaved;

      history.push({
        monthCode: pastMonthCode,
        month: monthLabel,
        amount: netSaved,
        hasData: pastTxs.length > 0,
        isCurrent: pastMonthCode === currentMonth,
      });
    }

    const historyData = history.map((h) => {
      const heightPercent = maxVal > 0 && h.amount > 0 ? Math.min(100, Math.max(10, Math.round((h.amount / maxVal) * 100))) : 0;
      return {
        ...h,
        height: `${heightPercent}%`,
        val: h.hasData ? formatCurrency(h.amount) : 'Sin datos',
      };
    });

    return {
      historyData,
      hasAnyData: totalTransactionsCount > 0,
    };
  };

  // Helper to generate next 6 months names starting from currentMonth with base accumulated savings
  const getNext6MonthsProjections = () => {
    const [yearStr, monthStr] = currentMonth.split('-');
    let year = parseInt(yearStr);
    let monthIdx = parseInt(monthStr) - 1;
    
    const projections = [];
    const monthlyFixedExpenses = templates.reduce((acc, t) => acc + t.amount, 0);
    const estimatedSavingsPerMonth = savingGoal;
    
    let accumulatedSavings = initialAccumulatedSavings;

    for (let i = 1; i <= 6; i++) {
      monthIdx += 1;
      if (monthIdx > 11) {
        monthIdx = 0;
        year += 1;
      }
      
      const monthLabel = MONTH_ORDER[monthIdx];
      accumulatedSavings += estimatedSavingsPerMonth;
      
      projections.push({
        monthName: `${monthLabel} ${year}`,
        savingsEst: estimatedSavingsPerMonth,
        expensesEst: monthlyFixedExpenses,
        accumulated: accumulatedSavings,
      });
    }

    return projections;
  };

  // Compute Expense Analysis for selected studyPeriod (3, 6, or 12 months) ONLY for FIXED categories & recurring concept study
  const getExpenseStudyAnalysis = () => {
    const periodMonthsCount = studyPeriod === 'quarterly' ? 3 : studyPeriod === 'semiannual' ? 6 : 12;
    const [yearStr, monthStr] = currentMonth.split('-');
    let year = parseInt(yearStr);
    let monthIdx = parseInt(monthStr) - 1; // 0-indexed

    const periodMonthsCodes: string[] = [];
    for (let i = periodMonthsCount - 1; i >= 0; i--) {
      let pYear = year;
      let pMonthIdx = monthIdx - i;
      while (pMonthIdx < 0) {
        pMonthIdx += 12;
        pYear -= 1;
      }
      periodMonthsCodes.push(`${pYear}-${String(pMonthIdx + 1).padStart(2, '0')}`);
    }

    // 1. Filter ONLY FIXED categories (excluding temporary ones)
    const fixedCategoryBudgets = categoryBudgets.filter((bud) => !bud.isTemporary);
    const fixedCategoryKeys = new Set(fixedCategoryBudgets.map((b) => b.category));

    // Filter expense transactions belonging ONLY to fixed categories in period
    const periodTxs = transactions.filter(
      (tx) =>
        tx.type === 'expense' &&
        periodMonthsCodes.includes(tx.date.substring(0, 7)) &&
        (fixedCategoryKeys.has(tx.category) || tx.category === 'other' || !tx.category)
    );

    const totalPeriodExpenses = periodTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // 2. Group expenses by FIXED categories
    const categoryTotalsMap: { [catKey: string]: { name: string; color: string; icon: string; totalSpent: number } } = {};

    periodTxs.forEach((tx) => {
      const catKey = tx.category || 'other';
      if (!categoryTotalsMap[catKey]) {
        const matchBud = fixedCategoryBudgets.find((b) => b.category === catKey);
        categoryTotalsMap[catKey] = {
          name: matchBud ? matchBud.name : (catKey === 'other' ? 'Otros / General' : catKey),
          color: matchBud ? matchBud.color : '#775651',
          icon: matchBud ? matchBud.icon : 'more-horiz',
          totalSpent: 0,
        };
      }
      categoryTotalsMap[catKey].totalSpent += tx.amount;
    });

    // Also include active fixed categories that might have 0 spent to evaluate their limits
    fixedCategoryBudgets.forEach((bud) => {
      if (!categoryTotalsMap[bud.category]) {
        categoryTotalsMap[bud.category] = {
          name: bud.name,
          color: bud.color,
          icon: bud.icon,
          totalSpent: 0,
        };
      }
    });

    const categoryAnalysisList = Object.keys(categoryTotalsMap).map((catKey) => {
      const item = categoryTotalsMap[catKey];
      const matchBud = fixedCategoryBudgets.find((b) => b.category === catKey);
      const currentLimit = matchBud ? matchBud.limit : 0;
      const avgMonthlySpent = Number((item.totalSpent / periodMonthsCount).toFixed(2));
      const diff = Number((avgMonthlySpent - currentLimit).toFixed(2));

      const recommendedLimit = avgMonthlySpent > 0 ? Math.max(10, Math.round(avgMonthlySpent / 5) * 5) : currentLimit;

      let status: 'over' | 'under' | 'aligned' = 'aligned';
      let adviceText = '';

      if (currentLimit > 0 && avgMonthlySpent > currentLimit + 5) {
        status = 'over';
        adviceText = `Superas tu límite fijo por ${formatCurrency(avgMonthlySpent - currentLimit)}/mes de media. Se aconseja subir el límite a ${formatCurrency(recommendedLimit)} para reflejar tu gasto real.`;
      } else if (currentLimit > 0 && currentLimit - avgMonthlySpent > 15) {
        status = 'under';
        adviceText = `Gastas ${formatCurrency(currentLimit - avgMonthlySpent)}/mes menos de lo reservado. Se aconseja reducir el límite a ${formatCurrency(recommendedLimit)} y liberar la diferencia para tu ahorro.`;
      } else {
        status = 'aligned';
        adviceText = `Tu presupuesto fijo de ${formatCurrency(currentLimit)} refleja con precisión tu gasto real medio (${formatCurrency(avgMonthlySpent)}/mes).`;
      }

      return {
        categoryKey: catKey,
        name: item.name,
        color: item.color,
        icon: item.icon,
        totalSpent: item.totalSpent,
        avgMonthlySpent,
        currentLimit,
        diff,
        recommendedLimit,
        status,
        adviceText,
        percentage: totalPeriodExpenses > 0 ? Math.round((item.totalSpent / totalPeriodExpenses) * 100) : 0,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    // 3. Concept / Merchant Frequency Study (Gastos / Conceptos más repetidos como Stradivarius, Primor, Mercadona, etc.)
    const conceptMap: { [conceptKey: string]: { concept: string; count: number; totalSpent: number; categoryName: string; color: string } } = {};

    periodTxs.forEach((tx) => {
      const conceptStr = tx.description ? tx.description.trim() : '';
      if (!conceptStr) return;
      const cKey = conceptStr.toLowerCase();

      const catBud = fixedCategoryBudgets.find((b) => b.category === tx.category);

      if (!conceptMap[cKey]) {
        conceptMap[cKey] = {
          concept: conceptStr,
          count: 0,
          totalSpent: 0,
          categoryName: catBud ? catBud.name : 'General',
          color: catBud ? catBud.color : '#775651',
        };
      }
      conceptMap[cKey].count += 1;
      conceptMap[cKey].totalSpent += tx.amount;
    });

    const topRecurringConcepts = Object.values(conceptMap)
      .sort((a, b) => b.count - a.count || b.totalSpent - a.totalSpent)
      .slice(0, 6)
      .map((c) => ({
        ...c,
        avgMonthlySpent: Number((c.totalSpent / periodMonthsCount).toFixed(2)),
      }));

    return {
      periodMonthsCount,
      totalPeriodExpenses,
      categoryAnalysisList,
      topRecurringConcepts,
    };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const handleOpenEditAccumulated = () => {
    setEditedAccumulated(initialAccumulatedSavings.toString());
    setAccumulatedModalVisible(true);
  };

  const handleSaveAccumulated = async () => {
    const amount = parseFormattedAmount(editedAccumulated);
    if (amount < 0) {
      customAlert('Error', 'Introduce una cantidad de dinero acumulado válida.');
      return;
    }
    await updateInitialAccumulatedSavings(amount);
    setAccumulatedModalVisible(false);
  };

  const handleApplyTemplates = async () => {
    try {
      for (const item of templates) {
        // Find matching category from categoryBudgets or use item.category
        const matchedCat = categoryBudgets.find(c => c.category === item.category || c.name.toLowerCase().includes(item.name.toLowerCase()));
        const targetCategory = matchedCat ? matchedCat.category : (item.category || 'other');

        await addTransaction({
          description: item.name,
          amount: item.amount,
          type: 'expense',
          category: targetCategory,
          isRecurring: true,
        });
      }
      customAlert(
        '¡Plantillas Aplicadas!',
        'Se han añadido los gastos fijos a sus categorías correspondientes para el mes actual.'
      );
    } catch (e) {
      console.error(e);
      customAlert('Error', 'Hubo un error al aplicar las plantillas.');
    }
  };

  const projections = getNext6MonthsProjections();
  const { historyData, hasAnyData } = getPast6MonthsHistory();
  const totalProjectedSavings = projections[5].accumulated;

  const monthTotalExpenses = transactions
    .filter((tx) => tx.date.substring(0, 7) === currentMonth && tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const sortedCategoryExpenses = [...categoryBudgets].sort((a, b) => b.spent - a.spent);

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
          <Text style={styles.pageTitle}>Informes y Proyecciones</Text>
        </View>

        {/* Proyecciones Financieras a 6 Meses */}
        <View style={styles.glassCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Planificación a Futuro</Text>
            <View style={[styles.trendBadge, { backgroundColor: '#c7eae1' }]}>
              <Text style={[styles.trendBadgeText, { color: '#00201b' }]}>6 Meses</Text>
            </View>
          </View>
          <Text style={styles.chartSubtitle}>Ahorros y gastos proyectados para los próximos meses</Text>

          {/* Editable Base Accumulated Savings Card */}
          <TouchableOpacity
            style={styles.projectionSummaryCard}
            onPress={handleOpenEditAccumulated}
            activeOpacity={0.8}
          >
            <View style={[styles.projectionIconBg, { backgroundColor: 'rgba(132, 165, 157, 0.2)' }]}>
              <MaterialIcons name="account-balance" size={26} color="#84a59d" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.projectionSummaryLabel}>Ahorro Acumulado Base (Toca para editar)</Text>
              <Text style={styles.projectionSummaryValue}>{formatCurrency(initialAccumulatedSavings)}</Text>
            </View>
            <View style={styles.editIconBadge}>
              <MaterialIcons name="edit" size={16} color="#775651" />
            </View>
          </TouchableOpacity>

          {/* Total Projected Savings card */}
          <View style={[styles.projectionSummaryCard, { borderColor: 'rgba(119, 86, 81, 0.2)' }]}>
            <View style={[styles.projectionIconBg, { backgroundColor: '#f5cac3' }]}>
              <MaterialIcons name="trending-up" size={26} color="#775651" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.projectionSummaryLabel}>Ahorro Total Proyectado (Base + 6 Meses)</Text>
              <Text style={[styles.projectionSummaryValue, { color: '#775651' }]}>
                {formatCurrency(totalProjectedSavings)}
              </Text>
            </View>
          </View>

          {/* 6-Month list */}
          <View style={styles.projectionList}>
            {projections.map((p, idx) => (
              <View key={idx} style={styles.projectionItem}>
                <View style={styles.projItemLeft}>
                  <Text style={styles.projMonthName}>{p.monthName}</Text>
                  <Text style={styles.projMonthExpenses}>Gastos Fijos: {formatCurrency(p.expensesEst)}</Text>
                </View>
                <View style={styles.projItemRight}>
                  <Text style={styles.projSavingsAmount}>+{formatCurrency(p.savingsEst)}</Text>
                  <Text style={styles.projAccumulatedText}>Acumulado: {formatCurrency(p.accumulated)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Histórico Section */}
        <View style={styles.glassCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Histórico de Ahorro</Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendBadgeText}>Registros Reales</Text>
            </View>
          </View>
          <Text style={styles.chartSubtitle}>Ahorro mensual registrado en la aplicación</Text>

          {!hasAnyData ? (
            <View style={styles.emptyHistoryCard}>
              <MaterialIcons name="bar-chart" size={36} color="#bcb8b1" />
              <Text style={styles.emptyHistoryTitle}>Sin datos registrados aún</Text>
              <Text style={styles.emptyHistorySubtitle}>
                No hay movimientos registrados en estos meses. Registra tus ingresos y gastos para visualizar tu gráfico histórico real.
              </Text>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <View style={styles.gridLinesContainer}>
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
                <View style={styles.gridLine} />
              </View>

              <View style={styles.barsContainer}>
                {historyData.map((d, index) => (
                  <View key={d.monthCode + index} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: d.height as any },
                          d.isCurrent && { backgroundColor: '#84a59d' },
                        ]}
                      >
                        {d.amount > 0 && (
                          <View style={styles.tooltip}>
                            <Text style={styles.tooltipText}>{d.val}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.barLabel, d.isCurrent && styles.barLabelHighlighted]}>
                      {d.month}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Desglose y Ranking de Gastos por Categoría */}
        <View style={styles.glassCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Gastos por Categoría</Text>
            <View style={[styles.trendBadge, { backgroundColor: '#f5cac3' }]}>
              <Text style={[styles.trendBadgeText, { color: '#775651' }]}>Desglose Real</Text>
            </View>
          </View>
          <Text style={styles.chartSubtitle}>
            Orden de mayor a menor gasto acumulado en el mes
          </Text>

          {monthTotalExpenses === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <MaterialIcons name="pie-chart-outlined" size={32} color="#bcb8b1" />
              <Text style={styles.emptyHistoryTitle}>Sin gastos este mes</Text>
              <Text style={styles.emptyHistorySubtitle}>No se han registrado gastos en el mes activo.</Text>
            </View>
          ) : (
            <View style={{ marginTop: 12, gap: 12 }}>
              {sortedCategoryExpenses.map((cat, idx) => {
                const percentOfTotal = monthTotalExpenses > 0 ? Math.round((cat.spent / monthTotalExpenses) * 100) : 0;
                const isTop = idx === 0 && cat.spent > 0;

                return (
                  <View key={cat.category} style={styles.rankCategoryItem}>
                    <View style={styles.rankCategoryTop}>
                      <View style={styles.rankCategoryLeft}>
                        <Text style={styles.rankNumberText}>#{idx + 1}</Text>
                        <View style={[styles.miniIconBg, { backgroundColor: `${cat.color}22` }]}>
                          <MaterialIcons name={cat.icon as any} size={16} color={cat.color} />
                        </View>
                        <Text style={styles.rankCategoryName}>{cat.name}</Text>
                        {isTop && (
                          <View style={styles.topBadgeTag}>
                            <Text style={styles.topBadgeTagText}>🏆 Mayor Gasto</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.rankCategoryAmount}>{formatCurrency(cat.spent)}</Text>
                        <Text style={styles.rankCategoryPercent}>{percentOfTotal}% del total</Text>
                      </View>
                    </View>

                    <View style={styles.miniProgressBarBg}>
                      <View
                        style={[
                          styles.miniProgressBarFill,
                          {
                            width: `${percentOfTotal}%`,
                            backgroundColor: isTop ? '#775651' : cat.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Estudio de Gastos y Ajuste Inteligente Card */}
        <View style={styles.glassCard}>
          <View style={styles.chartHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.chartTitle}>Estudio de Gastos y Ajuste Inteligente</Text>
              <Text style={styles.chartSubtitle}>
                Análisis del gasto real medio para ajustar tus presupuestos a la realidad
              </Text>
            </View>
          </View>

          {/* Period Filter Buttons */}
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.4)', borderRadius: 12, padding: 4, marginVertical: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}>
            <TouchableOpacity
              style={[{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 }, studyPeriod === 'quarterly' && { backgroundColor: '#775651' }]}
              onPress={() => setStudyPeriod('quarterly')}
            >
              <Text style={[{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: '#504442' }, studyPeriod === 'quarterly' && { color: '#ffffff' }]}>
                3 Meses (Trimestral)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 }, studyPeriod === 'semiannual' && { backgroundColor: '#775651' }]}
              onPress={() => setStudyPeriod('semiannual')}
            >
              <Text style={[{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: '#504442' }, studyPeriod === 'semiannual' && { color: '#ffffff' }]}>
                6 Meses (Semestral)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 }, studyPeriod === 'annual' && { backgroundColor: '#775651' }]}
              onPress={() => setStudyPeriod('annual')}
            >
              <Text style={[{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: '#504442' }, studyPeriod === 'annual' && { color: '#ffffff' }]}>
                12 Meses (Anual)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Analysis Results List */}
          {(() => {
            const { periodMonthsCount, totalPeriodExpenses, categoryAnalysisList, topRecurringConcepts } = getExpenseStudyAnalysis();
            const periodLabel = studyPeriod === 'quarterly' ? 'últimos 3 meses' : studyPeriod === 'semiannual' ? 'últimos 6 meses' : 'último año';

            if (totalPeriodExpenses === 0) {
              return (
                <View style={styles.emptyHistoryCard}>
                  <MaterialIcons name="insights" size={32} color="#bcb8b1" />
                  <Text style={styles.emptyHistoryTitle}>Sin datos de gastos en los {periodLabel}</Text>
                  <Text style={styles.emptyHistorySubtitle}>Añade movimientos de gastos en categorías fijas para generar el estudio inteligente de desvíos.</Text>
                </View>
              );
            }

            return (
              <View style={{ gap: 14 }}>
                <View style={{ backgroundColor: 'rgba(132, 165, 157, 0.12)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(132, 165, 157, 0.25)' }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 13, color: '#3d5a52', lineHeight: 18 }}>
                    📊 <Text style={{ fontWeight: '700' }}>Gasto total en categorías fijas ({periodLabel}):</Text> {formatCurrency(totalPeriodExpenses)} (Media de {formatCurrency(totalPeriodExpenses / periodMonthsCount)}/mes).
                  </Text>
                </View>

                {/* Section for Top Recurring Concepts / Stores */}
                {topRecurringConcepts && topRecurringConcepts.length > 0 && (
                  <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.65)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(119, 86, 81, 0.15)', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialIcons name="repeat" size={18} color="#775651" />
                      <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: '#1e1b1a' }}>
                        Establecimientos y Gastos Más Repetidos
                      </Text>
                    </View>
                    <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#504442', lineHeight: 16 }}>
                      Estudio de compras frecuentes en tiendas y marcas (ej. Stradivarius, Primor, Mercadona...):
                    </Text>

                    <View style={{ gap: 8 }}>
                      {topRecurringConcepts.map((item, idx) => (
                        <View
                          key={item.concept + idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'rgba(255, 255, 255, 0.85)',
                            padding: 10,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: 'rgba(80, 68, 66, 0.08)',
                          }}
                        >
                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: '#1e1b1a' }}>
                                {item.concept}
                              </Text>
                              <View style={{ backgroundColor: `${item.color}22`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '600', color: item.color }}>
                                  {item.categoryName}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ fontFamily: 'Inter', fontSize: 11, color: '#504442' }}>
                              Repetido {item.count} {item.count === 1 ? 'vez' : 'veces'} en los {periodLabel}
                            </Text>
                          </View>

                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: '#775651' }}>
                              {formatCurrency(item.totalSpent)}
                            </Text>
                            <Text style={{ fontFamily: 'Inter', fontSize: 11, color: '#3d5a52', fontWeight: '600' }}>
                              ~{formatCurrency(item.avgMonthlySpent)}/mes
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Categories Budget Adjustment Recommendations Header */}
                <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: '#1e1b1a', marginTop: 4 }}>
                  Ajuste de Presupuesto por Categorías Fijas:
                </Text>

                {categoryAnalysisList.map((cat) => (
                  <View key={cat.categoryKey} style={{ backgroundColor: 'rgba(255, 255, 255, 0.55)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(80, 68, 66, 0.1)', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.miniIconBg, { backgroundColor: `${cat.color}22` }]}>
                          <MaterialIcons name={cat.icon as any} size={16} color={cat.color} />
                        </View>
                        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#1e1b1a' }}>{cat.name}</Text>
                      </View>
                      <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: '#1e1b1a' }}>
                        {formatCurrency(cat.avgMonthlySpent)} <Text style={{ fontSize: 11, fontWeight: '400', color: '#504442' }}>/mes</Text>
                      </Text>
                    </View>

                    {/* Compare with current limit */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#504442' }}>
                        Total acumulado: {formatCurrency(cat.totalSpent)} ({cat.percentage}% del total)
                      </Text>
                      <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#504442' }}>
                        Límite actual: {formatCurrency(cat.currentLimit)}
                      </Text>
                    </View>

                    {/* Recommendation Box */}
                    <View style={{
                      backgroundColor: cat.status === 'over' ? 'rgba(186, 26, 26, 0.08)' : cat.status === 'under' ? 'rgba(246, 189, 96, 0.12)' : 'rgba(132, 165, 157, 0.08)',
                      borderRadius: 10,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: cat.status === 'over' ? 'rgba(186, 26, 26, 0.2)' : cat.status === 'under' ? 'rgba(246, 189, 96, 0.3)' : 'rgba(132, 165, 157, 0.2)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <MaterialIcons
                        name={cat.status === 'over' ? 'warning' : cat.status === 'under' ? 'tips-and-updates' : 'check-circle'}
                        size={18}
                        color={cat.status === 'over' ? '#ba1a1a' : cat.status === 'under' ? '#d4a373' : '#84a59d'}
                      />
                      <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 12, color: '#1e1b1a', lineHeight: 16 }}>
                        {cat.adviceText}
                      </Text>

                      {cat.status !== 'aligned' && (
                        <TouchableOpacity
                          style={{ backgroundColor: cat.status === 'over' ? '#ba1a1a' : '#84a59d', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                          onPress={async () => {
                            await updateCategory(cat.categoryKey, { limit: cat.recommendedLimit }, 'global');
                            customAlert('Presupuesto Actualizado', `Se ha ajustado el límite de "${cat.name}" a ${formatCurrency(cat.recommendedLimit)} para ser fiel al gasto real.`);
                          }}
                        >
                          <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '600', color: '#ffffff' }}>
                            Ajustar a {formatCurrency(cat.recommendedLimit)}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>

        {/* Planned Expenses Section (Gastos Previstos Futuros) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>Gastos Previstos Futuros</Text>
          <TouchableOpacity onPress={handleOpenAddPlanned} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(119, 86, 81, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 }}>
            <MaterialIcons name="add" size={16} color="#775651" />
            <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: '#775651' }}>Añadir Gasto Previsto</Text>
          </TouchableOpacity>
        </View>

        {plannedExpenses.length === 0 ? (
          <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(80, 68, 66, 0.1)', marginBottom: 16 }}>
            <MaterialIcons name="event" size={32} color="#775651" />
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '600', color: '#1e1b1a', marginTop: 8, textAlign: 'center' }}>No hay gastos previstos programados</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, color: '#504442', textAlign: 'center', marginTop: 4, lineHeight: 16 }}>
              Añade gastos previstos (ej. Seguro del coche en Octubre) para crear automáticamente su categoría temporal en el mes objetivo.
            </Text>
          </View>
        ) : (
          <View style={[styles.templatesCard, { marginBottom: 16 }]}>
            {plannedExpenses.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.templateItem,
                  index < plannedExpenses.length - 1 && styles.templateItemBorder,
                ]}
              >
                <View style={styles.templateLeft}>
                  <View style={[styles.templateIconBg, { backgroundColor: 'rgba(119, 86, 81, 0.12)' }]}>
                    <MaterialIcons name="event" size={20} color="#775651" />
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.templateName}>{item.title}</Text>
                      {item.frequency === 'quarterly' && (
                        <View style={{ backgroundColor: 'rgba(246, 189, 96, 0.3)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: '#775651' }}>🔄 Trimestral</Text>
                        </View>
                      )}
                      {item.frequency === 'annual' && (
                        <View style={{ backgroundColor: 'rgba(132, 165, 157, 0.3)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', color: '#3d5a52' }}>📅 Anual</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.templateCategory}>Programado para: {item.targetMonth}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={styles.templateAmount}>{formatCurrency(item.amount)}</Text>
                  <TouchableOpacity onPress={() => handleOpenEditPlanned(item)}>
                    <MaterialIcons name="edit" size={16} color="#504442" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeletePlanned(item.id)}>
                    <MaterialIcons name="delete" size={16} color="#ba1a1a" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Templates Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Plantillas Automáticas</Text>
        </View>

        <View style={styles.templatesCard}>
          {templates.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.templateItem,
                index < templates.length - 1 && styles.templateItemBorder,
              ]}
            >
              <View style={styles.templateLeft}>
                <View style={[styles.templateIconBg, { backgroundColor: item.bg }]}>
                  <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <View>
                  <Text style={styles.templateName}>{item.name}</Text>
                  <Text style={styles.templateCategory}>{item.category}</Text>
                </View>
              </View>
              <Text style={styles.templateAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Apply Templates Button */}
        <TouchableOpacity style={styles.applyButton} onPress={handleApplyTemplates}>
          <MaterialIcons name="task-alt" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.applyButtonText}>Aplicar plantillas al mes actual</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal - Configurar Dinero Acumulado Base */}
      <Modal animationType="fade" transparent={true} visible={accumulatedModalVisible}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.centerModalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View style={styles.actionModalCard}>
                <Text style={styles.actionModalTitle}>Dinero Acumulado Previo</Text>
                <Text style={styles.actionModalSubtitle}>
                  Introduce el total de ahorro previo guardado para calcular las proyecciones
                </Text>

                <View style={styles.actionInputContainer}>
                  <Text style={styles.currencySymbol}>€</Text>
                  <TextInput
                    style={styles.actionInput}
                    placeholder="0"
                    keyboardType={Platform.OS === 'web' ? ('default' as any) : 'decimal-pad'}
                    inputMode="decimal"
                    value={editedAccumulated}
                    onChangeText={setEditedAccumulated}
                    autoFocus
                  />
                </View>

                <View style={styles.actionModalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalCancelBtn]}
                    onPress={() => setAccumulatedModalVisible(false)}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalConfirmBtn]}
                    onPress={handleSaveAccumulated}
                  >
                    <Text style={styles.modalConfirmBtnText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Modal - Añadir / Editar Gasto Previsto */}
      <Modal animationType="slide" transparent={true} visible={plannedModalVisible}>
        <View style={styles.centerModalOverlay}>
          <SafeAreaView style={{ width: '92%', maxWidth: 450, backgroundColor: '#f7ede2', borderRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 17, fontWeight: '700', color: '#1e1b1a' }}>
                {editingPlanned ? 'Editar Gasto Previsto' : 'Programar Gasto Previsto'}
              </Text>
              <TouchableOpacity onPress={() => setPlannedModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#504442" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 11, color: '#504442', textTransform: 'uppercase', fontWeight: '600' }}>
                  Concepto / Nombre del Gasto
                </Text>
                <TextInput
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderColor: 'rgba(80, 68, 66, 0.15)', borderRadius: 12, paddingHorizontal: 14, height: 46, fontFamily: 'Inter', fontSize: 15, color: '#1e1b1a' }}
                  placeholder="ej. Seguro del Coche, ITV, Matrícula..."
                  placeholderTextColor="#efe6e5"
                  value={plannedTitle}
                  onChangeText={setPlannedTitle}
                  autoFocus
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 11, color: '#504442', textTransform: 'uppercase', fontWeight: '600' }}>
                  Importe Estimado (€)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderColor: 'rgba(80, 68, 66, 0.15)', borderRadius: 12, paddingHorizontal: 14 }}>
                  <Text style={{ fontFamily: 'Inter', fontSize: 16, color: '#775651', fontWeight: '600', marginRight: 4 }}>€</Text>
                  <TextInput
                    style={{ flex: 1, height: 46, fontFamily: 'Inter', fontSize: 15, color: '#1e1b1a' }}
                    placeholder="350,00"
                    placeholderTextColor="#efe6e5"
                    keyboardType={Platform.OS === 'web' ? ('default' as any) : 'decimal-pad'}
                    inputMode="decimal"
                    value={plannedAmount}
                    onChangeText={setPlannedAmount}
                  />
                </View>
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 11, color: '#504442', textTransform: 'uppercase', fontWeight: '600' }}>
                  Mes Objetivo / Inicio (AAAA-MM)
                </Text>
                <TextInput
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', borderWidth: 1, borderColor: 'rgba(80, 68, 66, 0.15)', borderRadius: 12, paddingHorizontal: 14, height: 46, fontFamily: 'Inter', fontSize: 15, color: '#1e1b1a' }}
                  placeholder="2026-10"
                  placeholderTextColor="#efe6e5"
                  value={plannedMonth}
                  onChangeText={setPlannedMonth}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: 'Inter', fontSize: 11, color: '#504442', textTransform: 'uppercase', fontWeight: '600' }}>
                  Frecuencia de Repetición
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(80,68,66,0.15)', backgroundColor: 'rgba(255,255,255,0.5)' }, plannedFrequency === 'one_time' && { backgroundColor: '#775651', borderColor: '#775651' }]}
                    onPress={() => setPlannedFrequency('one_time')}
                  >
                    <Text style={[{ fontFamily: 'Inter', fontSize: 12, color: '#504442', fontWeight: '600' }, plannedFrequency === 'one_time' && { color: '#ffffff' }]}>Puntual</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(80,68,66,0.15)', backgroundColor: 'rgba(255,255,255,0.5)' }, plannedFrequency === 'quarterly' && { backgroundColor: '#775651', borderColor: '#775651' }]}
                    onPress={() => setPlannedFrequency('quarterly')}
                  >
                    <Text style={[{ fontFamily: 'Inter', fontSize: 12, color: '#504442', fontWeight: '600' }, plannedFrequency === 'quarterly' && { color: '#ffffff' }]}>🔄 Trimestral</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(80,68,66,0.15)', backgroundColor: 'rgba(255,255,255,0.5)' }, plannedFrequency === 'annual' && { backgroundColor: '#775651', borderColor: '#775651' }]}
                    onPress={() => setPlannedFrequency('annual')}
                  >
                    <Text style={[{ fontFamily: 'Inter', fontSize: 12, color: '#504442', fontWeight: '600' }, plannedFrequency === 'annual' && { color: '#ffffff' }]}>📅 Anual</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={{ backgroundColor: '#775651', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10 }}
                onPress={handleSavePlanned}
              >
                <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
                  {editingPlanned ? 'Guardar Cambios' : 'Programar Gasto Futuro'}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
    gap: 20,
  },
  titleSection: {
    marginVertical: 16,
  },
  pageTitle: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '700',
    color: '#775651',
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
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  trendBadge: {
    backgroundColor: '#efe6e5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
    fontWeight: '600',
  },
  chartSubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    marginTop: 4,
    marginBottom: 16,
  },
  // Projection styles
  projectionSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 16,
  },
  projectionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#c7eae1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectionSummaryLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#504442',
  },
  projectionSummaryValue: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: '#84a59d',
    marginTop: 2,
  },
  projectionList: {
    gap: 12,
  },
  projectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80, 68, 66, 0.05)',
  },
  projItemLeft: {
    gap: 2,
  },
  projMonthName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  projMonthExpenses: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
  },
  projItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  projSavingsAmount: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#84a59d',
  },
  projAccumulatedText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
    fontWeight: '600',
  },
  // Chart styles
  chartContainer: {
    height: 180,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  gridLinesContainer: {
    position: 'absolute',
    inset: 0,
    justifyContent: 'space-between',
    paddingBottom: 25,
  },
  gridLine: {
    height: 1,
    backgroundColor: 'rgba(80, 68, 66, 0.08)',
    width: '100%',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    zIndex: 1,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 120,
    width: '50%',
    backgroundColor: 'rgba(245, 202, 195, 0.25)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#f5cac3',
    borderRadius: 6,
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    top: -30,
    left: '50%',
    transform: [{ translateX: -20 }],
    backgroundColor: '#332f2f',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
    minWidth: 40,
  },
  tooltipText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  barLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
    marginTop: 8,
  },
  barLabelHighlighted: {
    fontWeight: '700',
    color: '#84a59d',
  },
  emptyHistoryCard: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.08)',
    marginVertical: 8,
  },
  rankCategoryItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(80, 68, 66, 0.08)',
    gap: 8,
  },
  rankCategoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankCategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rankNumberText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: '#775651',
    width: 22,
  },
  miniIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankCategoryName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  topBadgeTag: {
    backgroundColor: 'rgba(212, 163, 115, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  topBadgeTagText: {
    fontFamily: 'Inter',
    fontSize: 10,
    fontWeight: '700',
    color: '#775651',
  },
  rankCategoryAmount: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#1e1b1a',
  },
  rankCategoryPercent: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#504442',
  },
  miniProgressBarBg: {
    height: 6,
    backgroundColor: 'rgba(80, 68, 66, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyHistoryTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#1e1b1a',
    marginTop: 8,
  },
  emptyHistorySubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '600',
    color: '#775651',
  },
  addTemplateBtn: {
    padding: 4,
  },
  templatesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  templateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  templateItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(80, 68, 66, 0.08)',
  },
  templateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  templateIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateName: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#1e1b1a',
  },
  templateCategory: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#504442',
    marginTop: 2,
  },
  templateAmount: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: '#1e1b1a',
  },
  applyButton: {
    flexDirection: 'row',
    backgroundColor: '#775651',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#775651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 10,
  },
  applyButtonText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  editIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  actionModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  actionModalTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: '#1e1b1a',
    marginBottom: 6,
    textAlign: 'center',
  },
  actionModalSubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#504442',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7ede2',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  currencySymbol: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#775651',
    marginRight: 8,
  },
  actionInput: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#1e1b1a',
  },
  actionModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#efe6e5',
  },
  modalCancelBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#504442',
  },
  modalConfirmBtn: {
    backgroundColor: '#84a59d',
  },
  modalConfirmBtnText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
