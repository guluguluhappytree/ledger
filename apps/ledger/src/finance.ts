import type { AppSettings, BudgetPlan, SavingsGoal, Transaction } from "./types";
import { NEEDS_CATEGORIES, WANTS_CATEGORIES } from "./types";
import { formatMoney, isCurrentMonth, sumAmount } from "./utils";

export interface BudgetStatus {
  income: number;
  spent: number;
  remaining: number;
  needsBudget: number;
  wantsBudget: number;
  savingsBudget: number;
  needsSpent: number;
  wantsSpent: number;
  savingsActual: number;
  needsPercent: number;
  wantsPercent: number;
}

export function calcBudgetStatus(
  settings: AppSettings,
  transactions: Transaction[]
): BudgetStatus {
  const monthTx = transactions.filter((t) => isCurrentMonth(t.date));
  const spent = sumAmount(monthTx);
  const income = settings.monthlyIncome;
  const { needsPercent, wantsPercent, savingsPercent } = settings.budget;

  const needsBudget = (income * needsPercent) / 100;
  const wantsBudget = (income * wantsPercent) / 100;
  const savingsBudget = (income * savingsPercent) / 100;

  const needsSpent = sumAmount(monthTx.filter((t) => NEEDS_CATEGORIES.includes(t.category)));
  const wantsSpent = sumAmount(monthTx.filter((t) => WANTS_CATEGORIES.includes(t.category)));
  const savingsActual = Math.max(0, income - spent);

  return {
    income,
    spent,
    remaining: income - spent,
    needsBudget,
    wantsBudget,
    savingsBudget,
    needsSpent,
    wantsSpent,
    savingsActual,
    needsPercent: needsBudget > 0 ? Math.round((needsSpent / needsBudget) * 100) : 0,
    wantsPercent: wantsBudget > 0 ? Math.round((wantsSpent / wantsBudget) * 100) : 0,
  };
}

export interface InvestAdvice {
  level: "emergency" | "stable" | "balanced" | "growth";
  title: string;
  summary: string;
  products: { name: string; desc: string; risk: string }[];
  tips: string[];
}

export function getInvestAdvice(
  settings: AppSettings,
  transactions: Transaction[]
): InvestAdvice {
  const status = calcBudgetStatus(settings, transactions);
  const monthlyExpense = status.spent || settings.monthlyIncome * 0.6;
  const emergencyTarget = monthlyExpense * 6;
  const savings = settings.totalSavings;
  const ratio = emergencyTarget > 0 ? savings / emergencyTarget : 0;

  if (ratio < 0.5) {
    return {
      level: "emergency",
      title: "先建立应急金",
      summary: `建议至少储备 ${formatMoney(emergencyTarget)} 元（约 6 个月支出）。当前 ${formatMoney(savings)} 元，优先保障流动性。`,
      products: [
        { name: "货币基金", desc: "余额宝、零钱通等，随用随取", risk: "极低" },
        { name: "银行活期+", desc: "部分银行 T+0 理财，收益略高于活期", risk: "低" },
      ],
      tips: [
        "每月先存后花，自动转入货币基金",
        "应急金未达标前，暂不追求高收益",
        "支付宝/微信支出尽量控制在本月预算内",
      ],
    };
  }

  if (ratio < 1) {
    return {
      level: "stable",
      title: "稳健增值阶段",
      summary: `应急金接近目标。可在保留 3–6 个月生活费后，配置稳健型产品。`,
      products: [
        { name: "国债逆回购", desc: "短期闲置资金，节假日收益较好", risk: "极低" },
        { name: "纯债基金", desc: "波动小于股基，适合 1 年以上持有", risk: "低" },
        { name: "大额存单", desc: "3 年期约 2%+，保本保息", risk: "低" },
      ],
      tips: [
        "不要将所有资金投入单一产品",
        "优先补全 6 个月应急金",
        "关注产品赎回规则，保持流动性",
      ],
    };
  }

  if (savings < emergencyTarget * 3) {
    return {
      level: "balanced",
      title: "均衡配置阶段",
      summary: `应急金已充足（${formatMoney(savings)} 元）。可开始「核心 + 卫星」配置，长期定投指数基金。`,
      products: [
        { name: "宽基指数基金", desc: "沪深300、中证500 定投，分散风险", risk: "中" },
        { name: "红利 ETF", desc: "高股息策略，适合长期持有", risk: "中" },
        { name: "固收+", desc: "债券为主 + 少量权益，波动适中", risk: "中低" },
      ],
      tips: [
        "采用定投而非一次性买入，平滑波动",
        "权益类比例建议不超过可投资金的 50%",
        "每月结余的 20%–30% 用于定投",
      ],
    };
  }

  return {
    level: "growth",
    title: "长期成长阶段",
    summary: `储蓄 ${formatMoney(savings)} 元，财务基础较好。可适度提高权益配置，追求长期复利。`,
    products: [
      { name: "指数定投组合", desc: "宽基 + 行业指数，每月固定投入", risk: "中" },
      { name: "黄金 ETF", desc: "对冲通胀与地缘风险，占比 5%–10%", risk: "中" },
      { name: "养老 FOF", desc: "一站式资产配置，适合长期持有", risk: "中" },
    ],
    tips: [
      "持有周期建议 3 年以上，避免频繁买卖",
      "每年复盘一次资产配置比例",
      "高风险产品只用「闲钱」，不影响生活",
    ],
  };
}

export function suggestBudget(income: number): BudgetPlan {
  if (income <= 5000) {
    return { needsPercent: 60, wantsPercent: 25, savingsPercent: 15 };
  }
  if (income <= 15000) {
    return { needsPercent: 50, wantsPercent: 30, savingsPercent: 20 };
  }
  return { needsPercent: 45, wantsPercent: 25, savingsPercent: 30 };
}

export function calcSavingsMonthlyTarget(income: number, budget: BudgetPlan): number {
  return Math.round((income * budget.savingsPercent) / 100);
}

export function updateSavingsGoal(income: number, budget: BudgetPlan, current: SavingsGoal): SavingsGoal {
  const monthlyTarget = calcSavingsMonthlyTarget(income, budget);
  const targetAmount = current.targetAmount || monthlyTarget * 12;
  return { ...current, monthlyTarget, targetAmount: Math.max(targetAmount, monthlyTarget * 6) };
}
