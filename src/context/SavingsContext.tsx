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
  isTemporary?: boolean; // If true, only exists for current month and won't be copied to future months
}

export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  details?: string;
  url?: string;
  isPurchased?: boolean;
  priority?: 'low' | 'medium' | 'high';
  date: string;
  targetMonth?: string; // Optional target month for wishlist planning (e.g. "2026-09")
  category?: string; // Category key (e.g. "shopping", "entertainment", etc.)
  targetMonths?: number; // Desired timeframe to purchase in months (1-12)
}

export interface PlannedExpense {
  id: string;
  title: string;
  amount: number;
  targetMonth: string; // e.g. "2026-10"
  createdDate: string;
  categoryKey?: string;
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
  monthlyIncome: number; // Configured monthly payroll / income (default 1300€)
  updateMonthlyIncome: (amount: number) => Promise<void>;
  savingGoal: number; // Monthly savings target
  savingsAmount: number; // Total saved in active month (reference)
  initialAccumulatedSavings: number; // Initial base savings set by user
  currentMonth: string; // e.g. "2026-08"
  setCurrentMonth: (month: string) => Promise<void>;
  transactions: Transaction[];
  monthTransactions: Transaction[];
  categoryBudgets: CategoryBudget[];
  totalCategoryLimits: number;
  topSpendingCategory: CategoryBudget | null;
  savingGoals: SavingGoal[];

  // Planned Expenses (Gastos Previstos Futuros)
  plannedExpenses: PlannedExpense[];
  addPlannedExpense: (expense: Omit<PlannedExpense, 'id' | 'createdDate'>) => Promise<void>;
  updatePlannedExpense: (id: string, fields: Partial<PlannedExpense>) => Promise<void>;
  deletePlannedExpense: (id: string) => Promise<void>;

