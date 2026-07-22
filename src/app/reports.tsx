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
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSavings } from '@/context/SavingsContext';
import { Header } from '@/components/Header';

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
  const { addTransaction, savingGoal, currentMonth } = useSavings();

  const [templates, setTemplates] = useState<TemplateItem[]>([
    {
      id: 't1',
      name: 'Internet Casa',
      category: 'Servicios Fijos',
      amount: 45.00,
      icon: 'router',
      color: '#84a59d',
      bg: 'rgba(132, 165, 157, 0.15)',
    },
    {
      id: 't2',
      name: 'Gimnasio',
      category: 'Salud y Bienestar',
      amount: 30.00,
      icon: 'fitness-center',
      color: '#7f5600',
      bg: 'rgba(127, 86, 0, 0.12)',
    },
    {
      id: 't3',
      name: 'Suscripción Streaming',
      category: 'Entretenimiento',
      amount: 15.99,
      icon: 'movie',
      color: '#775651',
      bg: 'rgba(119, 86, 81, 0.15)',
    },
  ]);

  // Last 6 months actual savings (static representation for visual charts)
  const chartData = [
    { month: 'Ene', height: '40%', val: '400€' },
    { month: 'Feb', height: '55%', val: '550€' },
    { month: 'Mar', height: '45%', val: '450€' },
    { month: 'Abr', height: '70%', val: '700€' },
    { month: 'May', height: '60%', val: '600€' },
    { month: 'Jun', height: '85%', val: '850€', highlighted: true },
  ];

  // Helper to generate next 6 months names starting from currentMonth
  const getNext6MonthsProjections = () => {
    const [yearStr, monthStr] = currentMonth.split('-');
    let year = parseInt(yearStr);
    let monthIdx = parseInt(monthStr) - 1; // 0-indexed month
    
    const projections = [];
    const monthlyFixedExpenses = templates.reduce((acc, t) => acc + t.amount, 0);
    const estimatedSavingsPerMonth = savingGoal; // The target saving per month
    
    let accumulatedSavings = 0;

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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const handleApplyTemplates = async () => {
    try {
      for (const item of templates) {
        await addTransaction({
          description: item.name,
          amount: item.amount,
          type: 'expense',
          category: 'other',
          isRecurring: true,
        });
      }
      Alert.alert(
        '¡Plantillas Aplicadas!',
        'Se han añadido los gastos fijos correspondientes al mes actual.'
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Hubo un error al aplicar las plantillas.');
    }
  };

  const projections = getNext6MonthsProjections();
  const totalProjectedSavings = projections[5].accumulated;

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
          <Text style={styles.chartSubtitle}>Ahorros y gastos proyectados para el próximo semestre</Text>

          {/* Cumulative savings summary card */}
          <View style={styles.projectionSummaryCard}>
            <View style={styles.projectionIconBg}>
              <MaterialIcons name="trending-up" size={28} color="#84a59d" />
            </View>
            <View>
              <Text style={styles.projectionSummaryLabel}>Ahorro Total Proyectado</Text>
              <Text style={styles.projectionSummaryValue}>+{formatCurrency(totalProjectedSavings)}</Text>
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
              <Text style={styles.trendBadgeText}>+15% vs sem. anterior</Text>
            </View>
          </View>
          <Text style={styles.chartSubtitle}>Últimos 6 meses anteriores</Text>

          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.gridLinesContainer}>
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
            </View>

            <View style={styles.barsContainer}>
              {chartData.map((d, index) => (
                <View key={d.month + index} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: d.height as any },
                        d.highlighted && { backgroundColor: '#84a59d' },
                      ]}
                    >
                      {d.highlighted && (
                        <View style={styles.tooltip}>
                          <Text style={styles.tooltipText}>{d.val}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.barLabel, d.highlighted && styles.barLabelHighlighted]}>
                    {d.month}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Templates Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Plantillas Automáticas</Text>
          <TouchableOpacity style={styles.addTemplateBtn}>
            <MaterialIcons name="add-circle" size={22} color="#775651" />
          </TouchableOpacity>
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
});
