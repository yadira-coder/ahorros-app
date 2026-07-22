import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'saving';
  category: string;
  date: string;
  isRecurring?: boolean;
}

export interface CategoryBudget {
  name: string;
  category: string; // Key
  limit: number;
  spent: number;
  color: string;
  icon: string;
}

export interface SavingGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  color: string;
  icon: string;
}

interface SavingsContextType {
  balance: number; // Remaining spending balance: startingBalance - totalExpenses
  startingBalance: number; // Configurable initial spending balance
  savingGoal: number; // Monthly savings target
  savingsAmount: number; // Total saved in active month (reference)
  currentMonth: string; // e.g. "2026-07"
  setCurrentMonth: (month: string) => Promise<void>;
  transactions: Transaction[];
  monthTransactions: Transaction[];
  categoryBudgets: CategoryBudget[];
  savingGoals: SavingGoal[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Starting Balance management
  updateStartingBalance: (amount: number) => Promise<void>;

  // Category management
  addCategory: (cat: Omit<CategoryBudget, 'spent'>) => Promise<void>;
  updateCategory: (categoryKey: string, updatedFields: Partial<CategoryBudget>) => Promise<void>;
  deleteCategory: (categoryKey: string) => Promise<void>;
  
  // Saving Goal (Huchas) management
  addSavingGoal: (goal: Omit<SavingGoal, 'id' | 'current'>) => Promise<void>;
  deleteSavingGoal: (id: string) => Promise<void>;
  updateSavingGoalProgress: (id: string, amount: number) => Promise<void>;
  updateSavingGoal: (id: string, updatedGoal: Partial<SavingGoal>) => Promise<void>;
  updateMonthlyGoal: (target: number) => Promise<void>;
  resetDatabase: () => Promise<void>;
  loading: boolean;
}

const SavingsContext = createContext<SavingsContextType | undefined>(undefined);

const STORAGE_KEY = '@ahorros_app_data_v3'; // Upgraded storage version for starting balance

const INITIAL_BUDGETS: CategoryBudget[] = [
  { name: 'Comida', category: 'food', limit: 500, spent: 170.5, color: '#84a59d', icon: 'restaurant' },
  { name: 'Alquiler', category: 'home', limit: 850, spent: 850, color: '#775651', icon: 'home' },
  { name: 'Ocio', category: 'entertainment', limit: 200, spent: 180, color: '#ba1a1a', icon: 'confirmation-number' },
  { name: 'Transporte', category: 'transport', limit: 100, spent: 45, color: '#f6bd60', icon: 'directions-car' },
  { name: 'Compras', category: 'shopping', limit: 300, spent: 0, color: '#f28482', icon: 'shopping-bag' },
];

const INITIAL_GOALS: SavingGoal[] = [
  { id: '1', title: 'Vacaciones', target: 5000, current: 2500, color: '#84a59d', icon: 'savings' },
  { id: '2', title: 'Fondo de Emergencia', target: 3000, current: 1200, color: '#f5cac3', icon: 'savings' },
  { id: '3', title: 'Nueva Laptop', target: 1500, current: 550, color: '#f6bd60', icon: 'savings' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', description: 'Nómina Mensual', amount: 3500, type: 'income', category: 'income', date: '2026-07-21T09:00:00.000Z' },
  { id: '2', description: 'Supermercado Mercadona', amount: 125, type: 'expense', category: 'food', date: '2026-07-21T10:30:00.000Z' },
  { id: '3', description: 'Restaurante El Almacén', amount: 45.5, type: 'expense', category: 'food', date: '2026-07-20T20:15:00.000Z' },
  { id: '4', description: 'Reputación Gasolinera Repsol', amount: 60, type: 'expense', category: 'transport', date: '2026-07-15T09:00:00.000Z' },
];

const getPreviousMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
};

export const SavingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyBudgets, setMonthlyBudgets] = useState<{[month: string]: CategoryBudget[]}>({});
  const [monthlyStartingBalances, setMonthlyStartingBalances] = useState<{[month: string]: number}>({});
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [savingGoal, setSavingGoal] = useState<number>(1000); // Default monthly savings goal: 1000€
  const [currentMonth, setCurrentMonthState] = useState<string>('2026-07');
  const [loading, setLoading] = useState<boolean>(true);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue !== null) {
          const data = JSON.parse(jsonValue);
          setTransactions(data.transactions || []);
          setMonthlyBudgets(data.monthlyBudgets || { '2026-07': INITIAL_BUDGETS });
          setMonthlyStartingBalances(data.monthlyStartingBalances || { '2026-07': 2000 });
          setSavingGoals(data.savingGoals || INITIAL_GOALS);
          setSavingGoal(data.savingGoal || 1000);
          setCurrentMonthState(data.currentMonth || '2026-07');
        } else {
          // Check for migration from V2 storage
          const v2Value = await AsyncStorage.getItem('@ahorros_app_data_v2');
          if (v2Value !== null) {
            const dataV2 = JSON.parse(v2Value);
            const defaultStartingBalances = { '2026-07': 2000 };
            setTransactions(dataV2.transactions || INITIAL_TRANSACTIONS);
            setMonthlyBudgets(dataV2.monthlyBudgets || { '2026-07': INITIAL_BUDGETS });
            setMonthlyStartingBalances(defaultStartingBalances);
            setSavingGoals(dataV2.savingGoals || INITIAL_GOALS);
            setSavingGoal(dataV2.savingGoal || 1000);
            setCurrentMonthState(dataV2.currentMonth || '2026-07');
            
            await saveData(
              dataV2.transactions || INITIAL_TRANSACTIONS,
              dataV2.monthlyBudgets || { '2026-07': INITIAL_BUDGETS },
              defaultStartingBalances,
              dataV2.savingGoals || INITIAL_GOALS,
              dataV2.savingGoal || 1000,
              dataV2.currentMonth || '2026-07'
            );
          } else {
            // New database setup
            const initialBudgets = { '2026-07': INITIAL_BUDGETS };
            const initialStartingBalances = { '2026-07': 2000 };
            setTransactions(INITIAL_TRANSACTIONS);
            setMonthlyBudgets(initialBudgets);
            setMonthlyStartingBalances(initialStartingBalances);
            setSavingGoals(INITIAL_GOALS);
            setSavingGoal(1000);
            setCurrentMonthState('2026-07');
            
            await saveData(INITIAL_TRANSACTIONS, initialBudgets, initialStartingBalances, INITIAL_GOALS, 1000, '2026-07');
          }
        }
      } catch (e) {
        console.error('Failed to load data from storage', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Save data helper
  const saveData = async (
    updatedTxs: Transaction[],
    updatedMonthlyBudgets: {[month: string]: CategoryBudget[]},
    updatedStartingBalances: {[month: string]: number},
    updatedGoals: SavingGoal[],
    updatedMonthlyGoal: number,
    month: string
  ) => {
    try {
      const dataToSave = {
        transactions: updatedTxs,
        monthlyBudgets: updatedMonthlyBudgets,
        monthlyStartingBalances: updatedStartingBalances,
        savingGoals: updatedGoals,
        savingGoal: updatedMonthlyGoal,
        currentMonth: month
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Failed to save data', e);
    }
  };

  // Change currentMonth and copy starting balances + categories if new
  const setCurrentMonth = async (month: string) => {
    let updatedMonthlyBudgets = { ...monthlyBudgets };
    let updatedStartingBalances = { ...monthlyStartingBalances };
    
    // 1. Copy starting balance
    if (updatedStartingBalances[month] === undefined) {
      const prevMonth = getPreviousMonth(month);
      const prevBalance = updatedStartingBalances[prevMonth] !== undefined ? updatedStartingBalances[prevMonth] : 2000;
      updatedStartingBalances[month] = prevBalance;
    }

    // 2. Copy categories
    if (!updatedMonthlyBudgets[month]) {
      const prevMonth = getPreviousMonth(month);
      const categoriesToCopy = updatedMonthlyBudgets[prevMonth] || INITIAL_BUDGETS;
      
      updatedMonthlyBudgets[month] = categoriesToCopy.map((cat) => ({
        ...cat,
        spent: 0,
      }));
    }

    setCurrentMonthState(month);
    setMonthlyBudgets(updatedMonthlyBudgets);
    setMonthlyStartingBalances(updatedStartingBalances);
    await saveData(transactions, updatedMonthlyBudgets, updatedStartingBalances, savingGoals, savingGoal, month);
  };

  // Filter values
  const monthTransactions = transactions.filter((tx) => tx.date.substring(0, 7) === currentMonth);
  const categoryBudgets = monthlyBudgets[currentMonth] || INITIAL_BUDGETS;
  const startingBalance = monthlyStartingBalances[currentMonth] !== undefined ? monthlyStartingBalances[currentMonth] : 2000;

  // Calculate metrics
  const totalMonthExpenses = monthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Available Spending Balance = Initial - Expenses (Huchas are separate)
  const balance = startingBalance - totalMonthExpenses;

  // Monthly savings amount (reference list)
  const savingsAmount = monthTransactions
    .filter((tx) => tx.type === 'saving')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const updateStartingBalance = async (amount: number) => {
    const updatedStartingBalances = {
      ...monthlyStartingBalances,
      [currentMonth]: amount,
    };
    setMonthlyStartingBalances(updatedStartingBalances);
    await saveData(transactions, monthlyBudgets, updatedStartingBalances, savingGoals, savingGoal, currentMonth);
  };

  // Add a new transaction
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'date'>) => {
    const activeDate = new Date();
    const [year, month] = currentMonth.split('-').map(Number);
    activeDate.setFullYear(year);
    activeDate.setMonth(month - 1);
    
    const newTx: Transaction = {
      ...tx,
      id: Date.now().toString(),
      date: activeDate.toISOString(),
    };
    const updatedTxs = [newTx, ...transactions];

    let updatedMonthlyBudgets = { ...monthlyBudgets };
    if (!updatedMonthlyBudgets[currentMonth]) {
      updatedMonthlyBudgets[currentMonth] = INITIAL_BUDGETS.map(c => ({...c, spent: 0}));
    }
    
    if (tx.type === 'expense') {
      updatedMonthlyBudgets[currentMonth] = updatedMonthlyBudgets[currentMonth].map((b) => {
        if (b.category === tx.category) {
          return { ...b, spent: Number((b.spent + tx.amount).toFixed(2)) };
        }
        return b;
      });
    }

    setTransactions(updatedTxs);
    setMonthlyBudgets(updatedMonthlyBudgets);

    await saveData(updatedTxs, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, currentMonth);
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    const txToDelete = transactions.find((tx) => tx.id === id);
    if (!txToDelete) return;

    const updatedTxs = transactions.filter((tx) => tx.id !== id);
    const txMonth = txToDelete.date.substring(0, 7);

    let updatedMonthlyBudgets = { ...monthlyBudgets };
    if (txToDelete.type === 'expense' && updatedMonthlyBudgets[txMonth]) {
      updatedMonthlyBudgets[txMonth] = updatedMonthlyBudgets[txMonth].map((b) => {
        if (b.category === txToDelete.category) {
          return { ...b, spent: Math.max(0, Number((b.spent - txToDelete.amount).toFixed(2))) };
        }
        return b;
      });
    }

    setTransactions(updatedTxs);
    setMonthlyBudgets(updatedMonthlyBudgets);

    await saveData(updatedTxs, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, currentMonth);
  };

  // Category management
  const addCategory = async (cat: Omit<CategoryBudget, 'spent'>) => {
    let updatedMonthlyBudgets = { ...monthlyBudgets };
    if (!updatedMonthlyBudgets[currentMonth]) {
      updatedMonthlyBudgets[currentMonth] = [];
    }

    const newCat: CategoryBudget = {
      ...cat,
      spent: 0,
    };
    
    updatedMonthlyBudgets[currentMonth] = [...updatedMonthlyBudgets[currentMonth], newCat];
    setMonthlyBudgets(updatedMonthlyBudgets);
    await saveData(transactions, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, currentMonth);
  };

  const updateCategory = async (categoryKey: string, updatedFields: Partial<CategoryBudget>) => {
    let updatedMonthlyBudgets = { ...monthlyBudgets };
    if (!updatedMonthlyBudgets[currentMonth]) return;

    updatedMonthlyBudgets[currentMonth] = updatedMonthlyBudgets[currentMonth].map((b) => {
      if (b.category === categoryKey) {
        return { ...b, ...updatedFields };
      }
      return b;
    });

    setMonthlyBudgets(updatedMonthlyBudgets);
    await saveData(transactions, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, currentMonth);
  };

  const deleteCategory = async (categoryKey: string) => {
    let updatedMonthlyBudgets = { ...monthlyBudgets };
    if (!updatedMonthlyBudgets[currentMonth]) return;

    updatedMonthlyBudgets[currentMonth] = updatedMonthlyBudgets[currentMonth].filter((b) => b.category !== categoryKey);
    
    const updatedTxs = transactions.map((tx) => {
      if (tx.category === categoryKey && tx.date.substring(0, 7) === currentMonth) {
        return { ...tx, category: 'other' };
      }
      return tx;
    });

    setMonthlyBudgets(updatedMonthlyBudgets);
    setTransactions(updatedTxs);
    await saveData(updatedTxs, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, currentMonth);
  };

  // Saving Goal (Huchas) management
  const addSavingGoal = async (goal: Omit<SavingGoal, 'id' | 'current'>) => {
    const newGoal: SavingGoal = {
      ...goal,
      id: Date.now().toString(),
      current: 0,
    };
    const updatedGoals = [...savingGoals, newGoal];
    setSavingGoals(updatedGoals);
    await saveData(transactions, monthlyBudgets, monthlyStartingBalances, updatedGoals, savingGoal, currentMonth);
  };

  const deleteSavingGoal = async (id: string) => {
    const updatedGoals = savingGoals.filter((g) => g.id !== id);
    setSavingGoals(updatedGoals);
    await saveData(transactions, monthlyBudgets, monthlyStartingBalances, updatedGoals, savingGoal, currentMonth);
  };

  // Contribute / withdraw from huchas (Independent of available balance)
  const updateSavingGoalProgress = async (id: string, amount: number) => {
    const updatedGoals = savingGoals.map((g) => {
      if (g.id === id) {
        return { ...g, current: Math.max(0, Number((g.current + amount).toFixed(2))) };
      }
      return g;
    });

    const goalTitle = savingGoals.find((g) => g.id === id)?.title || 'Hucha';
    const isWithdrawal = amount < 0;
    
    const activeDate = new Date();
    const [year, month] = currentMonth.split('-').map(Number);
    activeDate.setFullYear(year);
    activeDate.setMonth(month - 1);

    // Save as type 'saving' for ledger, does not impact monthly spending expenses
    const newTx: Transaction = {
      id: Date.now().toString(),
      description: isWithdrawal ? `Retirada de: ${goalTitle}` : `Ahorro para: ${goalTitle}`,
      amount: Math.abs(amount),
      type: 'saving', // Keep type saving so it does not alter balance calculations
      category: 'saving',
      date: activeDate.toISOString(),
    };

    const updatedTxs = [newTx, ...transactions];

    setSavingGoals(updatedGoals);
    setTransactions(updatedTxs);

    await saveData(updatedTxs, monthlyBudgets, monthlyStartingBalances, updatedGoals, savingGoal, currentMonth);
  };

  const updateSavingGoal = async (id: string, updatedGoal: Partial<SavingGoal>) => {
    const updatedGoals = savingGoals.map((g) => {
      if (g.id === id) {
        return { ...g, ...updatedGoal };
      }
      return g;
    });
    setSavingGoals(updatedGoals);
    await saveData(transactions, monthlyBudgets, monthlyStartingBalances, updatedGoals, savingGoal, currentMonth);
  };

  const updateMonthlyGoal = async (target: number) => {
    setSavingGoal(target);
    await saveData(transactions, monthlyBudgets, monthlyStartingBalances, savingGoals, target, currentMonth);
  };

  const resetDatabase = async () => {
    const initialBudgets = { '2026-07': INITIAL_BUDGETS };
    const initialStartingBalances = { '2026-07': 2000 };
    setTransactions(INITIAL_TRANSACTIONS);
    setMonthlyBudgets(initialBudgets);
    setMonthlyStartingBalances(initialStartingBalances);
    setSavingGoals(INITIAL_GOALS);
    setSavingGoal(1000);
    setCurrentMonthState('2026-07');
    await saveData(INITIAL_TRANSACTIONS, initialBudgets, initialStartingBalances, INITIAL_GOALS, 1000, '2026-07');
  };

  return (
    <SavingsContext.Provider
      value={{
        balance,
        startingBalance,
        savingGoal,
        savingsAmount,
        currentMonth,
        setCurrentMonth,
        transactions,
        monthTransactions,
        categoryBudgets,
        savingGoals,
        addTransaction,
        deleteTransaction,
        updateStartingBalance,
        addCategory,
        updateCategory,
        deleteCategory,
        addSavingGoal,
        deleteSavingGoal,
        updateSavingGoalProgress,
        updateSavingGoal,
        updateMonthlyGoal,
        resetDatabase,
        loading,
      }}>
      {children}
    </SavingsContext.Provider>
  );
};

export const useSavings = () => {
  const context = useContext(SavingsContext);
  if (context === undefined) {
    throw new Error('useSavings must be used within a SavingsProvider');
  }
  return context;
};
