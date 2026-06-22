import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { HowItWorksProps } from "@/lib/site/types";
import { nl2br } from "./shared";

const c = scoped(styles);
const SN = ["sn1", "sn2", "sn3", "sn4"];

export default function HowItWorks({ props }: { props: HowItWorksProps }) {
  return (
    <section className={c("sec")} id="how">
      <div className={c("sh rv")}>
        {props.tag ? <div className={c("tag tg")}>{props.tag}</div> : null}
        <h2 className={c("sec-title")}>{nl2br(props.title)}</h2>
        {props.subtitle ? <p className={c("sec-sub")}>{props.subtitle}</p> : null}
      </div>
      <div className={c("steps-wrap")}>
        <div className={c("steps")}>
          {(props.steps ?? []).map((s, i) => (
            <div key={i} className={c("step rv")}>
              <div className={c(`step-num ${SN[i] ?? ""}`)}>{s.num}</div>
              <span className={c("step-icon")}>{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
