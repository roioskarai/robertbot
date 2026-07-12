import styles from "@/app/admin/admin.module.css";
import MaintenanceCard from "@/components/admin/MaintenanceCard";

export const dynamic = "force-dynamic";

export default function AdminSystemPage() {
  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>מערכת</h1>
          <p className={styles.pageDesc}>תחזוקה, דגלי פיצ׳ר והגדרות תפעוליות</p>
        </div>
      </div>

      <div className={`${styles.grid} ${styles.g2}`} style={{ alignItems: "start" }}>
        <MaintenanceCard />
      </div>
    </>
  );
}
