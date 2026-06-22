import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { StatsProps } from "@/lib/site/types";

const c = scoped(styles);

export default function Stats({ props }: { props: StatsProps }) {
  return (
    <div className={c("stats-strip")}>
      <div className={c("stats-inner")}>
        {(props.items ?? []).map((s, i) => (
          <div key={i} className={c("stat rv")}>
            <span className={c("stat-n")}>{s.value}</span>
            <span className={c("stat-l")}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
