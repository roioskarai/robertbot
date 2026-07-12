"use client";

// Topbar cluster: the notification bell + a REAL connection badge driven by
// the bell's own poll result (no extra request). Replaces the old hardcoded
// "Online" badge.

import { useCallback, useState } from "react";
import styles from "@/app/admin/admin.module.css";
import NotificationBell from "@/components/admin/NotificationBell";

export default function TopbarStatus() {
  const [ok, setOk] = useState<boolean | null>(null);
  const onStatus = useCallback((v: boolean) => setOk(v), []);

  return (
    <>
      <NotificationBell onStatus={onStatus} />
      <span className={`${styles.badge} ${ok === false ? styles.badgeCancelled : styles.badgeGreen}`}>
        <span className={styles.badgeDot} />
        {ok === false ? "שגיאת חיבור" : "מחובר"}
      </span>
    </>
  );
}
