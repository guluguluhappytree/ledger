import { useState } from "react";
import type { Category, PaymentMethod } from "../types";
import { CATEGORIES, PAYMENT_METHODS } from "../types";
import { todayStr } from "../utils";

interface AddTxModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    amount: number;
    category: Category;
    paymentMethod: PaymentMethod;
    note: string;
    date: string;
  }) => void;
  defaultPayment?: PaymentMethod;
}

export function AddTxModal({ open, onClose, onSave, defaultPayment = "alipay" }: AddTxModalProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("food");
  const [payment, setPayment] = useState<PaymentMethod>(defaultPayment);
  const [note, setNote] = useState("");

  if (!open) return null;

  const handleSave = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    onSave({ amount: n, category, paymentMethod: payment, note, date: todayStr() });
    setAmount("");
    setNote("");
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">记一笔</span>
          <button className="btn--ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>取消</button>
        </div>

        <div className="section-title">金额</div>
        <input
          className="input"
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
          style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: 16 }}
        />

        <div className="section-title">支付方式</div>
        <div className="picker-row">
          {PAYMENT_METHODS.filter((p) => p.id !== "other").map((p) => (
            <button
              key={p.id}
              className={`chip ${payment === p.id ? "selected" : ""}`}
              onClick={() => setPayment(p.id)}
              style={payment === p.id ? { borderColor: p.color, color: p.color, background: `${p.color}12` } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="section-title">分类</div>
        <div className="picker-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={`chip ${category === c.id ? "selected" : ""}`}
              onClick={() => setCategory(c.id)}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        <div className="section-title">备注</div>
        <input className="input" placeholder="买了什么？" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginBottom: 16 }} />

        <button className="btn btn--primary" onClick={handleSave} disabled={!amount || parseFloat(amount) <= 0}>
          保存
        </button>
      </div>
    </div>
  );
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (text: string) => number;
}

export function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<number | null>(null);

  if (!open) return null;

  const handleImport = () => {
    const count = onImport(text);
    setResult(count);
    if (count > 0) {
      setTimeout(() => { setText(""); setResult(null); onClose(); }, 1200);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">导入账单</span>
          <button className="btn--ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>取消</button>
        </div>

        <div className="notice">
          从支付宝/微信导出账单后，复制 CSV 内容粘贴到下方。App 会自动识别日期、金额和支付方式。
        </div>

        <textarea
          className="input"
          placeholder={"示例：\n2026-06-26,35.00,餐饮,支付宝\n2026-06-25,12.50,地铁,微信支付"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ minHeight: 140, resize: "vertical", marginBottom: 12 }}
        />

        {result !== null && (
          <p style={{ fontSize: "0.875rem", color: result > 0 ? "var(--accent)" : "var(--danger)", marginBottom: 8 }}>
            {result > 0 ? `成功导入 ${result} 笔` : "未能识别有效记录，请检查格式"}
          </p>
        )}

        <button className="btn btn--primary" onClick={handleImport} disabled={!text.trim()}>导入</button>
      </div>
    </div>
  );
}
