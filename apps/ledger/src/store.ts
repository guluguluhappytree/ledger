import { useCallback, useEffect, useState } from "react";
import { useCloudPush } from "lifestyle-sync";
import type { AppSettings, AppState, BudgetPlan, Transaction } from "./types";
import { DEFAULT_BUDGET, STORAGE_KEY } from "./types";
import { createId, todayStr } from "./utils";
import { suggestBudget, updateSavingsGoal } from "./finance";
import type { Category, PaymentMethod } from "./types";
import type { ParsedImportRow } from "./utils";

let applyRemoteState: ((state: AppState) => void) | null = null;

export function applyRemotePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return;
  applyRemoteState?.(payload as AppState);
}

function createInitialState(): AppState {
  return {
    settings: {
      monthlyIncome: 0,
      totalSavings: 0,
      budget: DEFAULT_BUDGET,
      savingsGoal: { targetAmount: 0, currentAmount: 0, monthlyTarget: 0 },
      setupComplete: false,
    },
    transactions: [],
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return JSON.parse(raw) as AppState;
  } catch {
    return createInitialState();
  }
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useLedgerStore() {
  const [state, setStateRaw] = useState<AppState>(loadState);

  useEffect(() => {
    applyRemoteState = (data) => setStateRaw(data);
    return () => {
      applyRemoteState = null;
    };
  }, []);

  useCloudPush(STORAGE_KEY, state);

  const setState = useCallback((updater: AppState | ((prev: AppState) => AppState)) => {
    setStateRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setup = useCallback(
    (monthlyIncome: number, totalSavings: number) => {
      const budget = suggestBudget(monthlyIncome);
      const savingsGoal = updateSavingsGoal(monthlyIncome, budget, {
        targetAmount: 0,
        currentAmount: totalSavings,
        monthlyTarget: 0,
      });
      setState({
        settings: {
          monthlyIncome,
          totalSavings,
          budget,
          savingsGoal,
          setupComplete: true,
        },
        transactions: [],
      });
    },
    [setState]
  );

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }));
    },
    [setState]
  );

  const updateBudget = useCallback(
    (budget: BudgetPlan) => {
      setState((prev) => {
        const savingsGoal = updateSavingsGoal(prev.settings.monthlyIncome, budget, prev.settings.savingsGoal);
        return {
          ...prev,
          settings: { ...prev.settings, budget, savingsGoal },
        };
      });
    },
    [setState]
  );

  const addTransaction = useCallback(
    (data: {
      amount: number;
      category: Category;
      paymentMethod: PaymentMethod;
      note?: string;
      date?: string;
      source?: Transaction["source"];
    }) => {
      const tx: Transaction = {
        id: createId(),
        amount: data.amount,
        category: data.category,
        paymentMethod: data.paymentMethod,
        note: data.note ?? "",
        date: data.date ?? todayStr(),
        source: data.source ?? "manual",
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        transactions: [tx, ...prev.transactions],
      }));
      return tx;
    },
    [setState]
  );

  const importTransactions = useCallback(
    (rows: ParsedImportRow[]) => {
      const newTx: Transaction[] = rows.map((r) => ({
        id: createId(),
        amount: r.amount,
        category: r.category,
        paymentMethod: r.paymentMethod,
        note: r.note,
        date: r.date,
        source: "import" as const,
        createdAt: new Date().toISOString(),
      }));
      setState((prev) => ({
        ...prev,
        transactions: [...newTx, ...prev.transactions],
      }));
      return newTx.length;
    },
    [setState]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      }));
    },
    [setState]
  );

  return {
    state,
    setup,
    updateSettings,
    updateBudget,
    addTransaction,
    importTransactions,
    deleteTransaction,
  };
}
