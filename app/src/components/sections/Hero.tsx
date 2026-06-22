import styles from "@/app/landing.module.css";
import { scoped } from "@/lib/cx";
import type { HeroProps } from "@/lib/site/types";
import { nl2br, SmartLink } from "./shared";

const c = scoped(styles);
const AV = ["av1", "av2", "av3", "av4"];
const FT = ["ft1", "ft2", "ft3"];

export default function Hero({ props }: { props: HeroProps }) {
  const ctas = props.ctas ?? [];
  return (
    <section className={c("hero")}>
      <div className={c("hero-text rv")}>
        {props.eyebrow ? (
          <div className={c("hero-eyebrow")}>
            <span></span>
            {props.eyebrow}
          </div>
        ) : null}
        <h1>{nl2br(props.title)}</h1>
        {props.subtitle ? <p className={c("hero-sub")}>{props.subtitle}</p> : null}
        {ctas.length ? (
          <div className={c("hero-btns")}>
            {ctas.map((cta, i) => (
              <SmartLink
                key={i}
                href={cta.href}
                className={c(cta.variant === "ghost" ? "btn-ghost" : "btn-primary")}
              >
                {cta.label}
              </SmartLink>
            ))}
          </div>
        ) : null}
        {props.trustText ? (
          <div className={c("hero-trust")}>
            {props.trustAvatars?.length ? (
              <div className={c("trust-avatars")}>
                {props.trustAvatars.slice(0, 4).map((a, i) => (
                  <span key={i} className={c(AV[i])}>
                    {a}
                  </span>
                ))}
              </div>
            ) : null}
            <span>{props.trustText}</span>
          </div>
        ) : null}
      </div>
      <div className={c("stage rv")}>
        {(props.floatTags ?? []).slice(0, 2).map((t, i) => (
          <div key={i} className={c(`float-tag ${FT[i]}`)}>
            <span className={c("ft-ic")}>{t.icon}</span>
            {t.text}
          </div>
        ))}
        {props.chat ? (
          <div className={c("cw")}>
            <div className={c("cw-hdr")}>
              <div className={c("cw-av")}>R</div>
              <div>
                <div className={c("cw-name")}>{props.chat.name}</div>
                <div className={c("cw-st")}>
                  <i className={c("cw-dot")}></i>
                  {props.chat.status}
                </div>
              </div>
            </div>
            <div className={c("cw-body")}>
              {(props.chat.messages ?? []).map((m, i) => (
                <div key={i} className={c(`msg ${m.from === "out" ? "mo" : "mi"}`)}>
                  {m.text}
                  {m.time ? <div className={c("mt")}>{m.time}</div> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