  // Wishlist (Lista de Deseos) management
  wishlist: WishlistItem[];
  totalWishlistAmount: number;
  addWishlistItem: (item: Omit<WishlistItem, 'id' | 'date'>) => Promise<void>;
  updateWishlistItem: (id: string, updatedFields: Partial<WishlistItem>) => Promise<void>;
  deleteWishlistItem: (id: string) => Promise<void>;
  toggleWishlistPurchased: (id: string) => Promise<void>;
  createGoalFromWishlist: (item: WishlistItem, months?: number) => Promise<void>;

  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
  updateTransaction: (id: string, updatedFields: Partial<Omit<Transaction, 'id'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  clearMonthTransactions: (monthStr?: string) => Promise<void>;
  
  // Starting Balance & Base Savings management
  updateStartingBalance: (amount: number) => Promise<void>;
  updateInitialAccumulatedSavings: (amount: number) => Promise<void>;
  markCategoryLimitReached: (categoryKey: string) => Promise<boolean>;
  toggleCategoryLimitReached: (categoryKey: string) => Promise<{ reached: boolean; name: string }>;

  // Category management
  addCategory: (cat: Omit<CategoryBudget, 'spent'>) => Promise<void>;
  updateCategory: (categoryKey: string, updatedFields: Partial<CategoryBudget>, scope?: 'month' | 'global') => Promise<void>;
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

const STORAGE_KEY = '@ahorros_app_data_v5'; // Clean state starting August 2026

const INITIAL_BUDGETS: CategoryBudget[] = [
  { name: 'Comida', category: 'food', limit: 350, spent: 0, color: '#84a59d', icon: 'restaurant' },
  { name: 'Hogar', category: 'home', limit: 450, spent: 0, color: '#775651', icon: 'home' },
  { name: 'Mascotas', category: 'pets', limit: 80, spent: 0, color: '#bcb8b1', icon: 'pets' },
  { name: 'Ocio y Fiestas', category: 'entertainment', limit: 100, spent: 0, color: '#b27092', icon: 'celebration' },
  { name: 'Transporte', category: 'transport', limit: 80, spent: 0, color: '#f6bd60', icon: 'directions-car' },
  { name: 'Compras', category: 'shopping', limit: 120, spent: 0, color: '#b8b8ff', icon: 'shopping-bag' },
  { name: 'Otros / General', category: 'other', limit: 88, spent: 0, color: '#504442', icon: 'more-horiz' },
];

const INITIAL_GOALS: SavingGoal[] = [];

const INITIAL_TRANSACTIONS: Transaction[] = [];

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
  const [monthlyIncome, setMonthlyIncome] = useState<number>(1300); // Configured payroll (default 1300€)
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [plannedExpenses, setPlannedExpenses] = useState<PlannedExpense[]>([]);
  const [savingGoal, setSavingGoal] = useState<number>(500); // Default monthly savings goal: 500€
  const [initialAccumulatedSavings, setInitialAccumulatedSavings] = useState<number>(0);
  const [currentMonth, setCurrentMonthState] = useState<string>('2026-08');
  const [loading, setLoading] = useState<boolean>(true);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue !== null) {
          const data = JSON.parse(jsonValue);
          setTransactions(data.transactions || []);
          setMonthlyBudgets(data.monthlyBudgets || { '2026-08': INITIAL_BUDGETS });
          setMonthlyStartingBalances(data.monthlyStartingBalances || { '2026-08': 1300 });
          setMonthlyIncome(data.monthlyIncome !== undefined ? data.monthlyIncome : 1300);
          setSavingGoals(data.savingGoals || []);
          setWishlist(data.wishlist || []);
          setPlannedExpenses(data.plannedExpenses || []);
          setSavingGoal(data.savingGoal || 500);
          setInitialAccumulatedSavings(data.initialAccumulatedSavings || 0);
          setCurrentMonthState(data.currentMonth || '2026-08');
        } else {
          // Fresh setup starting August 2026 with default starting balance 1300€ and payroll 1300€
          const initialBudgets = { '2026-08': INITIAL_BUDGETS };
          const initialStartingBalances = { '2026-08': 1300 };
          setTransactions([]);
          setMonthlyBudgets(initialBudgets);
          setMonthlyStartingBalances(initialStartingBalances);
          setMonthlyIncome(1300);
          setSavingGoals([]);
          setWishlist([]);
          setPlannedExpenses([]);
          setSavingGoal(500);
          setInitialAccumulatedSavings(0);
          setCurrentMonthState('2026-08');
          
          await saveData([], initialBudgets, initialStartingBalances, [], 500, 0, '2026-08', [], [], 1300);
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
    updatedInitialAccumulated: number,
    month: string,
    updatedWishlist: WishlistItem[] = wishlist,
    updatedPlannedExpenses: PlannedExpense[] = plannedExpenses,
    updatedMonthlyIncome: number = monthlyIncome
  ) => {
    try {
      const dataToSave = {
        transactions: updatedTxs,
        monthlyBudgets: updatedMonthlyBudgets,
        monthlyStartingBalances: updatedStartingBalances,
        monthlyIncome: updatedMonthlyIncome,
        savingGoals: updatedGoals,
        savingGoal: updatedMonthlyGoal,
        initialAccumulatedSavings: updatedInitialAccumulated,
        currentMonth: month,
        wishlist: updatedWishlist,
        plannedExpenses: updatedPlannedExpenses,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Failed to save data', e);
    }
  };

  const updateMonthlyIncome = async (amount: number) => {
    setMonthlyIncome(amount);
    await saveData(
      transactions,
      monthlyBudgets,
      monthlyStartingBalances,
      savingGoals,
      savingGoal,
      initialAccumulatedSavings,
      currentMonth,
      wishlist,
      plannedExpenses,
      amount
    );
  };

  // Change currentMonth and copy starting balances + categories if new
  const setCurrentMonth = async (month: string) => {
    let updatedMonthlyBudgets = { ...monthlyBudgets };
    let updatedStartingBalances = { ...monthlyStartingBalances };
    
    // 1. Ensure categories exist for target month, copying ONLY FIXED category definitions if missing
    const referenceMonth = currentMonth && updatedMonthlyBudgets[currentMonth] ? currentMonth : Object.keys(updatedMonthlyBudgets)[0];
    const masterCategories = updatedMonthlyBudgets[referenceMonth] || INITIAL_BUDGETS;
    const fixedMasterCategories = masterCategories.filter((c) => !c.isTemporary);

    if (!updatedMonthlyBudgets[month]) {
      updatedMonthlyBudgets[month] = fixedMasterCategories.map((cat) => ({
        ...cat,
        spent: 0,
      }));
    } else {
      // Sync missing fixed category definitions
      const existingInTarget = [...updatedMonthlyBudgets[month]];
      fixedMasterCategories.forEach((mCat) => {
        if (!existingInTarget.some((b) => b.category === mCat.category)) {
          existingInTarget.push({ ...mCat, spent: 0 });
        }
      });
      updatedMonthlyBudgets[month] = existingInTarget;
    }

    // 2. Default starting balance automatically equals configured payroll (monthlyIncome) if missing
    if (updatedStartingBalances[month] === undefined) {
      updatedStartingBalances[month] = monthlyIncome || 1300;
    }

    setCurrentMonthState(month);
    setMonthlyBudgets(updatedMonthlyBudgets);
    setMonthlyStartingBalances(updatedStartingBalances);
    await saveData(transactions, updatedMonthlyBudgets, updatedStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, month);
  };

  // Filter values
  const monthTransactions = transactions.filter((tx) => tx.date.substring(0, 7) === currentMonth);
  const categoryBudgets = monthlyBudgets[currentMonth] || INITIAL_BUDGETS;

  // Total sum of category budget limits for the current month
  const totalCategoryLimits = categoryBudgets.reduce((sum, b) => sum + (b.limit || 0), 0);

  // Starting balance: If set explicitly for month, use it directly (allowing values lower than category limits). Otherwise fallback to monthlyIncome (1300€).
  const rawStartingBalance = monthlyStartingBalances[currentMonth];
  const startingBalance = rawStartingBalance !== undefined ? rawStartingBalance : (monthlyIncome || 1300);

  // Top spending category in current month
  const topSpendingCategory = React.useMemo(() => {
    const sorted = [...categoryBudgets].filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
    return sorted.length > 0 ? sorted[0] : null;
  }, [categoryBudgets]);

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
    await saveData(transactions, monthlyBudgets, updatedStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, currentMonth);
  };

