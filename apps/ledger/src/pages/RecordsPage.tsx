import type { AppState } from "../types";
import { TransactionItem } from "../components/TransactionItem";
import { isCurrentMonth } from "../utils";

export function RecordsPage({
  state,
  onDelete,
  onImportClick,
}: {
  state: AppState;
  onDelete: (id: string) => void;
  onImportClick: () => void;
}) {
  const sorted = [...state.transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const monthCount = sorted.filter((t) => isCurrentMonth(t.date)).length;

  return (
    <div className="fade-in">
      <div className="notice">
        💡 支付宝/微信消费后，可在此页「导入账单」批量同步；或点右下角 ＋ 手动记录。
      </div>

      <button className="btn btn--ghost" onClick={onImportClick} style={{ marginBottom: 12 }}>
        📥 导入支付宝 / 微信账单
      </button>

      <div className="card">
        <div className="section-title">全部账单 · 本月 {monthCount} 笔</div>
        {sorted.length === 0 ? (
          <div className="empty">还没有任何记录</div>
        ) : (
          sorted.map((tx) => (
            <TransactionItem key={tx.id} tx={tx} onDelete={() => onDelete(tx.id)} />
          ))
        )}
      </div>
    </div>
  );
}
