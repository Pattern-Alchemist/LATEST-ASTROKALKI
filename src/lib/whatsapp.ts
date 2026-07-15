// AstroKalki WhatsApp Integration Utility
// All forms and CTAs redirect to WhatsApp +91 8920862931

const WHATSAPP_NUMBER = "918920862931";

interface WhatsAppMessageOptions {
  type: "booking" | "service" | "contact" | "newsletter" | "general";
  serviceName?: string;
  duration?: string;
  price?: string;
  contexts?: string[];
  name?: string;
  email?: string;
  phone?: string;
  birthDetails?: string;
  message?: string;
}

function buildBookingMessage(opts: WhatsAppMessageOptions): string {
  const parts: string[] = [];

  parts.push("🔮 *AstroKalki — New Session Request*");
  parts.push("");

  if (opts.name) parts.push(`👤 *Name:* ${opts.name}`);
  if (opts.email) parts.push(`📧 *Email:* ${opts.email}`);
  if (opts.phone) parts.push(`📱 *Phone:* ${opts.phone}`);
  if (opts.duration) parts.push(`⏱ *Duration:* ${opts.duration} minutes`);
  if (opts.price) parts.push(`💰 *Investment:* ${opts.price}`);

  if (opts.contexts && opts.contexts.length > 0) {
    parts.push("");
    parts.push("🎯 *Focus Areas:*");
    opts.contexts.forEach((ctx) => parts.push(`   • ${ctx}`));
  }

  if (opts.birthDetails) {
    parts.push("");
    parts.push(`🎂 *Birth Details:* ${opts.birthDetails}`);
  }

  if (opts.message) {
    parts.push("");
    parts.push(`💬 *Message:* ${opts.message}`);
  }

  parts.push("");
  parts.push("— Sent from AstroKalki.com");

  return parts.join("\n");
}

function buildServiceMessage(opts: WhatsAppMessageOptions): string {
  const parts: string[] = [];
  parts.push("🔮 *AstroKalki — Service Inquiry*");
  parts.push("");
  parts.push(`📌 *Service:* ${opts.serviceName || "General Inquiry"}`);
  if (opts.price) parts.push(`💰 *Price:* ${opts.price}`);
  parts.push("");
  parts.push("I'd like to know more about this session. Please share details.");
  parts.push("");
  parts.push("— Sent from AstroKalki.com");
  return parts.join("\n");
}

function buildGeneralMessage(opts: WhatsAppMessageOptions): string {
  const parts: string[] = [];
  parts.push("🔮 *AstroKalki — General Inquiry*");
  parts.push("");
  if (opts.message) parts.push(`💬 ${opts.message}`);
  else parts.push("Hi, I'd like to learn more about AstroKalki sessions.");
  parts.push("");
  parts.push("— Sent from AstroKalki.com");
  return parts.join("\n");
}

function buildNewsletterMessage(opts: WhatsAppMessageOptions): string {
  const parts: string[] = [];
  parts.push("🔮 *AstroKalki — Waitlist / Newsletter*");
  parts.push("");
  if (opts.email) parts.push(`📧 *Email:* ${opts.email}`);
  parts.push("I'd like to join the waitlist for upcoming sessions and insights.");
  parts.push("");
  parts.push("— Sent from AstroKalki.com");
  return parts.join("\n");
}

function buildContactMessage(opts: WhatsAppMessageOptions): string {
  const parts: string[] = [];
  parts.push("🔮 *AstroKalki — Contact Request*");
  parts.push("");
  if (opts.name) parts.push(`👤 *Name:* ${opts.name}`);
  if (opts.email) parts.push(`📧 *Email:* ${opts.email}`);
  if (opts.message) parts.push(`💬 *Message:* ${opts.message}`);
  else parts.push("I'd like to connect with AstroKalki.");
  parts.push("");
  parts.push("— Sent from AstroKalki.com");
  return parts.join("\n");
}

export function getWhatsAppURL(opts: WhatsAppMessageOptions): string {
  let message = "";

  switch (opts.type) {
    case "booking":
      message = buildBookingMessage(opts);
      break;
    case "service":
      message = buildServiceMessage(opts);
      break;
    case "newsletter":
      message = buildNewsletterMessage(opts);
      break;
    case "contact":
      message = buildContactMessage(opts);
      break;
    default:
      message = buildGeneralMessage(opts);
  }

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}

export function openWhatsApp(opts: WhatsAppMessageOptions): void {
  const url = getWhatsAppURL(opts);
  window.open(url, "_blank", "noopener,noreferrer");
}

export const WHATSAPP_DIRECT_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