  const updateInitialAccumulatedSavings = async (amount: number) => {
    setInitialAccumulatedSavings(amount);
    await saveData(transactions, monthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, amount, currentMonth);
  };

  const toggleCategoryLimitReached = async (categoryKey: string): Promise<{ reached: boolean; name: string }> => {
    let updatedMonthlyBudgets = { ...monthlyBudgets };
    const currentCats = updatedMonthlyBudgets[currentMonth] || INITIAL_BUDGETS;
    const cat = currentCats.find((b) => b.category === categoryKey);
    if (!cat) return { reached: false, name: '' };

    const isCurrentlyReached = cat.spent >= cat.limit;

    if (isCurrentlyReached) {
      // UNDO limit reached: remove auto-created limit transaction for this category in current month
      const limitTx = transactions.find(
        (tx) =>
          tx.category === categoryKey &&
          tx.date.substring(0, 7) === currentMonth &&
          tx.description.startsWith('Límite alcanzado')
      );

      let updatedTxs = transactions;
      let removedAmount = 0;

      if (limitTx) {
        updatedTxs = transactions.filter((tx) => tx.id !== limitTx.id);
        removedAmount = limitTx.amount;
      }

      updatedMonthlyBudgets[currentMonth] = currentCats.map((b) => {
        if (b.category === categoryKey) {
          return { ...b, spent: Math.max(0, Number((b.spent - removedAmount).toFixed(2))) };
        }
        return b;
      });

      setTransactions(updatedTxs);
      setMonthlyBudgets(updatedMonthlyBudgets);
      await saveData(updatedTxs, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, currentMonth);
      return { reached: false, name: cat.name };
    } else {
      // SET limit reached
      const remaining = cat.limit - cat.spent;
      if (remaining <= 0) return { reached: true, name: cat.name };

      const activeDate = new Date();
      const [year, month] = currentMonth.split('-').map(Number);
      activeDate.setFullYear(year);
      activeDate.setMonth(month - 1);

      const newTx: Transaction = {
        id: Date.now().toString(),
        description: `Límite alcanzado: ${cat.name}`,
        amount: Number(remaining.toFixed(2)),
        type: 'expense',
        category: categoryKey,
        date: activeDate.toISOString(),
      };

      const updatedTxs = [newTx, ...transactions];
      updatedMonthlyBudgets[currentMonth] = currentCats.map((b) => {
        if (b.category === categoryKey) {
          return { ...b, spent: b.limit };
        }
        return b;
      });

      setTransactions(updatedTxs);
      setMonthlyBudgets(updatedMonthlyBudgets);
      await saveData(updatedTxs, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, currentMonth);
      return { reached: true, name: cat.name };
    }
  };

