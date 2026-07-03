import { useState } from "react";

export function SetupPage({ onComplete }: { onComplete: (income: number, savings: number) => void }) {
  const [income, setIncome] = useState("");
  const [savings, setSavings] = useState("");

  return (
    <div className="stack fade-in" style={{ padding: 16 }}>
      <div className="notice">
        支付宝/微信出于隐私保护，不允许第三方 App 自动读取消费记录。本 App 支持快捷记账 + 账单导入，并根据你的收入智能规划预算与理财。
      </div>

      <div className="card">
        <div className="section-title">每月税后收入（元）</div>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          placeholder="例如 12000"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="section-title">当前总储蓄（元）</div>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          placeholder="例如 50000"
          value={savings}
          onChange={(e) => setSavings(e.target.value)}
        />
      </div>

      <button
        className="btn btn--primary"
        onClick={() => onComplete(parseFloat(income) || 0, parseFloat(savings) || 0)}
        disabled={!income || parseFloat(income) <= 0}
      >
        开始智能记账
      </button>
    </div>
  );
}
