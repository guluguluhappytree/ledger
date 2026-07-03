import { useState } from "react";
import type { AppSettings, BudgetPlan } from "../types";
import { calcBudgetStatus, calcSavingsMonthlyTarget, suggestBudget } from "../finance";
import { formatMoney } from "../utils";
import type { Transaction } from "../types";

export function PlanPage({
  settings,
  transactions,
  onUpdateIncome,
  onUpdateSavings,
  onUpdateBudget,
}: {
  settings: AppSettings;
  transactions: Transaction[];
  onUpdateIncome: (n: number) => void;
  onUpdateSavings: (n: number) => void;
  onUpdateBudget: (b: BudgetPlan) => void;
}) {
  const [income, setIncome] = useState(String(settings.monthlyIncome));
  const [savings, setSavings] = useState(String(settings.totalSavings));
  const status = calcBudgetStatus(settings, transactions);
  const { budget } = settings;

  const applySmartBudget = () => {
    const inc = parseFloat(income) || settings.monthlyIncome;
    onUpdateBudget(suggestBudget(inc));
  };

  const saveIncome = () => {
    const n = parseFloat(income);
    if (n > 0) onUpdateIncome(n);
  };

  const saveSavings = () => {
    onUpdateSavings(parseFloat(savings) || 0);
  };

  const setBudgetField = (field: keyof BudgetPlan, value: number) => {
    const next = { ...budget, [field]: value };
    const total = next.needsPercent + next.wantsPercent + next.savingsPercent;
    if (total <= 100) onUpdateBudget(next);
  };

  return (
    <div className="fade-in stack">
      <div className="card">
        <div className="section-title">收入与储蓄</div>
        <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>月收入</label>
        <div style={{ display: "flex", gap: 8, margin: "6px 0 12px" }}>
          <input className="input" type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
          <button className="btn btn--ghost" style={{ width: "auto", whiteSpace: "nowrap" }} onClick={saveIncome}>保存</button>
        </div>
        <label style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>总储蓄</label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input className="input" type="number" value={savings} onChange={(e) => setSavings(e.target.value)} />
          <button className="btn btn--ghost" style={{ width: "auto", whiteSpace: "nowrap" }} onClick={saveSavings}>保存</button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>预算分配（50/30/20 法则）</div>
          <button className="btn btn--ghost" style={{ width: "auto", padding: "6px 10px", fontSize: "0.75rem" }} onClick={applySmartBudget}>
            智能推荐
          </button>
        </div>

        {(["needsPercent", "wantsPercent", "savingsPercent"] as const).map((key, i) => {
          const labels = ["必要支出", "弹性消费", "储蓄投资"];
          const amounts = [status.needsBudget, status.wantsBudget, status.savingsBudget];
          return (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: 4 }}>
                <span>{labels[i]}</span>
                <span>{budget[key]}% · ¥{formatMoney(amounts[i])}</span>
              </div>
              <input
                type="range"
                min={5}
                max={80}
                value={budget[key]}
                onChange={(e) => setBudgetField(key, parseInt(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)" }}
              />
            </div>
          );
        })}
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
          合计 {budget.needsPercent + budget.wantsPercent + budget.savingsPercent}%（需 ≤ 100%）
        </p>
      </div>

      <div className="card">
        <div className="section-title">储蓄计划</div>
        <div className="stat-row">
          <div className="stat">
            <div className="stat__value">¥{formatMoney(calcSavingsMonthlyTarget(settings.monthlyIncome, budget))}</div>
            <div className="stat__label">每月应存</div>
          </div>
          <div className="stat">
            <div className="stat__value">¥{formatMoney(settings.savingsGoal.targetAmount)}</div>
            <div className="stat__label">年度目标</div>
          </div>
          <div className="stat">
            <div className="stat__value" style={{ color: "var(--accent)" }}>
              {settings.savingsGoal.targetAmount > 0
                ? Math.round((settings.totalSavings / settings.savingsGoal.targetAmount) * 100)
                : 0}%
            </div>
            <div className="stat__label">完成度</div>
          </div>
        </div>
      </div>
    </div>
  );
}