  const markCategoryLimitReached = async (categoryKey: string): Promise<boolean> => {
    const res = await toggleCategoryLimitReached(categoryKey);
    return res.reached;
  };

  // Add a new transaction
  const addTransaction = async (tx: Omit<Transaction, 'id' | 'date'>) => {
    const activeDate = new Date();
    const [year, month] = currentMonth.split('-').map(Number);
    activeDate.setFullYear(year);
    activeDate.setMonth(month - 1);
    
    const targetCategory = tx.category || 'other';

    const newTx: Transaction = {
      ...tx,
      category: targetCategory,
      id: Date.now().toString(),
      date: activeDate.toISOString(),
    };
    const updatedTxs = [newTx, ...transactions];

    let updatedMonthlyBudgets = { ...monthlyBudgets };
    if (!updatedMonthlyBudgets[currentMonth]) {
      updatedMonthlyBudgets[currentMonth] = INITIAL_BUDGETS.map(c => ({...c, spent: 0}));
    }
    
    if (tx.type === 'expense') {
      let matched = false;
      updatedMonthlyBudgets[currentMonth] = updatedMonthlyBudgets[currentMonth].map((b) => {
        if (b.category === targetCategory) {
          matched = true;
          return { ...b, spent: Number((b.spent + tx.amount).toFixed(2)) };
        }
        return b;
      });

      // If category is not currently in current month's budget list, append it automatically
      if (!matched) {
        const isOther = targetCategory === 'other';
        const newCat: CategoryBudget = {
          name: isOther ? 'Otros / General' : targetCategory,
          category: targetCategory,
          limit: 200,
          spent: Number(tx.amount.toFixed(2)),
          color: '#504442',
          icon: 'more-horiz',
        };
        updatedMonthlyBudgets[currentMonth] = [...updatedMonthlyBudgets[currentMonth], newCat];
      }
    }

    setTransactions(updatedTxs);
    setMonthlyBudgets(updatedMonthlyBudgets);

    await saveData(updatedTxs, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, currentMonth);
  };

