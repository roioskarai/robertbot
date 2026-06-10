"use client";

import { useEffect, useState } from "react";
import { Bot, Wifi, WifiOff, RefreshCw } from "lucide-react";
import styles from "@/app/admin/admin.module.css";

interface AdminBot {
  id: string; name: string; bot_name: string;
  business_type: string | null; active: boolean;
  whatsapp_number: string | null; wa_provider: string | null;
  owner_email: string | null; created_at: string;
}

function SkRow() {
  return (
    <tr>
      {[180,140,140,80,70,80].map((w,i)=>(
        <td key={i}><div className={`${styles.skeleton} ${styles.skBlock}`} style={{width:w}}/></td>
      ))}
    </tr>
  );
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

      <div className={styles.tableWrap}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>בוט</th><th>בעלים</th>
                <th>מספר וואטסאפ</th><th>ספק</th>
                <th style={{textAlign:"center"}}>סטטוס</th>
                <th>נוצר</th>
              </tr>
            </thead>
            <tbody>
              {loading && [0,1,2,3,4].map(i=><SkRow key={i}/>)}
              {!loading && bots.length===0 && (
                <tr><td colSpan={6}><div className={styles.tableEmpty}>אין בוטים</div></td></tr>
              )}
              {!loading && bots.map(b=>(
                <tr key={b.id}>
                  <td>
                    <div className={styles.strong} style={{fontSize:13}}>{b.name}</div>
                    <div className={styles.muted}>{b.bot_name}</div>
                  </td>
                  <td className={styles.muted}>{b.owner_email??'—'}</td>
                  <td>
                    {b.whatsapp_number
                      ? <span className={styles.mono} dir="ltr">{b.whatsapp_number}</span>
                      : <span className={styles.muted}>לא מחובר</span>}
                  </td>
                  <td>
                    {b.wa_provider
                      ? <span className={`${styles.badge} ${b.wa_provider==="meta"?styles.badgeAdmin:styles.badgeGreen}`}>{b.wa_provider}</span>
                      : <span className={styles.muted}>—</span>}
                  </td>
                  <td style={{textAlign:"center"}}>
                    {b.active
                      ? <Wifi size={16} strokeWidth={2} style={{color:"var(--success)"}}/>
                      : <WifiOff size={16} strokeWidth={2} style={{color:"var(--t4)"}}/>}
                  </td>
                  <td className={styles.muted}>{new Date(b.created_at).toLocaleDateString("he-IL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
