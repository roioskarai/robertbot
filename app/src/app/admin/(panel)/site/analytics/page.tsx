"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { Eye, Users, Target, TrendingUp } from "lucide-react";
import styles from "@/app/admin/admin.module.css";
import { Card } from "@/components/admin/site/ui";

interface Analytics {
  totals: { pageviews: number; sessions: number; conversions: number; conversionRate: number };
  series: { date: string; pageviews: number; conversions: number }[];
  topPaths: { path: string; count: number }[];
  topRefs: { referrer: string; count: number }[];
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string | number }) {
  return (
    <Card>
      <div className={styles.row} style={{ gap: 12 }}>
        <div className={styles.statIconWrap} style={{ width: 38, height: 38, borderRadius: 10 }}><Icon size={18} /></div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--t1)" }}>{value}</div>
          <div style={{ fontSize: 12, color: "var(--t3)" }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [a, setA] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/site/analytics").then((r) => r.json()).then((j) => { setA(j); setLoading(false); });
  }, []);

  if (loading) return <div className={styles.tableEmpty}>טוען…</div>;
  if (!a) return <div className={styles.tableEmpty}>אין נתונים</div>;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>אנליטיקס</h1>
          <p className={styles.pageDesc}>תנועה, סשנים והמרות ב-30 הימים האחרונים.</p>
        </div>
      </div>

      <div className={`${styles.grid} ${styles.g4}`} style={{ marginBottom: 18 }}>
        <Kpi icon={Eye} label="צפיות בדפים" value={a.totals.pageviews.toLocaleString()} />
        <Kpi icon={Users} label="סשנים" value={a.totals.sessions.toLocaleString()} />
        <Kpi icon={Target} label="המרות" value={a.totals.conversions.toLocaleString()} />
        <Kpi icon={TrendingUp} label="אחוז המרה" value={`${a.totals.conversionRate}%`} />
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 14 }}>תנועה לאורך זמן</div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={a.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232733" />
              <XAxis dataKey="date" stroke="#8b93a7" fontSize={11} reversed />
              <YAxis stroke="#8b93a7" fontSize={11} />
              <Tooltip contentStyle={{ background: "#161922", border: "1px solid #232733", borderRadius: 8, color: "#f2f4f8" }} />
              <Line type="monotone" dataKey="pageviews" name="צפיות" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="conversions" name="המרות" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className={`${styles.grid} ${styles.g2}`}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 14 }}>עמודים מובילים</div>
          {a.topPaths.length === 0 ? (
            <div style={{ color: "var(--t4)" }}>אין נתונים עדיין</div>
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={a.topPaths} layout="vertical" margin={{ right: 16 }}>
                  <XAxis type="number" stroke="#8b93a7" fontSize={11} />
                  <YAxis type="category" dataKey="path" stroke="#8b93a7" fontSize={11} width={90} />
                  <Tooltip contentStyle={{ background: "#161922", border: "1px solid #232733", borderRadius: 8, color: "#f2f4f8" }} />
                  <Bar dataKey="count" name="צפיות" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", marginBottom: 14 }}>מקורות תנועה</div>
          {a.topRefs.length === 0 ? (
            <div style={{ color: "var(--t4)" }}>אין נתונים עדיין</div>
          ) : (
            a.topRefs.map((r) => (
              <div key={r.referrer} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--t2)" }}>{r.referrer}</span>
                <span className={styles.mono} style={{ color: "var(--t1)" }}>{r.count}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </>
  );
}