  // Update existing transaction
  const updateTransaction = async (id: string, updatedFields: Partial<Omit<Transaction, 'id'>>) => {
    const oldTx = transactions.find((tx) => tx.id === id);
    if (!oldTx) return;

    const txMonth = oldTx.date.substring(0, 7);
    let updatedMonthlyBudgets = { ...monthlyBudgets };

    // Revert old expense effect
    if (oldTx.type === 'expense' && updatedMonthlyBudgets[txMonth]) {
      updatedMonthlyBudgets[txMonth] = updatedMonthlyBudgets[txMonth].map((b) => {
        if (b.category === oldTx.category) {
          return { ...b, spent: Math.max(0, Number((b.spent - oldTx.amount).toFixed(2))) };
        }
        return b;
      });
    }

    const newTx: Transaction = {
      ...oldTx,
      ...updatedFields,
    };

    const updatedTxs = transactions.map((tx) => (tx.id === id ? newTx : tx));

    // Apply new expense effect
    if (newTx.type === 'expense' && updatedMonthlyBudgets[txMonth]) {
      let matched = false;
      updatedMonthlyBudgets[txMonth] = updatedMonthlyBudgets[txMonth].map((b) => {
        if (b.category === newTx.category) {
          matched = true;
          return { ...b, spent: Number((b.spent + newTx.amount).toFixed(2)) };
        }
        return b;
      });

      if (!matched && newTx.category) {
        const isOther = newTx.category === 'other';
        updatedMonthlyBudgets[txMonth].push({
          name: isOther ? 'Otros / General' : newTx.category,
          category: newTx.category,
          limit: 200,
          spent: Number(newTx.amount.toFixed(2)),
          color: '#504442',
          icon: 'more-horiz',
        });
      }
    }

    setTransactions(updatedTxs);
    setMonthlyBudgets(updatedMonthlyBudgets);
    await saveData(updatedTxs, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, currentMonth);
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

    await saveData(updatedTxs, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, currentMonth);
  };

  // Clear all transactions for a specific month (resets category spent to 0)
  const clearMonthTransactions = async (monthStr?: string) => {
    const targetMonth = monthStr || currentMonth;
    const updatedTxs = transactions.filter((tx) => tx.date.substring(0, 7) !== targetMonth);

    let updatedMonthlyBudgets = { ...monthlyBudgets };
    if (updatedMonthlyBudgets[targetMonth]) {
      updatedMonthlyBudgets[targetMonth] = updatedMonthlyBudgets[targetMonth].map((b) => ({
        ...b,
        spent: 0,
      }));
    }

    setTransactions(updatedTxs);
    setMonthlyBudgets(updatedMonthlyBudgets);
    await saveData(updatedTxs, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, currentMonth);
  };

  // Category management (Supports Fixed vs Temporary categories)
  const addCategory = async (cat: Omit<CategoryBudget, 'spent'>) => {
    let updatedMonthlyBudgets = { ...monthlyBudgets };

    if (cat.isTemporary) {
      // Temporary category: Add ONLY to current month
      const existingList = updatedMonthlyBudgets[currentMonth] || [];
      if (!existingList.some((b) => b.category === cat.category)) {
        updatedMonthlyBudgets[currentMonth] = [...existingList, { ...cat, spent: 0 }];
      }
    } else {
      // Fixed category: Sync across all existing months as template
      const monthKeys = Array.from(new Set([...Object.keys(updatedMonthlyBudgets), currentMonth]));
      monthKeys.forEach((mKey) => {
        const existingList = updatedMonthlyBudgets[mKey] || [];
        if (!existingList.some((b) => b.category === cat.category)) {
          updatedMonthlyBudgets[mKey] = [...existingList, { ...cat, spent: 0 }];
        }
      });
    }

    setMonthlyBudgets(updatedMonthlyBudgets);
    await saveData(transactions, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, currentMonth);
  };

