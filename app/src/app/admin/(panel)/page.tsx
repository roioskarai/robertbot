"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, Users, Bot, MessageSquare,
  DollarSign, AlertTriangle, CheckCircle2, Activity, Cpu, CreditCard,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import styles from "@/app/admin/admin.module.css";

interface Series {
  days: number;
  signups: { date: string; count: number }[];
  conversations: { date: string; count: number }[];
}

const CHART_TOOLTIP = { background: "#161922", border: "1px solid #232733", borderRadius: 8, color: "#f2f4f8" } as const;
const shortDay = (d: string) => d.slice(5); // "MM-DD"
const shortDayLabel = (d: unknown) => (typeof d === "string" ? d.slice(5) : "");

interface Stats {
  users: { total: number; active: number; paying: number; comp: number; trial: number; cancelled: number; paused: number; suspended: number; newThisMonth: number };
  revenue: { mrr: number; arr: number; currency: string };
  planMix: Record<string, number>;
  bots: { total: number; active: number; meta: number };
  conversations: { total: number; human: number };
  agentRuns: { id: string; status: string; created_at: string }[];
}

const PLAN_HE: Record<string, string> = { basic: "בסיסי", pro: "מקצועי", business: "עסקים", enterprise: "ארגוני" };

function SkRow() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--border-soft)" }}>
      <div className={`${styles.skeleton} ${styles.skBlock}`} style={{ width: 160 }} />
      <div className={`${styles.skeleton} ${styles.skBlock}`} style={{ width: 60, marginRight: "auto" }} />
      <div className={`${styles.skeleton} ${styles.skBlock}`} style={{ width: 50 }} />
    </div>
  );
}

function SkStat() {
  return (
    <div className={styles.statCard}>
      <div className={styles.statTop}>
        <div className={`${styles.skeleton}`} style={{ width: 38, height: 38, borderRadius: 10 }} />
      </div>
      <div className={`${styles.skeleton} ${styles.skBlock} ${styles.h32}`} style={{ width: "60%", marginBottom: 6 }} />
      <div className={`${styles.skeleton} ${styles.skBlock} ${styles.h8}`} style={{ width: "80%" }} />
    </div>
  );
}

