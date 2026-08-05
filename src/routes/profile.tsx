import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  User, Edit3, CreditCard, Crown, Wallet, Shield, Lock, Bell,
  Globe, Moon, HelpCircle, MessageCircle, FileText, ChevronRight,
  LogOut, Camera, Copy, Check, QrCode, Star, Sparkles, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionTitle, GoldRing } from "@/components/idspace/shell";
import { useSettings, useTap, LANGS } from "@/lib/app-settings";
import { useIdpointsBalance } from "@/lib/idpoints-store";
import avatar from "@/assets/avatar.jpg";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile — IDPI" },
      { name: "description", content: "Your ID·SPACE Finance profile, membership, and settings." },
    ],
  }),
});

/* Membership levels in order */
const MEMBERSHIP_LEVELS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "VIP", "Administrator"];
const LEVEL_COLORS: Record<string, string> = {
  Bronze: "#CD7F32", Silver: "#C0C0C0", Gold: "#FFD76A",
  Platinum: "#E5E4E2", Diamond: "#B9F2FF", VIP: "#56FF76", Administrator: "#FF9F76",
};

/* Demo user data — in production this comes from Pi Auth + backend */
const DEMO_USER = {
  name: "Rocky San",
  username: "@rocky.san.pi",
  memberId: "IDPI-20250001",
  walletAddress: "GC5X...7K2M",
  fullWallet: "GC5XKAQEDLNPTJQZFBFNACUMHCPQLJQVJQHXW4JY7K2M",
  membership: "Gold",
  level: 15,
  rank: "Sultan",
  registeredAt: "2025-01-01",
  piBalance: "0.00000000",
};

type Section = "overview" | "edit" | "card" | "membership" | "wallet" | "security" | "help" | "about";

function ProfilePage() {
  const { t } = useSettings();
  const tap = useTap();
  const { balance } = useIdpointsBalance();
  const [section, setSection] = useState<Section>("overview");
  const [copied, setCopied] = useState(false);
  const [editName, setEditName] = useState(DEMO_USER.name);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_USER.fullWallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t("common.copied"));
    } catch { toast.error("Copy failed"); }
  };

  const renderSection = () => {
    switch (section) {
      case "edit": return <EditProfile name={editName} setName={setEditName} onBack={() => setSection("overview")} />;
      case "card": return <IslamicCard user={DEMO_USER} balance={balance} onBack={() => setSection("overview")} />;
      case "membership": return <MembershipSection user={DEMO_USER} balance={balance} onBack={() => setSection("overview")} />;
      case "wallet": return <WalletSection user={DEMO_USER} balance={balance} copied={copied} onCopy={copyAddress} onBack={() => setSection("overview")} />;
      case "security": return <SecuritySection onBack={() => setSection("overview")} />;
      case "help": return <HelpSection onBack={() => setSection("overview")} />;
      case "about": return <AboutSection onBack={() => setSection("overview")} />;
      default: return (
        <Overview
          user={{ ...DEMO_USER, name: editName }}
          balance={balance}
          t={t}
          tap={tap}
          onSection={setSection}
        />
      );
    }
  };

  return (
    <AppShell active="Profile">
      <div className="mx-auto max-w-2xl">{renderSection()}</div>
    </AppShell>
  );
}