  const updateCategory = async (
    categoryKey: string,
    updatedFields: Partial<CategoryBudget>,
    scope: 'month' | 'global' = 'global'
  ) => {
    let updatedMonthlyBudgets = { ...monthlyBudgets };
    const currentCats = updatedMonthlyBudgets[currentMonth] || [];
    const targetCat = currentCats.find((b) => b.category === categoryKey);
    const isTemp = updatedFields.isTemporary !== undefined ? updatedFields.isTemporary : targetCat?.isTemporary;

    if (scope === 'month' || isTemp) {
      // Month scope or temporary category: update ONLY in currentMonth
      if (updatedMonthlyBudgets[currentMonth]) {
        updatedMonthlyBudgets[currentMonth] = updatedMonthlyBudgets[currentMonth].map((b) => {
          if (b.category === categoryKey) {
            return { ...b, ...updatedFields };
          }
          return b;
        });
      }
    } else {
      // Global scope for fixed category: sync updates across all months
      Object.keys(updatedMonthlyBudgets).forEach((mKey) => {
        if (updatedMonthlyBudgets[mKey]) {
          updatedMonthlyBudgets[mKey] = updatedMonthlyBudgets[mKey].map((b) => {
            if (b.category === categoryKey) {
              return { ...b, ...updatedFields };
            }
            return b;
          });
        }
      });
    }

    setMonthlyBudgets(updatedMonthlyBudgets);
    await saveData(transactions, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, currentMonth);
  };

  const deleteCategory = async (categoryKey: string) => {
    let updatedMonthlyBudgets = { ...monthlyBudgets };
    const currentCats = updatedMonthlyBudgets[currentMonth] || [];
    const catToDelete = currentCats.find((b) => b.category === categoryKey);

    if (catToDelete?.isTemporary) {
      // Temporary category: Delete ONLY from currentMonth
      if (updatedMonthlyBudgets[currentMonth]) {
        updatedMonthlyBudgets[currentMonth] = updatedMonthlyBudgets[currentMonth].filter((b) => b.category !== categoryKey);
      }
    } else {
      // Fixed category: Delete across all months
      Object.keys(updatedMonthlyBudgets).forEach((mKey) => {
        if (updatedMonthlyBudgets[mKey]) {
          updatedMonthlyBudgets[mKey] = updatedMonthlyBudgets[mKey].filter((b) => b.category !== categoryKey);
        }
      });
    }

    const updatedTxs = transactions.map((tx) => {
      if (tx.category === categoryKey) {
        return { ...tx, category: 'other' };
      }
      return tx;
    });

    setMonthlyBudgets(updatedMonthlyBudgets);
    setTransactions(updatedTxs);
    await saveData(updatedTxs, updatedMonthlyBudgets, monthlyStartingBalances, savingGoals, savingGoal, initialAccumulatedSavings, currentMonth);
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
    await saveData(transactions, monthlyBudgets, monthlyStartingBalances, updatedGoals, savingGoal, initialAccumulatedSavings, currentMonth);
  };

  const deleteSavingGoal = async (id: string) => {
    const updatedGoals = savingGoals.filter((g) => g.id !== id);
    setSavingGoals(updatedGoals);
    await saveData(transactions, monthlyBudgets, monthlyStartingBalances, updatedGoals, savingGoal, initialAccumulatedSavings, currentMonth);
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

    await saveData(updatedTxs, monthlyBudgets, monthlyStartingBalances, updatedGoals, savingGoal, initialAccumulatedSavings, currentMonth);
  };

  const updateSavingGoal = async (id: string, updatedGoal: Partial<SavingGoal>) => {
    const updatedGoals = savingGoals.map((g) => {
      if (g.id === id) {
        return { ...g, ...updatedGoal };
      }
      return g;
    });
    setSavingGoals(updatedGoals);
    await saveData(transactions, monthlyBudgets, monthlyStartingBalances, updatedGoals, savingGoal, initialAccumulatedSavings, currentMonth);
  };

  const updateMonthlyGoal = async (target: number) => {
    setSavingGoal(target);
    await saveData(transactions, monthlyBudgets, monthlyStartingBalances, savingGoals, target, initialAccumulatedSavings, currentMonth);
  };

  // Wishlist CRUD logic
  const totalWishlistAmount = wishlist
    .filter((w) => !w.isPurchased)
    .reduce((sum, w) => sum + (w.price || 0), 0);

