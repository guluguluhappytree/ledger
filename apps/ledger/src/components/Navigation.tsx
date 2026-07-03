import type { Page } from "../types";

const ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: "home", label: "概览", icon: "◉" },
  { id: "records", label: "账单", icon: "≡" },
  { id: "plan", label: "计划", icon: "▦" },
  { id: "invest", label: "理财", icon: "◎" },
];

export function Navigation({ current, onChange }: { current: Page; onChange: (p: Page) => void }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${current === item.id ? "active" : ""}`}
          onClick={() => onChange(item.id)}
        >
          <span className="nav-item__icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
