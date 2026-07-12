import type { Metadata } from "next";
import { draftMode } from "next/headers";
import styles from "./landing.module.css";
import { getActiveBanners, getRenderPage, getResolvedSite } from "@/lib/site/content";
import ThemeStyle from "@/components/site/ThemeStyle";
import AnnouncementBar from "@/components/site/AnnouncementBar";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import RevealOnScroll from "@/components/site/RevealOnScroll";
import SectionRenderer from "@/components/sections/SectionRenderer";
import DraftBanner from "@/components/site/DraftBanner";
import SitePopups from "@/components/site/SitePopups";
import WhatsAppWidget from "@/components/site/WhatsAppWidget";
import CustomCode from "@/components/site/CustomCode";
import Tracker from "@/components/site/Tracker";
import { guardPublicMaintenance } from "@/lib/system-settings";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getRenderPage("home");
  const meta = page?.meta ?? {};
  return {
    title: meta.metaTitle || "Robert — הבוט שעובד בשבילך",
    description: meta.metaDescription || undefined,
    ...(meta.canonical ? { alternates: { canonical: meta.canonical } } : {}),
    ...(meta.ogImage ? { openGraph: { images: [meta.ogImage] } } : {}),
  };
}

export default async function LandingPage() {
  await guardPublicMaintenance();
  const { isEnabled } = await draftMode();
  const [{ theme, settings }, page, banners] = await Promise.all([
    getResolvedSite(),
    getRenderPage("home", { draft: isEnabled }),
    getActiveBanners(),
  ]);
  const sections = page?.doc.sections ?? [];

  return (
    <div data-marketing="" data-rb-theme="" className={styles.landing}>
      <ThemeStyle theme={theme} />
      {isEnabled ? <DraftBanner /> : null}
      <AnnouncementBar config={settings.announcement} />
      <SiteHeader header={settings.header} />
      <RevealOnScroll>
        <SectionRenderer sections={sections} />
      </RevealOnScroll>
      <SiteFooter footer={settings.footer} />
      <SitePopups banners={banners} />
      <WhatsAppWidget config={settings.whatsappWidget} />
      <CustomCode settings={settings} />
      <Tracker />
    </div>
  );
}