  const addWishlistItem = async (item: Omit<WishlistItem, 'id' | 'date'>) => {
    const newItem: WishlistItem = {
      ...item,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    const updatedWishlist = [newItem, ...wishlist];
    setWishlist(updatedWishlist);
    await saveData(
      transactions,
      monthlyBudgets,
      monthlyStartingBalances,
      savingGoals,
      savingGoal,
      initialAccumulatedSavings,
      currentMonth,
      updatedWishlist
    );
  };

  const updateWishlistItem = async (id: string, updatedFields: Partial<WishlistItem>) => {
    const updatedWishlist = wishlist.map((w) => {
      if (w.id === id) {
        return { ...w, ...updatedFields };
      }
      return w;
    });
    setWishlist(updatedWishlist);
    await saveData(
      transactions,
      monthlyBudgets,
      monthlyStartingBalances,
      savingGoals,
      savingGoal,
      initialAccumulatedSavings,
      currentMonth,
      updatedWishlist
    );
  };

  const deleteWishlistItem = async (id: string) => {
    const updatedWishlist = wishlist.filter((w) => w.id !== id);
    setWishlist(updatedWishlist);
    await saveData(
      transactions,
      monthlyBudgets,
      monthlyStartingBalances,
      savingGoals,
      savingGoal,
      initialAccumulatedSavings,
      currentMonth,
      updatedWishlist
    );
  };

  const toggleWishlistPurchased = async (id: string) => {
    const updatedWishlist = wishlist.map((w) => {
      if (w.id === id) {
        return { ...w, isPurchased: !w.isPurchased };
      }
      return w;
    });
    setWishlist(updatedWishlist);
    await saveData(
      transactions,
      monthlyBudgets,
      monthlyStartingBalances,
      savingGoals,
      savingGoal,
      initialAccumulatedSavings,
      currentMonth,
      updatedWishlist
    );
  };

  const createGoalFromWishlist = async (item: WishlistItem, months: number = 3) => {
    const newGoal: SavingGoal = {
      id: Date.now().toString(),
      title: item.title,
      target: item.price,
      current: 0,
      color: '#b27092',
      icon: 'favorite',
    };
    const updatedGoals = [...savingGoals, newGoal];
    setSavingGoals(updatedGoals);
    await saveData(
      transactions,
      monthlyBudgets,
      monthlyStartingBalances,
      updatedGoals,
      savingGoal,
      initialAccumulatedSavings,
      currentMonth,
      wishlist,
      plannedExpenses
    );
  };

  // Planned Expenses (Gastos Previstos Futuros) CRUD
  const addPlannedExpense = async (expense: Omit<PlannedExpense, 'id' | 'createdDate'>) => {
    const categoryKey = `planned-${Date.now()}`;
    const newExpense: PlannedExpense = {
      ...expense,
      id: Date.now().toString(),
      createdDate: new Date().toISOString(),
      categoryKey,
    };

    const updatedPlanned = [...plannedExpenses, newExpense];

    // Automatically create a TEMPORARY category in targetMonth's budgets!
    let updatedMonthlyBudgets = { ...monthlyBudgets };
    const targetMonth = expense.targetMonth;
    const existingCats = updatedMonthlyBudgets[targetMonth] || INITIAL_BUDGETS.map((c) => ({ ...c, spent: 0 }));

    const newTempCategory: CategoryBudget = {
      name: expense.title,
      category: categoryKey,
      limit: expense.amount,
      spent: 0,
      color: '#775651',
      icon: 'event',
      isTemporary: true,
    };

    updatedMonthlyBudgets[targetMonth] = [...existingCats, newTempCategory];

    setPlannedExpenses(updatedPlanned);
    setMonthlyBudgets(updatedMonthlyBudgets);

    await saveData(
      transactions,
      updatedMonthlyBudgets,
      monthlyStartingBalances,
      savingGoals,
      savingGoal,
      initialAccumulatedSavings,
      currentMonth,
      wishlist,
      updatedPlanned
    );
  };

  const updatePlannedExpense = async (id: string, fields: Partial<PlannedExpense>) => {
    const targetExp = plannedExpenses.find((p) => p.id === id);
    if (!targetExp) return;

    const updatedPlanned = plannedExpenses.map((p) => {
      if (p.id === id) {
        return { ...p, ...fields };
      }
      return p;
    });

    let updatedMonthlyBudgets = { ...monthlyBudgets };

    // Update corresponding temporary category limit or name if title or amount changed
    if (targetExp.categoryKey && targetExp.targetMonth && updatedMonthlyBudgets[targetExp.targetMonth]) {
      updatedMonthlyBudgets[targetExp.targetMonth] = updatedMonthlyBudgets[targetExp.targetMonth].map((b) => {
        if (b.category === targetExp.categoryKey) {
          return {
            ...b,
            name: fields.title !== undefined ? fields.title : b.name,
            limit: fields.amount !== undefined ? fields.amount : b.limit,
          };
        }
        return b;
      });
    }

    setPlannedExpenses(updatedPlanned);
    setMonthlyBudgets(updatedMonthlyBudgets);

    await saveData(
      transactions,
      updatedMonthlyBudgets,
      monthlyStartingBalances,
      savingGoals,
      savingGoal,
      initialAccumulatedSavings,
      currentMonth,
      wishlist,
      updatedPlanned
    );
  };

  const deletePlannedExpense = async (id: string) => {
    const targetExp = plannedExpenses.find((p) => p.id === id);
    const updatedPlanned = plannedExpenses.filter((p) => p.id !== id);

    let updatedMonthlyBudgets = { ...monthlyBudgets };
    if (targetExp?.categoryKey && targetExp.targetMonth && updatedMonthlyBudgets[targetExp.targetMonth]) {
      updatedMonthlyBudgets[targetExp.targetMonth] = updatedMonthlyBudgets[targetExp.targetMonth].filter(
        (b) => b.category !== targetExp.categoryKey
      );
    }

    setPlannedExpenses(updatedPlanned);
    setMonthlyBudgets(updatedMonthlyBudgets);

    await saveData(
      transactions,
      updatedMonthlyBudgets,
      monthlyStartingBalances,
      savingGoals,
      savingGoal,
      initialAccumulatedSavings,
      currentMonth,
      wishlist,
      updatedPlanned
    );
  };

  const resetDatabase = async () => {
    const initialBudgets = { '2026-08': INITIAL_BUDGETS };
    const initialStartingBalances = { '2026-08': 1300 };
    setTransactions([]);
    setMonthlyBudgets(initialBudgets);
    setMonthlyStartingBalances(initialStartingBalances);
    setMonthlyIncome(1300);
    setSavingGoals([]);
    setWishlist([]);
    setPlannedExpenses([]);
    setSavingGoal(500);
    setInitialAccumulatedSavings(0);
    setCurrentMonthState('2026-08');
    await saveData([], initialBudgets, initialStartingBalances, [], 500, 0, '2026-08', [], [], 1300);
  };

  return (
    <SavingsContext.Provider
      value={{
        balance,
        startingBalance,
        monthlyIncome,
        updateMonthlyIncome,
        savingGoal,
        savingsAmount,
        initialAccumulatedSavings,
        currentMonth,
        setCurrentMonth,
        transactions,
        monthTransactions,
        categoryBudgets,
        totalCategoryLimits,
        topSpendingCategory,
        savingGoals,
        plannedExpenses,
        addPlannedExpense,
        updatePlannedExpense,
        deletePlannedExpense,
        wishlist,
        totalWishlistAmount,
        addWishlistItem,
        updateWishlistItem,
        deleteWishlistItem,
        toggleWishlistPurchased,
        createGoalFromWishlist,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        clearMonthTransactions,
        updateStartingBalance,
        updateInitialAccumulatedSavings,
        markCategoryLimitReached,
        toggleCategoryLimitReached,
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
