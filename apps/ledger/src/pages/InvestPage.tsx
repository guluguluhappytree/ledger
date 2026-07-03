import type { AppSettings } from "../types";
import type { Transaction } from "../types";
import { getInvestAdvice } from "../finance";
import { formatMoney } from "../utils";

export function InvestPage({
  settings,
  transactions,
}: {
  settings: AppSettings;
  transactions: Transaction[];
}) {
  const advice = getInvestAdvice(settings, transactions);

  const levelColors: Record<string, string> = {
    emergency: "#d9730d",
    stable: "#0f7b6c",
    balanced: "#2383e2",
    growth: "#9065b0",
  };

  return (
    <div className="fade-in">
      <div className="card" style={{ borderLeft: `4px solid ${levelColors[advice.level]}` }}>
        <div style={{ fontSize: "0.75rem", color: levelColors[advice.level], fontWeight: 600, marginBottom: 4 }}>
          当前阶段
        </div>
        <div style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8 }}>{advice.title}</div>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{advice.summary}</p>
      </div>

      <div className="card">
        <div className="section-title">推荐产品</div>
        {advice.products.map((p) => (
          <div key={p.name} className="advice-card">
            <div className="advice-card__name">{p.name}</div>
            <div className="advice-card__desc">{p.desc}</div>
            <div className="advice-card__risk">风险等级：{p.risk}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-title">理财建议</div>
        <ul className="tip-list">
          {advice.tips.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="notice" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
        ⚠️ 以上仅为基于你储蓄水平的通用参考，不构成投资建议。投资有风险，决策需谨慎。
      </div>

      <div className="card">
        <div className="section-title">你的财务快照</div>
        <div style={{ fontSize: "0.875rem", lineHeight: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>总储蓄</span>
            <span>¥{formatMoney(settings.totalSavings)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>月收入</span>
            <span>¥{formatMoney(settings.monthlyIncome)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>建议应急金</span>
            <span>¥{formatMoney(settings.monthlyIncome * 6)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
