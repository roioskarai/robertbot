"use client";

import { useEffect, useState } from "react";
import { Bot, Wifi, WifiOff, RefreshCw } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import DataTable, { type Column } from "@/components/admin/DataTable";

interface AdminBot {
  id: string; name: string; bot_name: string;
  business_type: string | null; active: boolean;
  whatsapp_number: string | null; wa_provider: string | null;
  owner_email: string | null; created_at: string;
}

export default function AdminBots() {
  const [bots, setBots] = useState<AdminBot[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/admin/bots").then(r=>r.json()).then(d=>{setBots(d.bots??[]); setLoading(false);});
  }
  useEffect(load, []);

  const active = bots.filter(b=>b.active).length;
  const meta   = bots.filter(b=>b.wa_provider==="meta").length;

  const columns: Column<AdminBot>[] = [
    {
      key: "name", label: "בוט", sortable: true,
      render: (b) => (
        <div>
          <div className={styles.strong} style={{ fontSize: 13 }}>{b.name}</div>
          <div className={styles.muted}>{b.bot_name}</div>
        </div>
      ),
    },
    { key: "owner_email", label: "בעלים", sortable: true, hideBelow: "md",
      render: (b) => <span className={styles.muted}>{b.owner_email ?? "—"}</span> },
    {
      key: "whatsapp_number", label: "מספר וואטסאפ", hideBelow: "sm",
      render: (b) => b.whatsapp_number
        ? <span className={styles.mono} dir="ltr">{b.whatsapp_number}</span>
        : <span className={styles.muted}>לא מחובר</span>,
    },
    {
      key: "wa_provider", label: "ספק", align: "center", hideBelow: "md",
      render: (b) => b.wa_provider
        ? <span className={`${styles.badge} ${b.wa_provider==="meta"?styles.badgeAdmin:styles.badgeGreen}`}>{b.wa_provider}</span>
        : <span className={styles.muted}>—</span>,
    },
    {
      key: "active", label: "סטטוס", align: "center", sortable: true, sortValue: (b) => (b.active ? 1 : 0),
      render: (b) => b.active
        ? <Wifi size={16} strokeWidth={2} style={{ color: "var(--success)" }} />
        : <WifiOff size={16} strokeWidth={2} style={{ color: "var(--t4)" }} />,
    },
    {
      key: "created_at", label: "נוצר", sortable: true, hideBelow: "sm",
      render: (b) => <span className={styles.muted}>{new Date(b.created_at).toLocaleDateString("he-IL")}</span>,
    },
  ];

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>בוטים</h1>
          <p className={styles.pageDesc}>
            {!loading && `${bots.length} בוטים · ${active} פעילים · ${meta} דרך Meta`}
          </p>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}>
          <RefreshCw size={14} strokeWidth={2}/> רענן
        </button>
      </div>

      <div className={`${styles.grid} ${styles.g4}`} style={{ marginBottom: 20 }}>
        {[
          {label:"סה״כ בוטים", value: loading?"…":bots.length},
          {label:"פעילים",      value: loading?"…":active,       type:"default"},
          {label:"דרך Meta",    value: loading?"…":meta,          type:"info"},
          {label:"לא מחוברים",  value: loading?"…":bots.filter(b=>!b.whatsapp_number).length, type:"warning"},
        ].map((s,i)=>(
          <div key={i} className={styles.statCard}>
            <div className={styles.statTop}>
              <div className={`${styles.statIconWrap} ${s.type&&s.type!=="default"?styles[s.type]:""}`}>
                <Bot size={18} strokeWidth={2}/>
              </div>
            </div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <DataTable<AdminBot>
        rows={bots}
        loading={loading}
        pageSize={25}
        initialSort={{ key: "created_at", dir: "desc" }}
        emptyText="אין בוטים"
        columns={columns}
      />
    </>
  );
}
