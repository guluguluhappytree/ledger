import { useState, type FormEvent } from "react";
import { useSync, type SyncStatus } from "./SyncContext.js";

function statusLabel(status: SyncStatus, error: string | null, isPendingAuth: boolean): string {
  switch (status) {
    case "offline":
      return "未登录";
    case "local":
      return isPendingAuth ? "离线登录 · 连 Wi‑Fi 后验证" : "待备份 · 连 Wi‑Fi 自动同步";
    case "syncing":
      return "同步中…";
    case "synced":
      return "已备份";
    case "error":
      return error ?? "同步失败";
    default:
      return "待同步";
  }
}

export function AccountButton() {
  const { user, isPendingAuth, syncStatus, syncError, login, register, logout, syncNow } = useSync();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password);
      }
      setPassword("");
      setOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`sync-account-btn sync-account-btn--${syncStatus}`}
        onClick={() => setOpen(true)}
        aria-label="账号与云同步"
        title={user ? `${user.email} · ${statusLabel(syncStatus, syncError, isPendingAuth)}` : "登录以跨设备同步"}
      >
        <span className="sync-account-btn__icon" aria-hidden>
          ☁
        </span>
        {user && <span className="sync-account-btn__dot" aria-hidden />}
      </button>

      {open && (
        <div className="sync-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="sync-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
            <h2 className="sync-modal__title">云同步账号</h2>
            <p className="sync-modal__desc">
              同一账号可用于美德训练、日记、记账等全部小应用。换设备登录后，历史数据会自动恢复。
            </p>

            {user ? (
              <div className="sync-modal__logged">
                <p className="sync-modal__email">{user.email}</p>
                <p className={`sync-modal__status sync-modal__status--${syncStatus}`}>
                  {statusLabel(syncStatus, syncError, isPendingAuth)}
                </p>
                <div className="sync-modal__actions">
                  <button type="button" className="sync-btn sync-btn--primary" onClick={() => void syncNow()}>
                    立即同步
                  </button>
                  <button
                    type="button"
                    className="sync-btn sync-btn--ghost"
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                  >
                    退出登录
                  </button>
                </div>
              </div>
            ) : (
              <form className="sync-modal__form" onSubmit={(e) => void submit(e)}>
                <div className="sync-tabs">
                  <button
                    type="button"
                    className={`sync-tab ${mode === "login" ? "sync-tab--active" : ""}`}
                    onClick={() => setMode("login")}
                  >
                    登录
                  </button>
                  <button
                    type="button"
                    className={`sync-tab ${mode === "register" ? "sync-tab--active" : ""}`}
                    onClick={() => setMode("register")}
                  >
                    注册
                  </button>
                </div>
                <label className="sync-field">
                  <span>邮箱</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="sync-field">
                  <span>密码</span>
                  <input
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </label>
                {formError && <p className="sync-modal__error">{formError}</p>}
                <button type="submit" className="sync-btn sync-btn--primary sync-btn--full" disabled={busy}>
                  {busy ? "请稍候…" : mode === "login" ? "登录并同步" : "注册并同步"}
                </button>
              </form>
            )}

            <button type="button" className="sync-modal__close" onClick={() => setOpen(false)} aria-label="关闭">
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