/* ---- Overview ---- */
function Overview({ user, balance, t, tap, onSection }: {
  user: typeof DEMO_USER & { name: string };
  balance: number;
  t: (k: string) => string;
  tap: () => void;
  onSection: (s: Section) => void;
}) {
  const idrValue = Math.floor(balance / 9);
  const memberColor = LEVEL_COLORS[user.membership] ?? "#FFD76A";

  return (
    <>
      {/* Avatar / hero */}
      <div className="glass-card p-6 text-center mb-4">
        <div className="relative inline-block">
          <div className="anim-pulse-glow rounded-full p-[3px]"
            style={{ background: `linear-gradient(135deg, ${memberColor}, #56FF76)` }}>
            <img src={avatar} alt={user.name} className="h-24 w-24 rounded-full object-cover" />
          </div>
          <button
            onClick={() => { tap(); toast(t("toast.comingSoon")); }}
            className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full transition active:scale-90"
            style={{ background: memberColor, border: "2px solid #050806" }}
          >
            <Camera className="h-3.5 w-3.5 text-black" />
          </button>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-white">{user.name}</h1>
        <p className="text-xs text-emerald-200/60">{user.username}</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Crown className="h-4 w-4" style={{ color: memberColor }} />
          <span className="text-sm font-medium" style={{ color: memberColor }}>
            {user.membership} · Level {user.level} · {user.rank}
          </span>
        </div>
        <div className="mt-3 flex justify-center gap-6 text-center">
          <div>
            <div className="text-lg font-bold gold-shimmer">{balance.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-100/50 uppercase tracking-widest">IDPoints</div>
          </div>
          <div className="w-px" style={{ background: "rgba(255,215,106,.2)" }} />
          <div>
            <div className="text-lg font-bold text-white">Rp{idrValue.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-100/50 uppercase tracking-widest">Value</div>
          </div>
        </div>
        <button
          onClick={() => { tap(); onSection("edit"); }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-black transition active:scale-95"
          style={{ background: `linear-gradient(90deg, ${memberColor}, #56FF76)` }}
        >
          <Edit3 className="h-4 w-4" />
          {t("profile.edit")}
        </button>
      </div>

      {/* Profile info */}
      <div className="glass-card p-4 mb-4 space-y-2">
        <SectionTitle icon={<User className="h-4 w-4" />} title={t("profile.title")} />
        <InfoRow label={t("profile.memberId")} value={user.memberId} />
        <InfoRow label={t("profile.registered")} value={new Date(user.registeredAt).toLocaleDateString()} />
        <InfoRow label={t("profile.membership")} value={user.membership} valueColor={memberColor} />
        <InfoRow label={t("profile.level")} value={`${user.level} — ${user.rank}`} />
      </div>

      {/* Quick actions */}
      <div className="glass-card p-4 mb-4">
        <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Quick Access" />
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <CreditCard className="h-5 w-5" />, label: t("profile.islamicCard"), section: "card" as Section },
            { icon: <Crown className="h-5 w-5" />, label: t("profile.membership"), section: "membership" as Section },
            { icon: <Wallet className="h-5 w-5" />, label: t("profile.piWallet"), section: "wallet" as Section },
            { icon: <Shield className="h-5 w-5" />, label: t("profile.security"), section: "security" as Section },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => { tap(); onSection(item.section); }}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white transition hover:-translate-y-0.5 active:scale-[.98]"
              style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg"
                style={{ background: "rgba(11,26,18,.9)", border: "1px solid rgba(255,215,106,.25)" }}>
                <span style={{ color: "#56FF76" }}>{item.icon}</span>
              </span>
              <span className="flex-1 text-left text-xs">{item.label}</span>
              <ChevronRight className="h-4 w-4 opacity-50" style={{ color: "#FFD76A" }} />
            </button>
          ))}
        </div>
      </div>

      {/* Settings & Legal */}
      <div className="glass-card p-4 mb-4">
        <SectionTitle icon={<Settings className="h-4 w-4" />} title="Settings & Legal" />
        <div className="space-y-2">
          <MenuRow icon={<Bell className="h-4 w-4" />} label={t("profile.notificationSettings")}
            to="/notifications" />
          <MenuRow icon={<Globe className="h-4 w-4" />} label={t("profile.language")}
            onClick={() => { tap(); toast(t("toast.comingSoon")); }} />
          <MenuRow icon={<Moon className="h-4 w-4" />} label={t("profile.theme")}
            onClick={() => { tap(); toast(t("toast.comingSoon")); }} />
          <MenuRow icon={<HelpCircle className="h-4 w-4" />} label={t("profile.help")}
            onClick={() => { tap(); onSection("help"); }} />
          <MenuRow icon={<MessageCircle className="h-4 w-4" />} label={t("profile.support")}
            onClick={() => { tap(); onSection("about"); }} />
          <MenuRow icon={<FileText className="h-4 w-4" />} label={t("profile.terms")} to="/terms" />
          <MenuRow icon={<Lock className="h-4 w-4" />} label={t("profile.privacyPolicy")} to="/privacy" />
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => { tap(); toast.success("Signed out (demo)"); }}
        className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition active:scale-95 mb-4"
        style={{ background: "rgba(30,10,10,.8)", border: "1px solid rgba(255,118,118,.3)", color: "#FF9F9F" }}
      >
        <LogOut className="h-4 w-4" />
        {t("profile.logout")}
      </button>
    </>
  );
}