export default function AdminOverview() {
  const [s, setS] = useState<Stats | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => d.error ? setErr(d.error) : setS(d))
      .catch(() => setErr("שגיאה בטעינת נתונים"));
    fetch("/api/admin/stats/series?days=30")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && !d.error) setSeries(d); })
      .catch(() => {});
  }, []);

  if (err) return (
    <div className={styles.empty}>
      <AlertTriangle size={36} strokeWidth={1.5} className={styles.emptyIcon} />
      <div className={styles.emptyText}>{err}</div>
    </div>
  );

  const loading = !s;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>סקירה כללית</h1>
          <p className={styles.pageDesc}>מצב המערכת בזמן אמת</p>
        </div>
        <div className={styles.pageActions}>
          <Link href="/admin/users" className={`${styles.btn} ${styles.btnGhost}`}><Users size={14} strokeWidth={2} /> משתמשים</Link>
          <Link href="/admin/billing" className={`${styles.btn} ${styles.btnGhost}`}><CreditCard size={14} strokeWidth={2} /> חיוב</Link>
          <Link href="/admin/agents" className={`${styles.btn} ${styles.btnGhost}`}><Cpu size={14} strokeWidth={2} /> סוכנים</Link>
          <button className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => { setS(null); fetch("/api/admin/stats").then(r=>r.json()).then(d=>setS(d)); }}>
            <Activity size={14} strokeWidth={2} /> רענן
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className={`${styles.grid} ${styles.g4} ${styles.fadeIn}`}>
        {loading ? (
          [0,1,2,3].map(i => <SkStat key={i} />)
        ) : (<>
          <StatCard
            icon={<DollarSign size={18} strokeWidth={2} />}
            label="הכנסה חודשית (MRR)"
            value={`${s.revenue.currency}${s.revenue.mrr.toLocaleString()}`}
            hint={`ARR: ${s.revenue.currency}${s.revenue.arr.toLocaleString()}`}
          />
          <StatCard
            icon={<Users size={18} strokeWidth={2} />}
            label="לקוחות משלמים"
            value={s.users.paying ?? s.users.active}
            hint={`${s.users.trial} בניסיון חינם · ${s.users.comp ?? 0} מנויי חינם`}
            className={`${styles.fadeIn} ${styles.fadeIn1}`}
          />
          <StatCard
            icon={<Bot size={18} strokeWidth={2} />}
            label="בוטים פעילים"
            value={`${s.bots.active}/${s.bots.total}`}
            hint={`${s.bots.meta} דרך Meta`}
            className={`${styles.fadeIn} ${styles.fadeIn2}`}
          />
          <StatCard
            icon={<MessageSquare size={18} strokeWidth={2} />}
            label="שיחות פתוחות"
            value={s.conversations.human}
            hint="ממתינות לנציג"
            type="warning"
            className={`${styles.fadeIn} ${styles.fadeIn3}`}
          />
        </>)}
      </div>

      <div className={`${styles.grid} ${styles.g4}`} style={{ marginTop: 14 }}>
        {loading ? [0,1,2,3].map(i=><SkStat key={i}/>) : (<>
          <StatCard icon={<Users size={18} strokeWidth={2} />} label="סה״כ משתמשים" value={s.users.total} hint={`+${s.users.newThisMonth} החודש`} />
          <StatCard icon={<CheckCircle2 size={18} strokeWidth={2} />} label="ביטולים" value={s.users.cancelled} hint="מנויים שבוטלו" type="danger" />
          <StatCard icon={<TrendingUp size={18} strokeWidth={2} />} label="מושהים" value={s.users.paused} hint="מנויים מושהים" type="info" />
          <StatCard icon={<AlertTriangle size={18} strokeWidth={2} />} label="חסומים" value={s.users.suspended} hint="חשבונות מושעים" type="danger" />
        </>)}
      </div>

      {/* Trend charts — last 30 days */}
      <div className={`${styles.grid} ${styles.g2}`} style={{ marginTop: 24 }}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>הרשמות — 30 הימים האחרונים</div>
          <div style={{ width: "100%", height: 240 }}>
            {series ? (
              <ResponsiveContainer>
                <LineChart data={series.signups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232733" />
                  <XAxis dataKey="date" tickFormatter={shortDay} stroke="#8b93a7" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="#8b93a7" fontSize={11} />
                  <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={shortDayLabel} />
                  <Line type="monotone" dataKey="count" name="הרשמות" stroke="#039855" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className={`${styles.skeleton}`} style={{ width: "100%", height: "100%", borderRadius: 10 }} />}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>שיחות — 30 הימים האחרונים</div>
          <div style={{ width: "100%", height: 240 }}>
            {series ? (
              <ResponsiveContainer>
                <BarChart data={series.conversations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232733" />
                  <XAxis dataKey="date" tickFormatter={shortDay} stroke="#8b93a7" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="#8b93a7" fontSize={11} />
                  <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={shortDayLabel} />
                  <Bar dataKey="count" name="שיחות" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className={`${styles.skeleton}`} style={{ width: "100%", height: "100%", borderRadius: 10 }} />}
          </div>
        </div>
      </div>

      {/* Bottom panels */}
      <div className={`${styles.grid} ${styles.g2}`} style={{ marginTop: 24 }}>
        {/* Plan mix */}
        <div className={`${styles.card} ${styles.fadeIn} ${styles.fadeIn1}`}>
          <div className={styles.cardTitle}>פילוח מסלולים</div>
          {loading ? [0,1,2,3].map(i=><SkRow key={i}/>) : (
            Object.keys(s.planMix).length === 0
              ? <div className={styles.empty}><div className={styles.emptyText}>אין מנויים עדיין</div></div>
              : Object.entries(s.planMix).map(([plan, count]) => {
                  const total = Object.values(s.planMix).reduce((a,b)=>a+b,0);
                  const pct = total ? Math.round(count/total*100) : 0;
                  return (
                    <div key={plan} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-soft)" }}>
                      <div className={styles.row} style={{ marginBottom: 6 }}>
                        <span className={styles.strong}>{PLAN_HE[plan]??plan}</span>
                        <span className={`${styles.badge} ${styles.badgeGreen}`} style={{ marginRight: "auto" }}>{count}</span>
                        <span className={styles.muted}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--accent)", borderRadius: 4, transition: "width .5s ease" }} />
                      </div>
                    </div>
                  );
                })
          )}
        </div>

        {/* Agent runs */}
        <div className={`${styles.card} ${styles.fadeIn} ${styles.fadeIn2}`}>
          <div className={styles.cardTitle}>ריצות סוכנים אחרונות</div>
          {loading ? [0,1,2,3,4].map(i=><SkRow key={i}/>) : (
            s.agentRuns.length === 0
              ? <div className={styles.empty}><div className={styles.emptyText}>אין ריצות עדיין</div></div>
              : s.agentRuns.slice(0,8).map((r) => (
                  <div key={r.id} className={styles.row} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}>
                    <div className={`${styles.badge} ${r.status==="success"?styles.badgeActive:r.status==="skipped"?styles.badgeTrial:styles.badgeCancelled}`}>
                      <span className={styles.badgeDot} />{r.status}
                    </div>
                    <span className={styles.muted} style={{ marginRight: "auto" }}>
                      {new Date(r.created_at).toLocaleString("he-IL",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}
                    </span>
                  </div>
                ))
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, hint, type = "default", className = "" }: {
  icon: React.ReactNode; label: string; value: string | number; hint?: string;
  type?: "default"|"warning"|"danger"|"info"; className?: string;
}) {
  const accentClass = type !== "default" ? styles[`statCardAccent`] : "";
  return (
    <div className={`${styles.statCard} ${accentClass} ${className}`}>
      <div className={styles.statTop}>
        <div className={`${styles.statIconWrap} ${type!=="default"?styles[type]:""}`}>{icon}</div>
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {hint && <div className={`${styles.statHint} ${type!=="default"?styles.neutral:""}`}>{hint}</div>}
    </div>
  );
}
