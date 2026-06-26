---
name: finance-report
description: Build Robert's monthly finance report — revenue/MRR, churn, plan mix, and unit economics — from Stripe/Supabase data or pasted numbers. Use for "דוח כספי", "כמה כסף נכנס", "MRR", "כלכלת יחידה", "דוח חודשי". Pairs with growth (revenue analysis) + admin-platform-manager (subscription administration).
---

# דוח כספי חודשי — Robert

תבנית אחידה למעקב כסף. מקורות נתונים: MCP של Stripe (`mcp__stripe__*`) /
Supabase (`mcp__supabase__*`) אם מחוברים, או נתונים שמדביקים ידנית (CSV/מספרים).

## הקשר תמחור (מקור-אמת: `app/src/lib/plans.ts`)
מסלולים: ₪99 / ₪199 / ₪399 / ₪699. חבילות הודעות חד-פעמיות. 7 ימי ניסיון.
עלויות משתנות עיקריות: Claude (לפי הודעות), Twilio (לפי הודעות וואטסאפ), Resend.

## מבנה הדוח
1. **שורה תחתונה** — הכנסה החודש, מול חודש קודם (%).
2. **MRR** — חודשי חוזר, פילוח לפי מסלול (כמה לקוחות × מחיר).
3. **לקוחות** — חדשים, שעזבו (churn), מושהים, בניסיון.
4. **שיעור churn** ו**שימור** (%).
5. **כלכלת יחידה** — הכנסה ממוצעת ללקוח (ARPU), עלות משוערת ללקוח (Claude+Twilio),
   רווח גולמי משוער ליחידה, וערך חיים משוער (LTV).
6. **דגלים** — חיובים שנכשלו, ירידות חריגות, מסלולים לא-רווחיים.
7. **המלצות** — תמחור/שימור (הפנה ל-`growth`).

## כללים
- כל מספר עם מקור (Stripe/Supabase/קלט ידני). הפרד נתון מאומת מהערכה.
- **דיסקליימר:** עזר ניתוח, לא רו"ח. לדוחות מס רשמיים — פנה לרואה חשבון.