/* ---- Edit Profile ---- */
function EditProfile({ name, setName, onBack }: { name: string; setName: (n: string) => void; onBack: () => void }) {
  const { t } = useSettings();
  const tap = useTap();
  const [localName, setLocalName] = useState(name);
  const [localUsername, setLocalUsername] = useState("rocky.san.pi");
  const [localBio, setLocalBio] = useState("Pi Pioneer · Islamic Finance Enthusiast");

  const save = () => {
    tap();
    setName(localName);
    toast.success(t("common.success") + " — Profile updated");
    onBack();
  };

  return (
    <>
      <BackHeader title={t("profile.edit")} onBack={onBack} />
      <div className="glass-card p-5 space-y-4">
        <div className="text-center">
          <div className="relative inline-block">
            <img src={avatar} alt="Avatar" className="h-20 w-20 rounded-full object-cover border-2"
              style={{ borderColor: "#FFD76A" }} />
            <button
              onClick={() => { tap(); toast(t("toast.comingSoon")); }}
              className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full"
              style={{ background: "#FFD76A", border: "2px solid #050806" }}
            >
              <Camera className="h-3.5 w-3.5 text-black" />
            </button>
          </div>
          <p className="mt-2 text-xs gold-text">{t("profile.editPhoto")}</p>
        </div>

        <Field label="Full Name" value={localName} onChange={setLocalName} />
        <Field label="Username" value={localUsername} onChange={setLocalUsername} prefix="@" />
        <Field label="Bio" value={localBio} onChange={setLocalBio} multiline />

        <button onClick={save}
          className="w-full rounded-xl py-3 text-sm font-bold text-black transition active:scale-95"
          style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}>
          {t("profile.saveChanges")}
        </button>
      </div>
    </>
  );
}

/* ---- Islamic Profile Card ---- */
function IslamicCard({ user, balance, onBack }: { user: typeof DEMO_USER; balance: number; onBack: () => void }) {
  const { t } = useSettings();
  const tap = useTap();
  const memberColor = LEVEL_COLORS[user.membership] ?? "#FFD76A";
  const qrData = encodeURIComponent(`IDPI:${user.memberId}:${user.walletAddress}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${qrData}&size=120x120&bgcolor=0B1A12&color=FFD76A&margin=8`;

  return (
    <>
      <BackHeader title={t("profile.islamicCard")} onBack={onBack} />
      {/* The Card */}
      <div className="rounded-2xl p-[1.5px] mb-4 anim-pulse-glow"
        style={{ background: `linear-gradient(135deg, ${memberColor}, #56FF76, ${memberColor})` }}>
        <div className="rounded-[18px] p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(160deg, #0B1A12, #050806)" }}>
          {/* Islamic pattern overlay */}
          <svg className="absolute inset-0 h-full w-full opacity-[.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="card-pat" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M30 0 L60 30 L30 60 L0 30 Z M30 8 L52 30 L30 52 L8 30 Z" fill="none" stroke="#FFD76A" strokeWidth="0.8" />
                <circle cx="30" cy="30" r="3" fill="#FFD76A" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#card-pat)" />
          </svg>

          {/* Bismillah */}
          <div className="text-center mb-4 font-[Amiri] text-lg" style={{ color: memberColor }} dir="rtl">
            بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="rounded-full p-[2px]"
              style={{ background: `linear-gradient(135deg, ${memberColor}, #56FF76)` }}>
              <img src={avatar} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold text-white">{user.name}</div>
              <div className="text-xs text-emerald-200/70">{user.username}</div>
              <div className="mt-1 flex items-center gap-1">
                <Crown className="h-3 w-3" style={{ color: memberColor }} />
                <span className="text-xs font-medium" style={{ color: memberColor }}>
                  {user.membership} Member
                </span>
              </div>
            </div>
            <img src={qrUrl} alt="QR Code" className="h-[72px] w-[72px] rounded-lg"
              style={{ border: `1px solid ${memberColor}40` }} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <CardField label="Member ID" value={user.memberId} color={memberColor} />
            <CardField label="Level" value={`${user.level} · ${user.rank}`} color="#56FF76" />
            <CardField label="IDPoints" value={balance.toLocaleString()} color={memberColor} />
            <CardField label="Registered" value={new Date(user.registeredAt).toLocaleDateString()} color="#56FF76" />
          </div>

          <div className="rounded-lg px-3 py-2 text-[10px] font-mono text-emerald-100/60 flex items-center justify-between"
            style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" }}>
            <span>Wallet: {user.walletAddress}</span>
            <span className="gold-text">ID·SPACE FINANCE</span>
          </div>

          {/* Stars for membership tier */}
          <div className="mt-3 flex justify-center gap-1">
            {Array.from({ length: MEMBERSHIP_LEVELS.indexOf(user.membership) + 1 }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-current" style={{ color: memberColor }} />
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => { tap(); toast(t("toast.comingSoon")); }}
        className="w-full rounded-xl py-3 text-sm font-bold text-black transition active:scale-95"
        style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}
      >
        <QrCode className="inline h-4 w-4 mr-2" />
        Download Card
      </button>
    </>
  );
}

