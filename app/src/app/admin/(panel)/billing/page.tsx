"use client";

import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, Users, XCircle, RefreshCw } from "lucide-react";
import styles from "@/app/admin/admin.module.css";

interface Billing {
  summary: { mrr: number; arr: number; payingCustomers: number; compCustomers?: number; trials: number; cancelled: number; currency: string };
  byPlan: Record<string, { count: number; mrr: number; label: string }>;
  customers: { id: string; email: string; plan: string; cycle: string; provider: string|null; since: string; isComp?: boolean; endsAt?: string|null }[];
}

export default function AdminBilling() {
  const [b, setB] = useState<Billing|null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/admin/billing").then(r=>r.json()).then(d=>{setB(d); setLoading(false);});
  }
  useEffect(load,[]);

  const c = b?.summary.currency ?? "₪";

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>כספים</h1>
          <p className={styles.pageDesc}>הכנסות ומנויים</p>
        </div>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={load}>
          <RefreshCw size={14} strokeWidth={2}/> רענן
        </button>
      </div>

      <div className={`${styles.grid} ${styles.g4}`} style={{marginBottom:20}}>
        {[
          { icon:<DollarSign size={18} strokeWidth={2}/>, label:"MRR", value: loading?"…":`${c}${b?.summary.mrr.toLocaleString()}` },
          { icon:<TrendingUp size={18} strokeWidth={2}/>, label:"ARR (שנתי)", value: loading?"…":`${c}${b?.summary.arr.toLocaleString()}` },
          { icon:<Users size={18} strokeWidth={2}/>, label:"משלמים", value: loading?"…":`${b?.summary.payingCustomers}${b?.summary.compCustomers ? ` (+${b.summary.compCustomers} חינם)` : ""}` },
          { icon:<XCircle size={18} strokeWidth={2}/>, label:"ביטולים", value: loading?"…":b?.summary.cancelled, type:"danger" },
        ].map((s,i)=>(
          <div key={i} className={styles.statCard}>
            <div className={styles.statTop}>
              <div className={`${styles.statIconWrap} ${s.type?styles[s.type]:""}`}>{s.icon}</div>
            </div>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={`${styles.grid} ${styles.g2}`}>
        {/* Plan breakdown */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>הכנסה לפי מסלול</div>
          {loading
            ? [0,1,2,3].map(i=>(
                <div key={i} style={{padding:"12px 0", borderBottom:"1px solid var(--border-soft)"}}>
                  <div className={`${styles.skeleton} ${styles.skBlock}`} style={{width:"70%",marginBottom:8}}/>
                  <div className={`${styles.skeleton} ${styles.skBlock} ${styles.h8}`}/>
                </div>
              ))
            : !b || Object.keys(b.byPlan).length===0
              ? <div className={styles.empty}><div className={styles.emptyText}>אין מנויים עדיין</div></div>
              : Object.entries(b.byPlan).map(([k,v])=>{
                  const total = Object.values(b.byPlan).reduce((a,x)=>a+x.mrr,0);
                  const pct = total ? Math.round(v.mrr/total*100) : 0;
                  return (
                    <div key={k} style={{padding:"14px 0", borderBottom:"1px solid var(--border-soft)"}}>
                      <div className={styles.row} style={{marginBottom:8}}>
                        <span className={styles.strong}>{v.label}</span>
                        <span className={styles.muted} style={{marginRight:"auto"}}>{v.count} לקוחות</span>
                        <span className={styles.strong} dir="ltr">{c}{v.mrr.toLocaleString()}</span>
                      </div>
                      <div style={{height:4, background:"var(--surface-2)", borderRadius:4, overflow:"hidden"}}>
                        <div style={{height:"100%", width:`${pct}%`, background:"var(--accent)", borderRadius:4, transition:"width .5s ease"}}/>
                      </div>
                    </div>
                  );
                })
          }
        </div>

        {/* Customers table */}
        <div className={styles.card} style={{padding:0, overflow:"hidden"}}>
          <div style={{padding:"14px 18px", borderBottom:"1px solid var(--border)"}}>
            <div className={styles.cardTitle} style={{margin:0}}>לקוחות משלמים</div>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr><th>אימייל</th><th>מסלול</th><th>מחזור</th><th>ספק</th></tr>
              </thead>
              <tbody>
                {loading && [0,1,2,3].map(i=>(
                  <tr key={i}>{[160,80,70,60].map((w,j)=>(
                    <td key={j}><div className={`${styles.skeleton} ${styles.skBlock}`} style={{width:w}}/></td>
                  ))}</tr>
                ))}
                {!loading && (!b?.customers.length)
                  ? <tr><td colSpan={4}><div className={styles.tableEmpty}>אין לקוחות עדיין</div></td></tr>
                  : b?.customers.map(cu=>(
                      <tr key={cu.id}>
                        <td className={styles.strong} style={{fontSize:13}}>{cu.email}</td>
                        <td>
                          <span className={`${styles.badge} ${styles.badgeGreen}`}>{cu.plan}</span>
                          {cu.isComp && <span className={`${styles.badge} ${styles.badgeAdmin}`} style={{marginRight:5}}>חינם</span>}
                        </td>
                        <td className={styles.muted}>{cu.isComp && cu.endsAt ? `עד ${new Date(cu.endsAt).toLocaleDateString("he-IL")}` : cu.cycle==="annual"?"שנתי":"חודשי"}</td>
                        <td className={styles.muted}>{cu.provider??"—"}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
