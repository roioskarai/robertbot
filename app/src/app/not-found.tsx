import Link from "next/link";
import styles from "./not-found.module.css";
import { scoped } from "@/lib/cx";

const c = scoped(styles);

export default function NotFound() {
  return (
    <div className={styles.nf}>
      <nav className={c("nav")}>
        <Link href="/" className={c("nav-logo")}>
          <div className={c("nav-logo-mark")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8l4 4-4 4" /></svg>
          </div>
          <div className={c("nav-logo-name")}>Robert<em>.</em></div>
        </Link>
        <div className={c("nav-links")}>
          <Link href="/" className={c("btn btn-outline")} style={{ padding: "7px 16px", fontSize: 13 }}>דף הבית</Link>
          <Link href="/dashboard" className={c("btn btn-primary")} style={{ padding: "7px 16px", fontSize: 13 }}>כניסה</Link>
        </div>
      </nav>

      <div className={c("card")}>
        <div className={c("num-wrap")}>
          <div className={c("num")}>404</div>
          <div className={c("robot-icon")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M12 11V7" /><circle cx="12" cy="5" r="2" /><path d="M8 15h.01M12 15h.01M16 15h.01" /></svg>
          </div>
        </div>

        <div className={c("card-title")}>אופס — Robert לא מצא את הדף</div>
        <div className={c("card-sub")}>
          הדף שחיפשת לא קיים, הועבר או שהכתובת שגויה.<br />
          אבל Robert תמיד כאן לעזור.
        </div>

        <div className={c("btns")}>
          <Link href="/" className={c("btn btn-primary")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            חזרה לדף הבית
          </Link>
          <div className={c("or")}><span>או</span></div>
          <Link href="/dashboard" className={c("btn btn-outline")}>כניסה לאזור האישי</Link>
        </div>

        <div className={c("foot-note")}>
          יש בעיה? <a href="mailto:support@robertbot.co.il">צור קשר</a>
        </div>
      </div>
    </div>
  );
}