/* ---- Membership Section ---- */
function MembershipSection({ user, balance, onBack }: { user: typeof DEMO_USER; balance: number; onBack: () => void }) {
  const { t } = useSettings();
  const tap = useTap();
  const currentIdx = MEMBERSHIP_LEVELS.indexOf(user.membership);

  return (
    <>
      <BackHeader title={t("profile.membership")} onBack={onBack} />
      <div className="glass-card p-5 mb-4 text-center">
        <Crown className="mx-auto h-10 w-10 mb-2" style={{ color: LEVEL_COLORS[user.membership] }} />
        <div className="text-xl font-semibold text-white">{user.membership} Member</div>
        <div className="text-sm text-emerald-200/60">Level {user.level} · {user.rank}</div>
        <div className="mt-3 text-2xl font-bold gold-shimmer">{balance.toLocaleString()} IDPoints</div>
      </div>

      <div className="glass-card p-4 mb-4">
        <SectionTitle icon={<Crown className="h-4 w-4" />} title="Membership Tiers" />
        <div className="space-y-2">
          {MEMBERSHIP_LEVELS.map((lvl, i) => {
            const isCurrent = i === currentIdx;
            const isPast = i < currentIdx;
            const color = LEVEL_COLORS[lvl];
            return (
              <div key={lvl} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{
                  background: isCurrent ? `${color}18` : "rgba(5,8,6,.5)",
                  border: `1px solid ${isCurrent ? color + "60" : "rgba(255,215,106,.12)"}`,
                }}>
                <div className="grid h-8 w-8 place-items-center rounded-full"
                  style={{ background: `${color}20`, border: `1px solid ${color}60` }}>
                  {isPast || isCurrent
                    ? <Check className="h-4 w-4" style={{ color }} />
                    : <Star className="h-4 w-4 opacity-30" style={{ color }} />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: isCurrent ? color : "rgba(255,255,255,.7)" }}>
                    {lvl}
                    {isCurrent && <span className="ml-2 text-[10px] font-normal opacity-70">· Current</span>}
                  </div>
                </div>
                {Array.from({ length: i + 1 }).map((_, si) => (
                  <Star key={si} className="h-2.5 w-2.5 fill-current" style={{ color: `${color}${isCurrent || isPast ? "ff" : "30"}` }} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={() => { tap(); toast(t("toast.comingSoon")); }}
        className="w-full rounded-xl py-3 text-sm font-bold text-black transition active:scale-95 mb-4"
        style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}>
        Upgrade Membership
      </button>
    </>
  );
}

/* ---- Pi Wallet Section ---- */
function WalletSection({ user, balance, copied, onCopy, onBack }: {
  user: typeof DEMO_USER; balance: number; copied: boolean; onCopy: () => void; onBack: () => void;
}) {
  const { t } = useSettings();
  return (
    <>
      <BackHeader title={t("profile.piWallet")} onBack={onBack} />
      <div className="space-y-3">
        <div className="glass-card p-5">
          <SectionTitle icon={<Wallet className="h-4 w-4" />} title="Pi Balance" />
          <div className="text-3xl font-mono font-bold gold-shimmer">{user.piBalance} PI</div>
          <div className="mt-1 text-xs text-emerald-100/50">Connect Pi Wallet to sync live balance</div>
        </div>
        <div className="glass-card p-5">
          <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="IDPoints" />
          <div className="text-3xl font-mono font-bold text-white">{balance.toLocaleString()} IDP</div>
          <div className="mt-1 text-xs text-emerald-100/50">≈ Rp{Math.floor(balance / 9).toLocaleString()}</div>
        </div>
        <div className="glass-card p-4">
          <SectionTitle icon={<Lock className="h-4 w-4" />} title={t("profile.walletAddressLabel")} />
          <div className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.2)" }}>
            <span className="flex-1 text-xs font-mono text-emerald-100/70 truncate">{user.fullWallet}</span>
            <button onClick={onCopy}
              className="shrink-0 grid h-7 w-7 place-items-center rounded-lg transition active:scale-90"
              style={{ background: "rgba(11,26,18,.9)", border: "1px solid rgba(255,215,106,.3)" }}>
              {copied ? <Check className="h-3.5 w-3.5" style={{ color: "#56FF76" }} /> : <Copy className="h-3.5 w-3.5" style={{ color: "#FFD76A" }} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---- Security ---- */
function SecuritySection({ onBack }: { onBack: () => void }) {
  const { t } = useSettings();
  const tap = useTap();
  const options = [
    { label: "Change PIN", icon: <Lock className="h-4 w-4" /> },
    { label: "Two-Factor Authentication", icon: <Shield className="h-4 w-4" /> },
    { label: "Login Activity", icon: <User className="h-4 w-4" /> },
    { label: "Connected Devices", icon: <Sparkles className="h-4 w-4" /> },
    { label: "Privacy Mode", icon: <Lock className="h-4 w-4" /> },
  ];
  return (
    <>
      <BackHeader title={t("profile.security")} onBack={onBack} />
      <div className="glass-card p-4 space-y-2">
        {options.map((o) => (
          <button key={o.label} onClick={() => { tap(); toast(t("toast.comingSoon")); }}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white transition hover:-translate-y-0.5"
            style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" }}>
            <span className="grid h-9 w-9 place-items-center rounded-lg"
              style={{ background: "rgba(11,26,18,.9)", border: "1px solid rgba(255,215,106,.25)" }}>
              <span style={{ color: "#56FF76" }}>{o.icon}</span>
            </span>
            <span className="flex-1 text-left">{o.label}</span>
            <ChevronRight className="h-4 w-4 opacity-50" style={{ color: "#FFD76A" }} />
          </button>
        ))}
      </div>
    </>
  );
}

/* ---- Help Center ---- */
function HelpSection({ onBack }: { onBack: () => void }) {
  const { t } = useSettings();
  const faqs = [
    { q: "What are IDPoints?", a: "IDPoints (IDP) are the in-app reward currency of ID·SPACE Finance. 9 IDP = Rp1. Earn them via Check-In, Staking, Swaps, and events." },
    { q: "How does Daily Check-In work?", a: "Claim your reward once every 24 hours. Complete a 7-day streak to earn up to 9,000 IDPoints. Missing a day resets your streak." },
    { q: "Is my Pi wallet connected?", a: "Go to Wallet → Pi Balance to connect your Pi Network wallet. Pi payments are processed through the Pi Network SDK." },
    { q: "How do I stake IDPoints?", a: "Go to the Staking page, enter an amount, and click Stake. You earn 12% APR, compounding in real time. Claim or unstake anytime." },
    { q: "How do I withdraw IDPoints?", a: "Go to Wallet → Withdraw. Enter the amount and your Pi wallet address. Withdrawals are reviewed within 24 hours." },
    { q: "Is this app Halal?", a: "Yes. ID·SPACE Finance is built on Islamic finance principles — no interest (riba), no gambling (maysir). All features are designed to be Sharia-compliant." },
  ];
  return (
    <>
      <BackHeader title={t("profile.help")} onBack={onBack} />
      <div className="space-y-2">
        {faqs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
      </div>
    </>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const tap = useTap();
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => { tap(); setOpen((v) => !v); }}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-white text-left">
        <span className="font-medium pr-3">{q}</span>
        <ChevronRight className="h-4 w-4 shrink-0 transition-transform" style={{ color: "#FFD76A", transform: open ? "rotate(90deg)" : "none" }} />
      </button>
      {open && <div className="px-4 pb-4 text-xs text-emerald-100/70 leading-relaxed border-t" style={{ borderColor: "rgba(255,215,106,.1)" }}>{a}</div>}
    </div>
  );
}

/* ---- About ---- */
function AboutSection({ onBack }: { onBack: () => void }) {
  const { t } = useSettings();
  const tap = useTap();
  return (
    <>
      <BackHeader title="About & Support" onBack={onBack} />
      <div className="glass-card p-5 text-center mb-4">
        <div className="font-display text-2xl gold-shimmer tracking-[.2em]">ID·SPACE</div>
        <div className="text-xs tracking-[.4em] gold-text mt-1">FINANCE</div>
        <div className="mt-2 text-xs text-emerald-100/60">Built for the Pi Network Ecosystem</div>
        <div className="mt-1 text-xs text-emerald-100/40">Version 2.0.0</div>
        <div className="mt-3 font-[Amiri] text-lg" style={{ color: "#FFD76A" }} dir="rtl">
          بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </div>
        <div className="mt-3 text-xs text-emerald-100/50">
          Developed by Indonesia Digital Pioneer (IDPI)
        </div>
      </div>
      <div className="glass-card p-4 space-y-2">
        {[
          { label: t("profile.support"), sub: "contact@idpi.app" },
          { label: "Website", sub: "idpi.app" },
          { label: "Telegram", sub: "t.me/IDPIofficial" },
        ].map((item) => (
          <button key={item.label} onClick={() => { tap(); toast(t("toast.comingSoon")); }}
            className="w-full flex items-center justify-between rounded-xl px-3 py-3 text-sm text-white transition hover:-translate-y-0.5"
            style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" }}>
            <span>{item.label}</span>
            <span className="text-xs text-emerald-100/50">{item.sub}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ---- Helpers ---- */
function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const tap = useTap();
  return (
    <div className="mb-4 flex items-center gap-3">
      <button onClick={() => { tap(); onBack(); }}
        className="grid h-9 w-9 place-items-center rounded-full glass-card active:scale-90 transition"
        aria-label="Back">
        <ChevronRight className="h-4 w-4 rotate-180" style={{ color: "#FFD76A" }} />
      </button>
      <h1 className="text-lg font-semibold gold-shimmer">{title}</h1>
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2"
      style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.1)" }}>
      <span className="text-xs text-emerald-100/60">{label}</span>
      <span className="text-xs font-medium" style={{ color: valueColor ?? "white" }}>{value}</span>
    </div>
  );
}

function MenuRow({ icon, label, to, onClick }: {
  icon: React.ReactNode; label: string; to?: string; onClick?: () => void;
}) {
  const tap = useTap();
  const cls = "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white transition hover:-translate-y-0.5 active:scale-[.98]";
  const style = { background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" };
  const inner = (
    <>
      <span className="grid h-9 w-9 place-items-center rounded-lg"
        style={{ background: "rgba(11,26,18,.9)", border: "1px solid rgba(255,215,106,.25)" }}>
        <span style={{ color: "#56FF76" }}>{icon}</span>
      </span>
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight className="h-4 w-4 opacity-50" style={{ color: "#FFD76A" }} />
    </>
  );
  return to
    ? <Link to={to} onClick={tap} className={cls} style={style}>{inner}</Link>
    : <button onClick={onClick} className={cls} style={style}>{inner}</button>;
}

function CardField({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg px-2 py-1.5"
      style={{ background: "rgba(5,8,6,.5)", border: `1px solid ${color}20` }}>
      <div className="text-[9px] uppercase tracking-widest opacity-50">{label}</div>
      <div className="text-[11px] font-medium" style={{ color }}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, prefix, multiline }: {
  label: string; value: string; onChange: (v: string) => void; prefix?: string; multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-widest gold-text mb-1">{label}</label>
      <div className="flex items-center rounded-xl overflow-hidden"
        style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.25)" }}>
        {prefix && <span className="pl-3 text-sm text-emerald-100/50">{prefix}</span>}
        {multiline ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-white outline-none resize-none" />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-white outline-none" />
        )}
      </div>
    </div>
  );
}

// Suppress unused import warning
void GoldRing;
