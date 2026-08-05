import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/idspace/shell";
import { LegalPage } from "@/components/idspace/legal-page";
import {
  Fingerprint, Database, Cookie, HardDrive, Lock, Globe, User, Mail,
} from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ID•SPACE FINANCE" },
      { name: "description", content: "Learn how IDPI collects, uses, and protects your data in the ID•SPACE FINANCE app." },
      { property: "og:title", content: "Privacy Policy — ID•SPACE FINANCE" },
      { property: "og:description", content: "Learn how IDPI collects, uses, and protects your data in the ID•SPACE FINANCE app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <AppShell active="">
      <LegalPage
        metaTitle="Privacy Policy"
        title="Privacy Policy"
        subtitle="Your privacy matters to us. This page explains how ID•SPACE FINANCE handles your personal information, authentication data, and device storage."
        updated="July 8, 2026"
        sections={[
          {
            icon: <Fingerprint className="h-4 w-4" />,
            title: "Pi Authentication",
            body: "When you sign in with Pi Network, we receive only the username and access token required to verify your identity. We do not store your Pi wallet private key, passphrase, or payment PIN. All verification is handled server-side through the official Pi SDK endpoints."
          },
          {
            icon: <Database className="h-4 w-4" />,
            title: "Data We Collect",
            body: "We collect minimal data necessary to operate the app: your Pi username, language and currency preferences, notification settings, and interaction history. We do not sell personal data, and we do not collect sensitive financial information such as bank account numbers or card details."
          },
          {
            icon: <Cookie className="h-4 w-4" />,
            title: "Cookies",
            body: "We may use essential cookies and similar technologies to keep you signed in, remember your preferences, and prevent abuse. We do not use third-party advertising cookies or tracking pixels for behavioral profiling."
          },
          {
            icon: <HardDrive className="h-4 w-4" />,
            title: "Local Storage",
            body: "App settings (language, currency, sound, haptic feedback, and theme) are stored locally in your browser using localStorage. This data stays on your device and is not transmitted to our servers unless you explicitly enable cloud sync in the future."
          },
          {
            icon: <User className="h-4 w-4" />,
            title: "User Privacy",
            body: "You control your preferences through the Settings menu. You can clear localStorage at any time from your browser settings. We honor your choices and will only ask for permissions that are genuinely needed for a feature to work."
          },
          {
            icon: <Lock className="h-4 w-4" />,
            title: "Security",
            body: "We use HTTPS for all network communication, validate Pi access tokens on the server, and keep backend secrets separate from client code. While we take reasonable measures to protect your data, no online service can guarantee absolute security."
          },
          {
            icon: <Globe className="h-4 w-4" />,
            title: "Third-Party Services",
            body: "The app integrates with Pi Network and public market data sources (e.g., OKX) to show live rates. These services have their own privacy policies and data practices. We do not send them personally identifiable information beyond what is required for the integration."
          },
          {
            icon: <Mail className="h-4 w-4" />,
            title: "Contact Information",
            body: "If you have questions about this Privacy Policy or how your data is handled, please contact us at support@idpi.id. We will respond as soon as possible."
          },
        ]}
      />
    </AppShell>
  );
}
