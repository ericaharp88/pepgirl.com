import { useEffect, useState } from "react";
import api from "../lib/api";
import {
  Instagram, Youtube, Twitter, Music2, Facebook, Linkedin,
  MessageCircle, Globe, Mail, Send, Headphones, Camera, Heart,
} from "lucide-react";

// Map platform key -> { Icon, label, href-builder }
const PLATFORMS = {
  instagram: { Icon: Instagram, label: "Instagram" },
  tiktok:    { Icon: Music2, label: "TikTok" },
  youtube:   { Icon: Youtube, label: "YouTube" },
  twitter:   { Icon: Twitter, label: "Twitter / X" },
  x:         { Icon: Twitter, label: "X" },
  threads:   { Icon: MessageCircle, label: "Threads" },
  facebook:  { Icon: Facebook, label: "Facebook" },
  pinterest: { Icon: Heart, label: "Pinterest" },
  linkedin:  { Icon: Linkedin, label: "LinkedIn" },
  snapchat:  { Icon: Camera, label: "Snapchat" },
  podcast:   { Icon: Headphones, label: "Podcast" },
  spotify:   { Icon: Headphones, label: "Spotify" },
  discord:   { Icon: MessageCircle, label: "Discord" },
  skool:     { Icon: Globe, label: "Skool" },
  telegram:  { Icon: Send, label: "Telegram" },
  email:     { Icon: Mail, label: "Email" },
  website:   { Icon: Globe, label: "Website" },
  other:     { Icon: Globe, label: "Link" },
};

export default function SocialBar() {
  const [links, setLinks] = useState([]);
  useEffect(() => {
    api.get("/socials").then(({ data }) => setLinks(data || []))
      .catch(() => setLinks([]));
  }, []);

  if (!links.length) return null;

  return (
    <div
      data-testid="social-bar"
      className="border-b border-[#F0CFE0] bg-white/60"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-3 flex flex-wrap items-center gap-3">
        <span className="eyebrow text-[#5C5C5C] mr-2">Follow Pep Girl</span>
        {links.map((s) => {
          const meta = PLATFORMS[(s.platform || "").toLowerCase()] || PLATFORMS.other;
          const Icon = meta.Icon;
          const href = s.platform === "email" && !s.url.startsWith("mailto:")
            ? `mailto:${s.url}`
            : s.url;
          return (
            <a
              key={s.id}
              href={href}
              target={href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noopener noreferrer"
              data-testid={`social-${s.platform}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#FFF0F7] hover:bg-[#FF2D87] hover:text-white text-[#0A0A0A] text-xs font-mono uppercase tracking-wider transition"
              title={s.label || meta.label}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{s.label || meta.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
