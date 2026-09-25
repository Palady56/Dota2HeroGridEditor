import { useEffect } from "react";
import type { ValidationIssue } from "../dota-json/validate";

export type IssuesReport = {
  title: string;
  issues: ValidationIssue[];
  /** Shown as the primary button; omitted for read-only reports. */
  confirmLabel?: string;
  onConfirm?: () => void;
};

const LEVEL_LABEL: Record<ValidationIssue["level"], string> = {
  error: "Ошибка",
  warning: "Предупреждение",
  info: "Инфо",
};

export function IssuesDialog({ report, onClose }: { report: IssuesReport; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-label={report.title} onClick={(e) => e.stopPropagation()}>
        <h2>{report.title}</h2>
        {report.issues.length === 0 ? (
          <p className="hint">Проблем не найдено.</p>
        ) : (
          <ul className="issue-list">
            {report.issues.map((issue, i) => (
              <li key={i} className={`issue ${issue.level}`}>
                <span className="issue-level">{LEVEL_LABEL[issue.level]}</span>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="row dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            {report.onConfirm ? "Отмена" : "Закрыть"}
          </button>
          {report.onConfirm && (
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                report.onConfirm?.();
                onClose();
              }}
            >
              {report.confirmLabel ?? "OK"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
