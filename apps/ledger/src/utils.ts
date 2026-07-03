import type { Category, PaymentMethod } from "./types";

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatMoney(n: number): string {
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatShortDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function isCurrentMonth(dateStr: string): boolean {
  return dateStr.startsWith(currentMonth());
}

export function inferCategory(text: string): Category {
  const t = text.toLowerCase();
  if (/餐|饭|食|咖啡|奶茶|外卖|美团|饿了么/.test(t)) return "food";
  if (/地铁|公交|打车|滴滴|出租|加油|停车/.test(t)) return "transport";
  if (/淘宝|京东|拼多多|购物|超市|便利店/.test(t)) return "shopping";
  if (/房租|物业|房贷/.test(t)) return "housing";
  if (/水费|电费|燃气|话费|宽带/.test(t)) return "utilities";
  if (/电影|游戏|ktv|娱乐/.test(t)) return "entertainment";
  if (/医院|药|体检/.test(t)) return "health";
  if (/课程|书|培训|教育/.test(t)) return "education";
  if (/基金|理财|股票/.test(t)) return "investment";
  return "other";
}

export function inferPaymentMethod(text: string): PaymentMethod {
  if (/支付宝|alipay|花呗/.test(text)) return "alipay";
  if (/微信|wechat|weixin/.test(text)) return "wechat";
  if (/银行|储蓄|信用卡|借记/.test(text)) return "card";
  if (/现金/.test(text)) return "cash";
  return "other";
}

export interface ParsedImportRow {
  date: string;
  amount: number;
  note: string;
  category: Category;
  paymentMethod: PaymentMethod;
}

/** 解析支付宝/微信账单粘贴文本或 CSV */
export function parseBillImport(text: string): ParsedImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedImportRow[] = [];

  for (const line of lines) {
    if (/^交易时间|^记账时间|^日期|^date/i.test(line)) continue;

    const csvParts = line.split(/[,，\t]/).map((s) => s.trim().replace(/^"|"$/g, ""));
    let date = "";
    let amount = 0;
    let note = "";

    if (csvParts.length >= 3) {
      const dateCandidate = csvParts.find((p) => /^\d{4}[-/年]\d{1,2}[-/月]\d{1,2}/.test(p) || /^\d{4}-\d{2}-\d{2}/.test(p));
      if (dateCandidate) {
        date = dateCandidate
          .replace(/年|月/g, "-")
          .replace(/日/g, "")
          .replace(/\//g, "-")
          .slice(0, 10);
      }
      const amountCandidate = csvParts.find((p) => /^-?\d+(\.\d+)?$/.test(p.replace(/[¥￥,]/g, "")));
      if (amountCandidate) {
        amount = Math.abs(parseFloat(amountCandidate.replace(/[¥￥,]/g, "")));
      }
      note = csvParts.find((p) => p.length > 2 && !/^\d/.test(p) && isNaN(Number(p.replace(/[¥￥,]/g, "")))) ?? csvParts[csvParts.length - 1] ?? "";
    }

    const inlineMatch = line.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2}).*?[¥￥]?\s*(-?\d+\.?\d*)/);
    if (!date && inlineMatch) {
      date = inlineMatch[1].replace(/\//g, "-");
      amount = Math.abs(parseFloat(inlineMatch[2]));
      note = line.replace(inlineMatch[0], "").trim();
    }

    if (!date || !amount || amount <= 0) continue;

    results.push({
      date,
      amount,
      note: note || "导入账单",
      category: inferCategory(note + line),
      paymentMethod: inferPaymentMethod(note + line),
    });
  }

  return results;
}

export function sumAmount(transactions: { amount: number }[]): number {
  return transactions.reduce((s, t) => s + t.amount, 0);
}
