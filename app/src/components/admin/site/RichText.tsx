"use client";

// Lightweight WYSIWYG editor for blog/CMS bodies. Uses execCommand (supported
// in all current browsers) to avoid a heavy editor dependency. Emits HTML.

import { useEffect, useRef } from "react";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, Eraser } from "lucide-react";

function cmd(c: string, val?: string) {
  document.execCommand(c, false, val);
}

export default function RichText({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Initialize once; afterwards the DOM is the source of truth (avoids caret jumps).
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current?.innerHTML ?? "");

  const Tool = ({ icon: Icon, onClick, title }: { icon: typeof Bold; onClick: () => void; title: string }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); emit(); }}
      style={{ background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 7, width: 30, height: 30, color: "var(--t2)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
        <Tool icon={Bold} title="מודגש" onClick={() => cmd("bold")} />
        <Tool icon={Italic} title="נטוי" onClick={() => cmd("italic")} />
        <Tool icon={Heading2} title="כותרת 2" onClick={() => cmd("formatBlock", "<h2>")} />
        <Tool icon={Heading3} title="כותרת 3" onClick={() => cmd("formatBlock", "<h3>")} />
        <Tool icon={List} title="רשימה" onClick={() => cmd("insertUnorderedList")} />
        <Tool icon={ListOrdered} title="רשימה ממוספרת" onClick={() => cmd("insertOrderedList")} />
        <Tool icon={Link2} title="קישור" onClick={() => { const u = prompt("כתובת קישור:"); if (u) cmd("createLink", u); }} />
        <Tool icon={Eraser} title="נקה עיצוב" onClick={() => cmd("removeFormat")} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        dir="rtl"
        style={{
          minHeight: 240, padding: "12px 14px", background: "var(--surface-2)",
          border: "1px solid var(--border)", borderRadius: 9, color: "var(--t1)",
          fontSize: 14, lineHeight: 1.7, outline: "none",
        }}
      />
    </div>
  );
}
