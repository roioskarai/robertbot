import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { CtaBandProps } from "@/lib/site/types";
import { SmartLink } from "./shared";

const c = scoped(styles);

export default function CtaBand({ props }: { props: CtaBandProps }) {
  return (
    <div className={c("cta-band")}>
      <h2>{props.title}</h2>
      {props.subtitle ? <p>{props.subtitle}</p> : null}
      {props.cta ? (
        <SmartLink href={props.cta.href} className={c("btn-primary")} style={{ display: "inline-flex" }}>
          {props.cta.label}
        </SmartLink>
      ) : null}
    </div>
  );
}
