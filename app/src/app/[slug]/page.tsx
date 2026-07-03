import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import styles from "../landing.module.css";
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

// Reserved top-level segments are real routes; this dynamic route only catches
// builder-created pages/posts. (Next prioritizes static segments over [slug].)

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const page = await getRenderPage(params.slug);
  if (!page) return {};
  const meta = page.meta ?? {};
  return {
    title: meta.metaTitle || page.title,
    description: meta.metaDescription || undefined,
    ...(meta.canonical ? { alternates: { canonical: meta.canonical } } : {}),
    ...(meta.ogImage ? { openGraph: { images: [meta.ogImage] } } : {}),
  };
}

export default async function DynamicPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { isEnabled } = await draftMode();
  const [{ theme, settings }, page, banners] = await Promise.all([
    getResolvedSite(),
    getRenderPage(params.slug, { draft: isEnabled }),
    getActiveBanners(),
  ]);
  if (!page) notFound();

  return (
    <div data-marketing="" data-rb-theme="" className={styles.landing}>
      <ThemeStyle theme={theme} />
      {isEnabled ? <DraftBanner /> : null}
      <AnnouncementBar config={settings.announcement} />
      <SiteHeader header={settings.header} />
      <RevealOnScroll>
        <SectionRenderer sections={page.doc.sections} />
      </RevealOnScroll>
      <SiteFooter footer={settings.footer} />
      <SitePopups banners={banners} />
      <WhatsAppWidget config={settings.whatsappWidget} />
      <CustomCode settings={settings} />
      <Tracker />
    </div>
  );
}
