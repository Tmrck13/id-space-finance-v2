import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/idspace/shell";
import { LegalPage } from "@/components/idspace/legal-page";
import {
  FileText, UserCheck, Scale, Lightbulb, ShoppingBag, Coins, Ban, AlertTriangle,
  Gavel, Mail,
} from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ID•SPACE FINANCE" },
      { name: "description", content: "Read the Terms of Service for using ID•SPACE FINANCE, the IDPI Islamic Web3 Super App." },
      { property: "og:title", content: "Terms of Service — ID•SPACE FINANCE" },
      { property: "og:description", content: "Read the Terms of Service for using ID•SPACE FINANCE, the IDPI Islamic Web3 Super App." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <AppShell active="">
      <LegalPage
        metaTitle="Terms of Service"
        title="Terms of Service"
        subtitle="By using ID•SPACE FINANCE, you agree to these terms. Please read them carefully before using the app or marketplace."
        updated="July 8, 2026"
        sections={[
          {
            icon: <FileText className="h-4 w-4" />,
            title: "Acceptance of Terms",
            body: "These Terms of Service govern your access to and use of the ID•SPACE FINANCE application and related services. If you do not agree to any part of these terms, please do not use the app."
          },
          {
            icon: <UserCheck className="h-4 w-4" />,
            title: "User Responsibilities",
            body: "You are responsible for keeping your Pi account credentials secure, maintaining accurate profile information, and ensuring that any activity on your account complies with applicable laws and these terms."
          },
          {
            icon: <Scale className="h-4 w-4" />,
            title: "Acceptable Use",
            body: "You agree not to use the app for illegal, fraudulent, abusive, or harmful activities. This includes spamming, distributing malware, attempting to bypass security, or engaging in transactions that violate Islamic finance principles."
          },
          {
            icon: <Lightbulb className="h-4 w-4" />,
            title: "Intellectual Property",
            body: "All branding, design, code, trademarks, and content created by IDPI remain the property of Indonesia Digital Pioneer. You may not copy, modify, or distribute them without written permission."
          },
          {
            icon: <ShoppingBag className="h-4 w-4" />,
            title: "Marketplace Disclaimer",
            body: "The IDPI Marketplace connects buyers and sellers. IDPI is not a party to individual transactions and does not guarantee product quality, delivery, or merchant conduct. Disputes should be resolved directly with the merchant."
          },
          {
            icon: <Coins className="h-4 w-4" />,
            title: "Digital Asset Disclaimer",
            body: "Digital assets and cryptocurrency values can be volatile. Information displayed in the app, including Pi price estimates, is for reference only and does not constitute financial, investment, or legal advice."
          },
          {
            icon: <Ban className="h-4 w-4" />,
            title: "Account Termination",
            body: "We may suspend or terminate your access if you violate these terms, engage in abuse, or compromise platform security. You may also stop using the app at any time."
          },
          {
            icon: <AlertTriangle className="h-4 w-4" />,
            title: "Limitation of Liability",
            body: "To the maximum extent permitted by law, IDPI is not liable for indirect, incidental, or consequential damages arising from your use of the app, marketplace, or third-party integrations."
          },
          {
            icon: <Gavel className="h-4 w-4" />,
            title: "Governing Law",
            body: "These terms are governed by the laws of the Republic of Indonesia. Any disputes will be resolved in the competent courts of Indonesia, unless both parties agree to alternative dispute resolution."
          },
          {
            icon: <Mail className="h-4 w-4" />,
            title: "Contact Information",
            body: "For questions about these Terms of Service, please contact us at support@idpi.id."
          },
        ]}
      />
    </AppShell>
  );
}
