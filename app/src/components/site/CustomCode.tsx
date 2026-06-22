import type { SiteSettingsDoc } from "@/lib/site/types";
import InjectScripts from "./InjectScripts";

// Renders the owner's custom CSS (inline <style>) and runs custom JS / header /
// footer scripts. CSS is safe to inline server-side; scripts are executed by the
// client InjectScripts helper.
export default function CustomCode({ settings }: { settings: SiteSettingsDoc }) {
  const foot = [settings.footerScripts ?? "", settings.customJs ? `<script>${settings.customJs}</script>` : ""]
    .filter(Boolean)
    .join("\n");
  return (
    <>
      {settings.customCss ? <style dangerouslySetInnerHTML={{ __html: settings.customCss }} /> : null}
      {(settings.headerScripts || foot) ? <InjectScripts head={settings.headerScripts} foot={foot} /> : null}
    </>
  );
}
