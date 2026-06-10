"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, KeyRound, Lock, Clock } from "lucide-react";
import styles from "@/app/admin/admin.module.css";

export default function AdminSecurity() {
  const [me, setMe] = useState<{ email: string; totp_enabled: boolean; last_login_at: string | null }|null>(null);
  const [qr, setQr] = useState<string|null>(null);
  const [manualKey, setManualKey] = useState<string|null>(null);
  const [code, setCode] = useState("");
  const [tfaMsg, setTfaMsg] = useState<{msg:string;ok:boolean}|null>(null);
  const [tfaBusy, setTfaBusy] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{msg:string;ok:boolean}|null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  function loadMe() { fetch("/api/admin/me").then(r=>r.json()).then(setMe); }
  useEffect(loadMe,[]);

  async function startReconfig() {
    setTfaBusy(true); setTfaMsg(null);
    const res = await fetch("/api/admin/2fa/setup",{method:"POST"});
    const json = await res.json();
    setTfaBusy(false);
    if (!res.ok){setTfaMsg({msg:json.error||"שגיאה",ok:false}); return;}
    setQr(json.qr); setManualKey(json.manualKey);
  }

  async function confirmTotp() {
    setTfaBusy(true); setTfaMsg(null);
    const res = await fetch("/api/admin/2fa/enable",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
    const json = await res.json();
    setTfaBusy(false);
    if (!res.ok){setTfaMsg({msg:json.error||"קוד שגוי",ok:false}); return;}
    setTfaMsg({msg:"✓ 2FA הופעל בהצלחה",ok:true}); setQr(null); setManualKey(null); setCode(""); loadMe();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setPwMsg(null);
    if (newPw!==confirmPw){setPwMsg({msg:"הסיסמאות אינן תואמות",ok:false}); return;}
    if (newPw.length<8){setPwMsg({msg:"לפחות 8 תווים",ok:false}); return;}
    setPwBusy(true);
    try {
      const res = await fetch("/api/admin/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword:curPw,newPassword:newPw})});
      const json = await res.json();
      if (!res.ok){setPwMsg({msg:json.error||"שגיאה",ok:false}); return;}
      setPwMsg({msg:"✓ הסיסמה שונתה בהצלחה",ok:true});
      setCurPw(""); setNewPw(""); setConfirmPw("");
    } finally { setPwBusy(false); }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>אבטחה</h1>
          <p className={styles.pageDesc}>סיסמה ואימות דו-שלבי</p>
        </div>
      </div>

      <div className={`${styles.grid} ${styles.g2}`} style={{alignItems:"start"}}>
        {/* Password */}
        <div className={styles.card}>
          <div className={styles.row} style={{gap:10,marginBottom:20}}>
            <div className={styles.statIconWrap}><KeyRound size={16} strokeWidth={2}/></div>
            <div className={styles.strong}>שינוי סיסמה</div>
          </div>
          <form onSubmit={changePassword}>
            <div className={styles.field}>
              <label className={styles.label}>סיסמה נוכחית</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",color:"var(--t4)"}}>
                  <Lock size={14} strokeWidth={1.8}/>
                </span>
                <input className={styles.input} style={{paddingRight:34}} type="password"
                  value={curPw} onChange={e=>setCurPw(e.target.value)} dir="ltr" required autoComplete="current-password"/>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>סיסמה חדשה (לפחות 8 תווים)</label>
              <input className={styles.input} type="password" value={newPw}
                onChange={e=>setNewPw(e.target.value)} dir="ltr" required minLength={8} autoComplete="new-password"/>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>אישור סיסמה חדשה</label>
              <input className={styles.input} type="password" value={confirmPw}
                onChange={e=>setConfirmPw(e.target.value)} dir="ltr" required autoComplete="new-password"/>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
              type="submit" disabled={pwBusy}>{pwBusy?"מעדכן…":"שמור סיסמה"}</button>
            {pwMsg && (
              <div style={{marginTop:10, padding:"8px 12px", borderRadius:8, fontSize:13, fontWeight:600, textAlign:"center",
                background: pwMsg.ok?"var(--success-bg)":"var(--danger-bg)",
                color: pwMsg.ok?"var(--success)":"var(--danger)"}}>
                {pwMsg.msg}
              </div>
            )}
          </form>
        </div>

        {/* 2FA */}
        <div className={styles.card}>
          <div className={styles.row} style={{justifyContent:"space-between", marginBottom:20}}>
            <div className={styles.row} style={{gap:10}}>
              <div className={`${styles.statIconWrap} ${me?.totp_enabled?"":styles.warning}`}>
                {me?.totp_enabled
                  ? <ShieldCheck size={16} strokeWidth={2}/>
                  : <ShieldOff size={16} strokeWidth={2}/>}
              </div>
              <div>
                <div className={styles.strong}>אימות דו-שלבי</div>
                <div style={{fontSize:11.5, color:me?.totp_enabled?"var(--success)":"var(--warning)", fontWeight:700, marginTop:2}}>
                  {me?(me.totp_enabled?"✓ פעיל ומאובטח":"לא מוגדר — מומלץ להפעיל"):"טוען…"}
                </div>
              </div>
            </div>
            <span className={`${styles.badge} ${me?.totp_enabled?styles.badgeActive:styles.badgeTrial}`}>
              {me?.totp_enabled?"מאובטח":"ממתין"}
            </span>
          </div>

          {me?.last_login_at && (
            <div className={styles.row} style={{gap:6, marginBottom:16, color:"var(--t4)", fontSize:12}}>
              <Clock size={13} strokeWidth={1.8}/>
              כניסה אחרונה: {new Date(me.last_login_at).toLocaleString("he-IL")}
            </div>
          )}

          {!qr && (
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull}`}
              onClick={startReconfig} disabled={tfaBusy}>
              {me?.totp_enabled?"הגדר מחדש את 2FA":"הפעל 2FA"}
            </button>
          )}

          {qr && (
            <div>
              <p style={{textAlign:"center",fontSize:12,color:"var(--t3)",marginBottom:10}}>סרוק עם Google Authenticator:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.qr} src={qr} alt="QR" width={220} height={220}/>
              {manualKey && (
                <>
                  <div className={styles.authDivider}><span className={styles.authDividerText}>או הזן ידנית</span></div>
                  <div className={styles.manualKey}>{manualKey}</div>
                </>
              )}
              <input className={`${styles.input} ${styles.codeInput}`} value={code} dir="ltr"
                onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
                placeholder="000000" inputMode="numeric" maxLength={6}/>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}
                style={{marginTop:10}} onClick={confirmTotp}
                disabled={tfaBusy||code.length!==6}>אשר והפעל</button>
            </div>
          )}

          {tfaMsg && (
            <div style={{marginTop:12, padding:"8px 12px", borderRadius:8, fontSize:13, fontWeight:600, textAlign:"center",
              background: tfaMsg.ok?"var(--success-bg)":"var(--danger-bg)",
              color: tfaMsg.ok?"var(--success)":"var(--danger)"}}>
              {tfaMsg.msg}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
