// Server component: renders an ordered list of section configs by mapping each
// section.type to its component (the "section registry"). Filters out disabled
// sections and ones outside their schedule window.

import type { PageSection } from "@/lib/site/types";
import Hero from "./Hero";
import Stats from "./Stats";
import HowItWorks from "./HowItWorks";
import Features from "./Features";
import PricingSection from "./PricingSection";
import Testimonials from "./Testimonials";
import Faq from "./Faq";
import CtaBand from "./CtaBand";
import Gallery from "./Gallery";
import Video from "./Video";
import Countdown from "./Countdown";
import Newsletter from "./Newsletter";
import CustomHtml from "./CustomHtml";
import RichTextSection from "./RichTextSection";

/* eslint-disable @typescript-eslint/no-explicit-any */
const REGISTRY: Record<string, (p: { props: any }) => React.ReactNode> = {
  hero: Hero,
  stats: Stats,
  "how-it-works": HowItWorks,
  features: Features,
  pricing: PricingSection,
  testimonials: Testimonials,
  faq: Faq,
  "cta-band": CtaBand,
  gallery: Gallery,
  video: Video,
  countdown: Countdown,
  newsletter: Newsletter,
  richtext: RichTextSection,
  "custom-html": CustomHtml,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

function visible(s: PageSection): boolean {
  if (!s.enabled) return false;
  const sch = s.schedule;
  if (!sch) return true;
  const now = Date.now();
  if (sch.start && now < new Date(sch.start).getTime()) return false;
  if (sch.end && now > new Date(sch.end).getTime()) return false;
  return true;
}

export default function SectionRenderer({ sections }: { sections: PageSection[] }) {
  return (
    <>
      {sections.filter(visible).map((s) => {
        const Cmp = REGISTRY[s.type];
        if (!Cmp) return null;
        return <Cmp key={s.id} props={s.props} />;
      })}
    </>
  );
}
