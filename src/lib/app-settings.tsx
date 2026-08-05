import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";

export type Lang = "id" | "en" | "ko" | "zh" | "zhtw" | "ja" | "ar" | "fr" | "de" | "es" | "ru" | "pt";
export type Currency = "PI" | "IDR" | "USD" | "EUR" | "KRW" | "CNY" | "INR" | "SAR";

export const LANGS: { code: Lang; flag: string; name: string; short: string }[] = [
  { code: "id",   flag: "🇮🇩", name: "Bahasa Indonesia", short: "ID" },
  { code: "en",   flag: "🇺🇸", name: "English",         short: "EN" },
  { code: "ar",   flag: "🇸🇦", name: "العربية",          short: "AR" },
  { code: "ja",   flag: "🇯🇵", name: "日本語",            short: "JA" },
  { code: "ko",   flag: "🇰🇷", name: "한국어",            short: "KO" },
  { code: "zh",   flag: "🇨🇳", name: "简体中文",          short: "ZH" },
  { code: "zhtw", flag: "🇹🇼", name: "繁體中文",          short: "TW" },
  { code: "fr",   flag: "🇫🇷", name: "Français",         short: "FR" },
  { code: "de",   flag: "🇩🇪", name: "Deutsch",          short: "DE" },
  { code: "es",   flag: "🇪🇸", name: "Español",          short: "ES" },
  { code: "ru",   flag: "🇷🇺", name: "Русский",          short: "RU" },
  { code: "pt",   flag: "🇵🇹", name: "Português",        short: "PT" },
];

export const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: "PI",  symbol: "π",  label: "Pi Network" },
  { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah" },
  { code: "USD", symbol: "$",  label: "US Dollar" },
  { code: "EUR", symbol: "€",  label: "Euro" },
  { code: "KRW", symbol: "₩",  label: "Korean Won" },
  { code: "CNY", symbol: "¥",  label: "Chinese Yuan" },
  { code: "INR", symbol: "₹",  label: "Indian Rupee" },
  { code: "SAR", symbol: "﷼",  label: "Saudi Riyal" },
];

/* USD → target rates (fiat approximations; PI is live from PiConverter). */
export const USD_RATES: Record<Exclude<Currency, "PI">, number> = {
  USD: 1, IDR: 16258, EUR: 0.92, KRW: 1370, CNY: 7.22, INR: 83.4, SAR: 3.75,
};
/* Fallback live PI/USD used when converter has not fetched yet. */
let LAST_PI_USD = 0.642135;
export function setLivePiUsd(v: number) { if (isFinite(v) && v > 0) LAST_PI_USD = v; }
export function getLivePiUsd() { return LAST_PI_USD; }

/* i18n dictionary */
type Dict = Record<string, string>;
const T: Record<Lang, Dict> = {
  en: {
    "nav.home": "Home", "nav.market": "Market", "nav.play": "Play",
    "nav.assets": "Assets", "nav.alerts": "Alerts", "nav.menu": "Menu",
    "menu.title": "Menu", "menu.close": "Close",
    "menu.home": "Home", "menu.marketplace": "Marketplace", "menu.play": "Play",
    "menu.swap": "Swap Center", "menu.checkin": "Daily Check-In",
    "menu.wallet": "Wallet", "menu.assets": "Assets", "menu.finance": "Finance",
    "menu.mining": "Mining", "menu.rewards": "Rewards", "menu.news": "News",
    "menu.staking": "Staking", "menu.premium": "Premium", "menu.rate": "Rate Us ★",
    "menu.community": "Community", "menu.history": "History",
    "menu.notifications": "Notifications", "menu.settings": "Settings",
    "menu.help": "Help Center", "menu.about": "About", "menu.logout": "Logout",
    "menu.profile": "Profile",
    "settings.title": "Settings", "settings.language": "Language",
    "settings.currency": "Currency", "settings.theme": "Theme",
    "settings.theme.dark": "Dark (Default)",
    "settings.sound": "Sound", "settings.haptic": "Haptic Feedback",
    "settings.autoRefresh": "Auto Refresh", "settings.notifications": "Notifications",
    "settings.privacy": "Privacy", "settings.terms": "Terms", "settings.about": "About",
    "settings.saved": "Preferences saved",
    "common.on": "On", "common.off": "Off", "common.save": "Save", "common.cancel": "Cancel",
    "common.confirm": "Confirm", "common.close": "Close", "common.loading": "Loading…",
    "common.success": "Success", "common.error": "Error", "common.pending": "Pending",
    "common.copy": "Copy", "common.copied": "Copied!",
    "toast.notifications": "You have no new notifications",
    "toast.viewAllNews": "Opening news feed…",
    "toast.comingSoon": "Coming soon",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · All Rights Reserved",
    "profile.title": "Profile", "profile.edit": "Edit Profile",
    "profile.memberId": "Member ID", "profile.walletAddress": "Wallet Address",
    "profile.registered": "Registered", "profile.membership": "Membership",
    "profile.level": "Level", "profile.security": "Security",
    "profile.privacy": "Privacy", "profile.notificationSettings": "Notification Settings",
    "profile.language": "Language", "profile.theme": "Theme",
    "profile.help": "Help Center", "profile.support": "Support",
    "profile.terms": "Terms of Service", "profile.privacyPolicy": "Privacy Policy",
    "profile.logout": "Logout", "profile.islamicCard": "Islamic Profile Card",
    "profile.piWallet": "Pi Wallet", "profile.walletAddressLabel": "Wallet Address",
    "profile.saveChanges": "Save Changes", "profile.editPhoto": "Change Photo",
    "deposit.title": "Deposit IDPoints", "deposit.selectAmount": "Select Amount",
    "deposit.paymentAddress": "Payment Address",
    "deposit.instructions": "Send Pi to the address below. After payment, click Verify.",
    "deposit.pending": "Awaiting Payment…", "deposit.verifying": "Verifying Payment…",
    "deposit.success": "Deposit Successful!", "deposit.verify": "I've Paid — Verify",
    "deposit.cancel": "Cancel",
    "withdraw.title": "Withdraw IDPoints", "withdraw.amount": "Amount",
    "withdraw.address": "Pi Wallet Address", "withdraw.submit": "Submit Withdrawal",
    "withdraw.pending": "Withdrawal Pending Review",
    "withdraw.insufficientBalance": "Insufficient balance",
    "withdraw.minAmount": "Minimum withdrawal: 100 IDPoints",
    "notifications.title": "Notifications", "notifications.empty": "No notifications yet.",
    "notifications.markAllRead": "Mark all as read",
    "wallet.balance": "Balance", "wallet.deposit": "Deposit", "wallet.withdraw": "Withdraw",
    "wallet.swap": "Swap", "wallet.checkin": "Check-In",
    "tx.status.pending": "Pending", "tx.status.success": "Success",
    "tx.status.cancelled": "Cancelled", "tx.status.failed": "Failed",
  },
  id: {
    "nav.home": "Beranda", "nav.market": "Pasar", "nav.play": "Main",
    "nav.assets": "Aset", "nav.alerts": "Notifikasi", "nav.menu": "Menu",
    "menu.title": "Menu", "menu.close": "Tutup",
    "menu.home": "Beranda", "menu.marketplace": "Marketplace", "menu.play": "Hiburan",
    "menu.swap": "Pusat Swap", "menu.checkin": "Check-In Harian",
    "menu.wallet": "Dompet", "menu.assets": "Aset", "menu.finance": "Finansial",
    "menu.mining": "Mining", "menu.rewards": "Hadiah", "menu.news": "Berita",
    "menu.staking": "Staking", "menu.premium": "Premium", "menu.rate": "Beri Rating ★",
    "menu.community": "Komunitas", "menu.history": "Riwayat",
    "menu.notifications": "Notifikasi", "menu.settings": "Pengaturan",
    "menu.help": "Pusat Bantuan", "menu.about": "Tentang", "menu.logout": "Keluar",
    "menu.profile": "Profil",
    "settings.title": "Pengaturan", "settings.language": "Bahasa",
    "settings.currency": "Mata Uang", "settings.theme": "Tema",
    "settings.theme.dark": "Gelap (Default)",
    "settings.sound": "Suara", "settings.haptic": "Getaran",
    "settings.autoRefresh": "Auto Refresh", "settings.notifications": "Notifikasi",
    "settings.privacy": "Privasi", "settings.terms": "Syarat", "settings.about": "Tentang",
    "settings.saved": "Preferensi tersimpan",
    "common.on": "Aktif", "common.off": "Mati", "common.save": "Simpan",
    "common.cancel": "Batal", "common.confirm": "Konfirmasi", "common.close": "Tutup",
    "common.loading": "Memuat…", "common.success": "Berhasil", "common.error": "Kesalahan",
    "common.pending": "Menunggu", "common.copy": "Salin", "common.copied": "Disalin!",
    "toast.notifications": "Belum ada notifikasi baru",
    "toast.viewAllNews": "Membuka berita…",
    "toast.comingSoon": "Segera hadir",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · Hak Cipta Dilindungi",
    "profile.title": "Profil", "profile.edit": "Edit Profil",
    "profile.memberId": "ID Anggota", "profile.walletAddress": "Alamat Wallet",
    "profile.registered": "Terdaftar", "profile.membership": "Keanggotaan",
    "profile.level": "Level", "profile.security": "Keamanan",
    "profile.privacy": "Privasi", "profile.notificationSettings": "Pengaturan Notifikasi",
    "profile.language": "Bahasa", "profile.theme": "Tema",
    "profile.help": "Pusat Bantuan", "profile.support": "Dukungan",
    "profile.terms": "Syarat Layanan", "profile.privacyPolicy": "Kebijakan Privasi",
    "profile.logout": "Keluar", "profile.islamicCard": "Kartu Profil Islam",
    "profile.piWallet": "Dompet Pi", "profile.walletAddressLabel": "Alamat Wallet",
    "profile.saveChanges": "Simpan Perubahan", "profile.editPhoto": "Ganti Foto",
    "deposit.title": "Deposit IDPoints", "deposit.selectAmount": "Pilih Jumlah",
    "deposit.paymentAddress": "Alamat Pembayaran",
    "deposit.instructions": "Kirim Pi ke alamat di bawah. Setelah pembayaran, klik Verifikasi.",
    "deposit.pending": "Menunggu Pembayaran…", "deposit.verifying": "Memverifikasi…",
    "deposit.success": "Deposit Berhasil!", "deposit.verify": "Sudah Bayar — Verifikasi",
    "deposit.cancel": "Batal",
    "withdraw.title": "Tarik IDPoints", "withdraw.amount": "Jumlah",
    "withdraw.address": "Alamat Wallet Pi", "withdraw.submit": "Ajukan Penarikan",
    "withdraw.pending": "Penarikan Menunggu Review",
    "withdraw.insufficientBalance": "Saldo tidak mencukupi",
    "withdraw.minAmount": "Penarikan minimum: 100 IDPoints",
    "notifications.title": "Notifikasi", "notifications.empty": "Belum ada notifikasi.",
    "notifications.markAllRead": "Tandai semua dibaca",
    "wallet.balance": "Saldo", "wallet.deposit": "Deposit", "wallet.withdraw": "Tarik",
    "wallet.swap": "Swap", "wallet.checkin": "Check-In",
    "tx.status.pending": "Menunggu", "tx.status.success": "Berhasil",
    "tx.status.cancelled": "Dibatalkan", "tx.status.failed": "Gagal",
  },
  ar: {
    "nav.home": "الرئيسية", "nav.market": "السوق", "nav.play": "ترفيه",
    "nav.assets": "الأصول", "nav.alerts": "التنبيهات", "nav.menu": "القائمة",
    "menu.title": "القائمة", "menu.close": "إغلاق",
    "menu.home": "الرئيسية", "menu.marketplace": "السوق", "menu.play": "ترفيه",
    "menu.swap": "مركز التبادل", "menu.checkin": "تسجيل يومي",
    "menu.wallet": "المحفظة", "menu.assets": "الأصول", "menu.finance": "المالية",
    "menu.mining": "التعدين", "menu.rewards": "المكافآت", "menu.news": "الأخبار",
    "menu.staking": "التخزين", "menu.premium": "مميز", "menu.rate": "قيّمنا ★",
    "menu.community": "المجتمع", "menu.history": "السجل",
    "menu.notifications": "الإشعارات", "menu.settings": "الإعدادات",
    "menu.help": "مركز المساعدة", "menu.about": "حول", "menu.logout": "خروج",
    "menu.profile": "الملف الشخصي",
    "settings.title": "الإعدادات", "settings.language": "اللغة",
    "settings.currency": "العملة", "settings.theme": "المظهر",
    "settings.theme.dark": "داكن (افتراضي)",
    "settings.sound": "الصوت", "settings.haptic": "الاهتزاز",
    "settings.autoRefresh": "تحديث تلقائي", "settings.notifications": "الإشعارات",
    "settings.privacy": "الخصوصية", "settings.terms": "الشروط", "settings.about": "حول",
    "settings.saved": "تم حفظ التفضيلات",
    "common.on": "تشغيل", "common.off": "إيقاف", "common.save": "حفظ",
    "common.cancel": "إلغاء", "common.confirm": "تأكيد", "common.close": "إغلاق",
    "common.loading": "جارٍ التحميل…", "common.success": "نجاح", "common.error": "خطأ",
    "common.pending": "معلّق", "common.copy": "نسخ", "common.copied": "تم النسخ!",
    "toast.notifications": "لا توجد إشعارات جديدة",
    "toast.comingSoon": "قريباً",
    "footer.copy": "© 2025 IDPI · مبادر رقمي إندونيسي · جميع الحقوق محفوظة",
    "profile.title": "الملف الشخصي", "profile.edit": "تعديل الملف",
    "profile.memberId": "رقم العضوية", "profile.walletAddress": "عنوان المحفظة",
    "profile.registered": "تاريخ التسجيل", "profile.membership": "العضوية",
    "profile.level": "المستوى", "profile.security": "الأمان",
    "profile.privacy": "الخصوصية", "profile.notificationSettings": "إعدادات الإشعارات",
    "profile.logout": "خروج", "profile.islamicCard": "بطاقة الملف الإسلامي",
    "notifications.title": "الإشعارات", "notifications.empty": "لا توجد إشعارات.",
    "notifications.markAllRead": "تحديد الكل كمقروء",
  },
  ja: {
    "nav.home": "ホーム", "nav.market": "マーケット", "nav.play": "プレイ",
    "nav.assets": "資産", "nav.alerts": "通知", "nav.menu": "メニュー",
    "menu.title": "メニュー", "menu.close": "閉じる",
    "menu.home": "ホーム", "menu.marketplace": "マーケット", "menu.play": "エンタメ",
    "menu.swap": "スワップ", "menu.checkin": "毎日チェックイン",
    "menu.wallet": "ウォレット", "menu.assets": "資産", "menu.finance": "ファイナンス",
    "menu.mining": "マイニング", "menu.rewards": "報酬", "menu.news": "ニュース",
    "menu.staking": "ステーキング", "menu.premium": "プレミアム", "menu.rate": "評価する ★",
    "menu.community": "コミュニティ", "menu.history": "履歴",
    "menu.notifications": "通知", "menu.settings": "設定",
    "menu.help": "ヘルプ", "menu.about": "概要", "menu.logout": "ログアウト",
    "menu.profile": "プロフィール",
    "settings.title": "設定", "settings.language": "言語",
    "settings.currency": "通貨", "settings.theme": "テーマ",
    "settings.theme.dark": "ダーク（デフォルト）",
    "settings.sound": "サウンド", "settings.haptic": "触覚フィードバック",
    "settings.autoRefresh": "自動更新", "settings.notifications": "通知",
    "settings.privacy": "プライバシー", "settings.terms": "利用規約",
    "settings.about": "概要", "settings.saved": "設定を保存しました",
    "common.on": "オン", "common.off": "オフ", "common.save": "保存",
    "common.cancel": "キャンセル", "common.confirm": "確認", "common.close": "閉じる",
    "common.loading": "読み込み中…", "common.success": "成功", "common.error": "エラー",
    "common.pending": "保留中", "common.copy": "コピー", "common.copied": "コピーしました！",
    "toast.notifications": "新しい通知はありません",
    "toast.comingSoon": "近日公開",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · 全著作権所有",
    "profile.title": "プロフィール", "profile.edit": "プロフィール編集",
    "profile.memberId": "会員ID", "profile.walletAddress": "ウォレットアドレス",
    "profile.registered": "登録日", "profile.membership": "会員資格",
    "profile.level": "レベル", "profile.security": "セキュリティ",
    "profile.privacy": "プライバシー", "profile.logout": "ログアウト",
    "profile.islamicCard": "イスラムプロフィールカード",
    "notifications.title": "通知", "notifications.empty": "通知はありません。",
    "notifications.markAllRead": "すべて既読にする",
  },
  ko: {
    "nav.home": "홈", "nav.market": "마켓", "nav.play": "플레이",
    "nav.assets": "자산", "nav.alerts": "알림", "nav.menu": "메뉴",
    "menu.title": "메뉴", "menu.close": "닫기",
    "menu.home": "홈", "menu.marketplace": "마켓플레이스", "menu.play": "엔터테인먼트",
    "menu.swap": "스왑 센터", "menu.checkin": "일일 체크인",
    "menu.wallet": "지갑", "menu.assets": "자산", "menu.finance": "금융",
    "menu.mining": "마이닝", "menu.rewards": "보상", "menu.news": "뉴스",
    "menu.staking": "스테이킹", "menu.premium": "프리미엄", "menu.rate": "평가하기 ★",
    "menu.community": "커뮤니티", "menu.history": "내역",
    "menu.notifications": "알림", "menu.settings": "설정",
    "menu.help": "도움말", "menu.about": "정보", "menu.logout": "로그아웃",
    "menu.profile": "프로필",
    "settings.title": "설정", "settings.language": "언어",
    "settings.currency": "통화", "settings.theme": "테마",
    "settings.theme.dark": "다크 (기본값)",
    "settings.sound": "사운드", "settings.haptic": "진동 피드백",
    "settings.autoRefresh": "자동 새로고침", "settings.notifications": "알림",
    "settings.privacy": "개인정보", "settings.terms": "약관",
    "settings.about": "정보", "settings.saved": "설정이 저장되었습니다",
    "common.on": "켜짐", "common.off": "꺼짐", "common.save": "저장",
    "common.cancel": "취소", "common.confirm": "확인", "common.close": "닫기",
    "common.loading": "로딩 중…", "common.success": "성공", "common.error": "오류",
    "common.pending": "대기 중", "common.copy": "복사", "common.copied": "복사됨!",
    "toast.notifications": "새 알림이 없습니다",
    "toast.comingSoon": "준비 중",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · 저작권 보호",
    "profile.title": "프로필", "profile.edit": "프로필 편집",
    "profile.memberId": "회원 ID", "profile.walletAddress": "지갑 주소",
    "profile.registered": "가입일", "profile.membership": "멤버십",
    "profile.level": "레벨", "profile.security": "보안",
    "profile.privacy": "개인정보", "profile.logout": "로그아웃",
    "profile.islamicCard": "이슬람 프로필 카드",
    "notifications.title": "알림", "notifications.empty": "알림이 없습니다.",
    "notifications.markAllRead": "모두 읽음 표시",
  },
  zh: {
    "nav.home": "首页", "nav.market": "市场", "nav.play": "娱乐",
    "nav.assets": "资产", "nav.alerts": "通知", "nav.menu": "菜单",
    "menu.title": "菜单", "menu.close": "关闭",
    "menu.home": "首页", "menu.marketplace": "市场", "menu.play": "娱乐",
    "menu.swap": "兑换中心", "menu.checkin": "每日签到",
    "menu.wallet": "钱包", "menu.assets": "资产", "menu.finance": "金融",
    "menu.mining": "挖矿", "menu.rewards": "奖励", "menu.news": "新闻",
    "menu.staking": "质押", "menu.premium": "高级", "menu.rate": "评分 ★",
    "menu.community": "社区", "menu.history": "历史",
    "menu.notifications": "通知", "menu.settings": "设置",
    "menu.help": "帮助中心", "menu.about": "关于", "menu.logout": "退出",
    "menu.profile": "个人资料",
    "settings.title": "设置", "settings.language": "语言",
    "settings.currency": "货币", "settings.theme": "主题",
    "settings.theme.dark": "深色（默认）",
    "settings.sound": "声音", "settings.haptic": "触感反馈",
    "settings.autoRefresh": "自动刷新", "settings.notifications": "通知",
    "settings.privacy": "隐私", "settings.terms": "条款",
    "settings.about": "关于", "settings.saved": "偏好已保存",
    "common.on": "开", "common.off": "关", "common.save": "保存",
    "common.cancel": "取消", "common.confirm": "确认", "common.close": "关闭",
    "common.loading": "加载中…", "common.success": "成功", "common.error": "错误",
    "common.pending": "待处理", "common.copy": "复制", "common.copied": "已复制！",
    "toast.notifications": "没有新通知",
    "toast.comingSoon": "即将推出",
    "footer.copy": "© 2025 IDPI · 印度尼西亚数字先驱 · 版权所有",
    "profile.title": "个人资料", "profile.edit": "编辑资料",
    "profile.memberId": "会员ID", "profile.walletAddress": "钱包地址",
    "profile.registered": "注册日期", "profile.membership": "会员资格",
    "profile.level": "等级", "profile.security": "安全",
    "profile.privacy": "隐私", "profile.logout": "退出",
    "profile.islamicCard": "伊斯兰个人资料卡",
    "notifications.title": "通知", "notifications.empty": "暂无通知。",
    "notifications.markAllRead": "全部标为已读",
  },
  zhtw: {
    "nav.home": "首頁", "nav.market": "市場", "nav.play": "娛樂",
    "nav.assets": "資產", "nav.alerts": "通知", "nav.menu": "選單",
    "menu.title": "選單", "menu.close": "關閉",
    "menu.home": "首頁", "menu.marketplace": "市集", "menu.play": "娛樂",
    "menu.swap": "兌換中心", "menu.checkin": "每日簽到",
    "menu.wallet": "錢包", "menu.assets": "資產", "menu.finance": "金融",
    "menu.mining": "挖礦", "menu.rewards": "獎勵", "menu.news": "新聞",
    "menu.staking": "質押", "menu.premium": "高級", "menu.rate": "評分 ★",
    "menu.community": "社群", "menu.history": "歷史",
    "menu.notifications": "通知", "menu.settings": "設定",
    "menu.help": "說明中心", "menu.about": "關於", "menu.logout": "登出",
    "menu.profile": "個人資料",
    "settings.title": "設定", "settings.language": "語言",
    "settings.currency": "貨幣", "settings.theme": "主題",
    "settings.theme.dark": "深色（預設）",
    "settings.sound": "聲音", "settings.haptic": "觸感回饋",
    "settings.autoRefresh": "自動重新整理", "settings.notifications": "通知",
    "settings.privacy": "隱私", "settings.terms": "條款",
    "settings.about": "關於", "settings.saved": "偏好已儲存",
    "common.on": "開", "common.off": "關", "common.save": "儲存",
    "common.cancel": "取消", "common.confirm": "確認", "common.close": "關閉",
    "common.loading": "載入中…", "common.success": "成功", "common.error": "錯誤",
    "common.pending": "待處理", "common.copy": "複製", "common.copied": "已複製！",
    "toast.notifications": "沒有新通知",
    "toast.comingSoon": "即將推出",
    "footer.copy": "© 2025 IDPI · 印尼數位先驅 · 版權所有",
    "profile.title": "個人資料", "profile.edit": "編輯資料",
    "profile.memberId": "會員ID", "profile.walletAddress": "錢包地址",
    "profile.registered": "註冊日期", "profile.membership": "會員資格",
    "profile.level": "等級", "profile.security": "安全",
    "profile.privacy": "隱私", "profile.logout": "登出",
    "profile.islamicCard": "伊斯蘭個人資料卡",
    "notifications.title": "通知", "notifications.empty": "暫無通知。",
    "notifications.markAllRead": "全部標為已讀",
  },
  fr: {
    "nav.home": "Accueil", "nav.market": "Marché", "nav.play": "Jouer",
    "nav.assets": "Actifs", "nav.alerts": "Alertes", "nav.menu": "Menu",
    "menu.title": "Menu", "menu.close": "Fermer",
    "menu.home": "Accueil", "menu.marketplace": "Marché", "menu.play": "Divertissement",
    "menu.swap": "Centre d'échange", "menu.checkin": "Check-In quotidien",
    "menu.wallet": "Portefeuille", "menu.assets": "Actifs", "menu.finance": "Finance",
    "menu.mining": "Minage", "menu.rewards": "Récompenses", "menu.news": "Actualités",
    "menu.staking": "Staking", "menu.premium": "Premium", "menu.rate": "Notez-nous ★",
    "menu.community": "Communauté", "menu.history": "Historique",
    "menu.notifications": "Notifications", "menu.settings": "Paramètres",
    "menu.help": "Centre d'aide", "menu.about": "À propos", "menu.logout": "Déconnexion",
    "menu.profile": "Profil",
    "settings.title": "Paramètres", "settings.language": "Langue",
    "settings.currency": "Devise", "settings.theme": "Thème",
    "settings.theme.dark": "Sombre (Défaut)",
    "settings.sound": "Son", "settings.haptic": "Retour haptique",
    "settings.autoRefresh": "Actualisation auto", "settings.notifications": "Notifications",
    "settings.privacy": "Confidentialité", "settings.terms": "Conditions",
    "settings.about": "À propos", "settings.saved": "Préférences sauvegardées",
    "common.on": "Activé", "common.off": "Désactivé", "common.save": "Enregistrer",
    "common.cancel": "Annuler", "common.confirm": "Confirmer", "common.close": "Fermer",
    "common.loading": "Chargement…", "common.success": "Succès", "common.error": "Erreur",
    "common.pending": "En attente", "common.copy": "Copier", "common.copied": "Copié !",
    "toast.notifications": "Aucune nouvelle notification",
    "toast.comingSoon": "Bientôt disponible",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · Tous droits réservés",
    "profile.title": "Profil", "profile.edit": "Modifier le profil",
    "profile.memberId": "ID Membre", "profile.walletAddress": "Adresse du portefeuille",
    "profile.registered": "Inscrit le", "profile.membership": "Adhésion",
    "profile.level": "Niveau", "profile.security": "Sécurité",
    "profile.privacy": "Confidentialité", "profile.logout": "Déconnexion",
    "profile.islamicCard": "Carte de profil islamique",
    "notifications.title": "Notifications", "notifications.empty": "Aucune notification.",
    "notifications.markAllRead": "Tout marquer comme lu",
  },
  de: {
    "nav.home": "Startseite", "nav.market": "Markt", "nav.play": "Spielen",
    "nav.assets": "Assets", "nav.alerts": "Benachrichtigungen", "nav.menu": "Menü",
    "menu.title": "Menü", "menu.close": "Schließen",
    "menu.home": "Startseite", "menu.marketplace": "Marktplatz", "menu.play": "Unterhaltung",
    "menu.swap": "Tauschzentrum", "menu.checkin": "Tägliches Check-In",
    "menu.wallet": "Geldbörse", "menu.assets": "Assets", "menu.finance": "Finanzen",
    "menu.mining": "Mining", "menu.rewards": "Belohnungen", "menu.news": "Nachrichten",
    "menu.staking": "Staking", "menu.premium": "Premium", "menu.rate": "Bewerten ★",
    "menu.community": "Gemeinschaft", "menu.history": "Verlauf",
    "menu.notifications": "Benachrichtigungen", "menu.settings": "Einstellungen",
    "menu.help": "Hilfezentrum", "menu.about": "Über uns", "menu.logout": "Abmelden",
    "menu.profile": "Profil",
    "settings.title": "Einstellungen", "settings.language": "Sprache",
    "settings.currency": "Währung", "settings.theme": "Design",
    "settings.theme.dark": "Dunkel (Standard)",
    "settings.sound": "Ton", "settings.haptic": "Haptisches Feedback",
    "settings.autoRefresh": "Auto-Aktualisierung", "settings.notifications": "Benachrichtigungen",
    "settings.privacy": "Datenschutz", "settings.terms": "Bedingungen",
    "settings.about": "Über uns", "settings.saved": "Einstellungen gespeichert",
    "common.on": "Ein", "common.off": "Aus", "common.save": "Speichern",
    "common.cancel": "Abbrechen", "common.confirm": "Bestätigen", "common.close": "Schließen",
    "common.loading": "Lädt…", "common.success": "Erfolg", "common.error": "Fehler",
    "common.pending": "Ausstehend", "common.copy": "Kopieren", "common.copied": "Kopiert!",
    "toast.notifications": "Keine neuen Benachrichtigungen",
    "toast.comingSoon": "Demnächst verfügbar",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · Alle Rechte vorbehalten",
    "profile.title": "Profil", "profile.edit": "Profil bearbeiten",
    "profile.memberId": "Mitglieds-ID", "profile.walletAddress": "Wallet-Adresse",
    "profile.registered": "Registriert", "profile.membership": "Mitgliedschaft",
    "profile.level": "Level", "profile.security": "Sicherheit",
    "profile.privacy": "Datenschutz", "profile.logout": "Abmelden",
    "profile.islamicCard": "Islamische Profilkarte",
    "notifications.title": "Benachrichtigungen", "notifications.empty": "Keine Benachrichtigungen.",
    "notifications.markAllRead": "Alle als gelesen markieren",
  },
  es: {
    "nav.home": "Inicio", "nav.market": "Mercado", "nav.play": "Jugar",
    "nav.assets": "Activos", "nav.alerts": "Alertas", "nav.menu": "Menú",
    "menu.title": "Menú", "menu.close": "Cerrar",
    "menu.home": "Inicio", "menu.marketplace": "Mercado", "menu.play": "Entretenimiento",
    "menu.swap": "Centro de Swap", "menu.checkin": "Check-In diario",
    "menu.wallet": "Billetera", "menu.assets": "Activos", "menu.finance": "Finanzas",
    "menu.mining": "Minería", "menu.rewards": "Recompensas", "menu.news": "Noticias",
    "menu.staking": "Staking", "menu.premium": "Premium", "menu.rate": "Calificar ★",
    "menu.community": "Comunidad", "menu.history": "Historial",
    "menu.notifications": "Notificaciones", "menu.settings": "Ajustes",
    "menu.help": "Centro de ayuda", "menu.about": "Acerca de", "menu.logout": "Cerrar sesión",
    "menu.profile": "Perfil",
    "settings.title": "Ajustes", "settings.language": "Idioma",
    "settings.currency": "Moneda", "settings.theme": "Tema",
    "settings.theme.dark": "Oscuro (Predeterminado)",
    "settings.sound": "Sonido", "settings.haptic": "Retroalimentación háptica",
    "settings.autoRefresh": "Actualización automática", "settings.notifications": "Notificaciones",
    "settings.privacy": "Privacidad", "settings.terms": "Términos",
    "settings.about": "Acerca de", "settings.saved": "Preferencias guardadas",
    "common.on": "Activado", "common.off": "Desactivado", "common.save": "Guardar",
    "common.cancel": "Cancelar", "common.confirm": "Confirmar", "common.close": "Cerrar",
    "common.loading": "Cargando…", "common.success": "Éxito", "common.error": "Error",
    "common.pending": "Pendiente", "common.copy": "Copiar", "common.copied": "¡Copiado!",
    "toast.notifications": "No hay notificaciones nuevas",
    "toast.comingSoon": "Próximamente",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · Todos los derechos reservados",
    "profile.title": "Perfil", "profile.edit": "Editar perfil",
    "profile.memberId": "ID de miembro", "profile.walletAddress": "Dirección de billetera",
    "profile.registered": "Registrado", "profile.membership": "Membresía",
    "profile.level": "Nivel", "profile.security": "Seguridad",
    "profile.privacy": "Privacidad", "profile.logout": "Cerrar sesión",
    "profile.islamicCard": "Tarjeta de perfil islámico",
    "notifications.title": "Notificaciones", "notifications.empty": "Sin notificaciones.",
    "notifications.markAllRead": "Marcar todo como leído",
  },
  ru: {
    "nav.home": "Главная", "nav.market": "Рынок", "nav.play": "Игра",
    "nav.assets": "Активы", "nav.alerts": "Уведомления", "nav.menu": "Меню",
    "menu.title": "Меню", "menu.close": "Закрыть",
    "menu.home": "Главная", "menu.marketplace": "Маркетплейс", "menu.play": "Развлечения",
    "menu.swap": "Центр обмена", "menu.checkin": "Ежедневный чек-ин",
    "menu.wallet": "Кошелёк", "menu.assets": "Активы", "menu.finance": "Финансы",
    "menu.mining": "Майнинг", "menu.rewards": "Награды", "menu.news": "Новости",
    "menu.staking": "Стейкинг", "menu.premium": "Премиум", "menu.rate": "Оценить ★",
    "menu.community": "Сообщество", "menu.history": "История",
    "menu.notifications": "Уведомления", "menu.settings": "Настройки",
    "menu.help": "Справочный центр", "menu.about": "О нас", "menu.logout": "Выйти",
    "menu.profile": "Профиль",
    "settings.title": "Настройки", "settings.language": "Язык",
    "settings.currency": "Валюта", "settings.theme": "Тема",
    "settings.theme.dark": "Тёмная (По умолчанию)",
    "settings.sound": "Звук", "settings.haptic": "Тактильная обратная связь",
    "settings.autoRefresh": "Авто-обновление", "settings.notifications": "Уведомления",
    "settings.privacy": "Конфиденциальность", "settings.terms": "Условия",
    "settings.about": "О нас", "settings.saved": "Настройки сохранены",
    "common.on": "Вкл", "common.off": "Выкл", "common.save": "Сохранить",
    "common.cancel": "Отмена", "common.confirm": "Подтвердить", "common.close": "Закрыть",
    "common.loading": "Загрузка…", "common.success": "Успех", "common.error": "Ошибка",
    "common.pending": "Ожидание", "common.copy": "Копировать", "common.copied": "Скопировано!",
    "toast.notifications": "Нет новых уведомлений",
    "toast.comingSoon": "Скоро",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · Все права защищены",
    "profile.title": "Профиль", "profile.edit": "Редактировать профиль",
    "profile.memberId": "ID участника", "profile.walletAddress": "Адрес кошелька",
    "profile.registered": "Зарегистрирован", "profile.membership": "Членство",
    "profile.level": "Уровень", "profile.security": "Безопасность",
    "profile.privacy": "Конфиденциальность", "profile.logout": "Выйти",
    "profile.islamicCard": "Исламская карточка профиля",
    "notifications.title": "Уведомления", "notifications.empty": "Нет уведомлений.",
    "notifications.markAllRead": "Отметить все как прочитанные",
  },
  pt: {
    "nav.home": "Início", "nav.market": "Mercado", "nav.play": "Jogar",
    "nav.assets": "Ativos", "nav.alerts": "Alertas", "nav.menu": "Menu",
    "menu.title": "Menu", "menu.close": "Fechar",
    "menu.home": "Início", "menu.marketplace": "Mercado", "menu.play": "Entretenimento",
    "menu.swap": "Centro de Swap", "menu.checkin": "Check-In diário",
    "menu.wallet": "Carteira", "menu.assets": "Ativos", "menu.finance": "Finanças",
    "menu.mining": "Mineração", "menu.rewards": "Recompensas", "menu.news": "Notícias",
    "menu.staking": "Staking", "menu.premium": "Premium", "menu.rate": "Avaliar ★",
    "menu.community": "Comunidade", "menu.history": "Histórico",
    "menu.notifications": "Notificações", "menu.settings": "Configurações",
    "menu.help": "Central de ajuda", "menu.about": "Sobre", "menu.logout": "Sair",
    "menu.profile": "Perfil",
    "settings.title": "Configurações", "settings.language": "Idioma",
    "settings.currency": "Moeda", "settings.theme": "Tema",
    "settings.theme.dark": "Escuro (Padrão)",
    "settings.sound": "Som", "settings.haptic": "Feedback háptico",
    "settings.autoRefresh": "Atualização automática", "settings.notifications": "Notificações",
    "settings.privacy": "Privacidade", "settings.terms": "Termos",
    "settings.about": "Sobre", "settings.saved": "Preferências salvas",
    "common.on": "Ligado", "common.off": "Desligado", "common.save": "Salvar",
    "common.cancel": "Cancelar", "common.confirm": "Confirmar", "common.close": "Fechar",
    "common.loading": "Carregando…", "common.success": "Sucesso", "common.error": "Erro",
    "common.pending": "Pendente", "common.copy": "Copiar", "common.copied": "Copiado!",
    "toast.notifications": "Nenhuma notificação nova",
    "toast.comingSoon": "Em breve",
    "footer.copy": "© 2025 IDPI · Indonesia Digital Pioneer · Todos os direitos reservados",
    "profile.title": "Perfil", "profile.edit": "Editar perfil",
    "profile.memberId": "ID de membro", "profile.walletAddress": "Endereço da carteira",
    "profile.registered": "Registrado", "profile.membership": "Associação",
    "profile.level": "Nível", "profile.security": "Segurança",
    "profile.privacy": "Privacidade", "profile.logout": "Sair",
    "profile.islamicCard": "Cartão de perfil islâmico",
    "notifications.title": "Notificações", "notifications.empty": "Sem notificações.",
    "notifications.markAllRead": "Marcar tudo como lido",
  },
};

type Settings = {
  lang: Lang;
  currency: Currency;
  sound: boolean;
  haptic: boolean;
  autoRefresh: boolean;
  notifications: boolean;
};

const DEFAULT: Settings = {
  lang: "id", currency: "IDR", sound: true, haptic: true,
  autoRefresh: true, notifications: true,
};

type Ctx = Settings & {
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  t: (key: string) => string;
  fmt: (usd: number) => string;
  convert: (usd: number) => number;
  symbol: string;
  playClick: () => void;
  tapHaptic: () => void;
};

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("idspace.settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        // Validate lang is still a supported code
        const validLangs = LANGS.map((l) => l.code);
        if (parsed.lang && !validLangs.includes(parsed.lang)) parsed.lang = DEFAULT.lang;
        setS({ ...DEFAULT, ...parsed });
      }
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((next: Settings) => {
    setS(next);
    try { localStorage.setItem("idspace.settings", JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    persist({ ...s, [key]: value });
  }, [s, persist]);

  const t = useCallback((key: string) => {
    return T[s.lang]?.[key] ?? T.en[key] ?? key;
  }, [s.lang]);

  const convert = useCallback((usd: number) => {
    if (s.currency === "PI") {
      const p = getLivePiUsd();
      return p > 0 ? usd / p : 0;
    }
    return usd * USD_RATES[s.currency];
  }, [s.currency]);

  const symbol = useMemo(
    () => CURRENCIES.find(c => c.code === s.currency)?.symbol ?? "$",
    [s.currency]
  );

  const fmt = useCallback((usd: number) => {
    const v = convert(usd);
    const digits = s.currency === "IDR" || s.currency === "KRW" ? 0
      : s.currency === "PI" ? 4 : 2;
    return `${symbol}${v.toLocaleString("en-US", {
      minimumFractionDigits: digits, maximumFractionDigits: digits,
    })}`;
  }, [convert, s.currency, symbol]);

  const playClick = useCallback(() => {
    if (!s.sound || typeof window === "undefined") return;
    try {
      const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      if (!AC) return;
      const ctx = new AC();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.value = 0.03;
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.06);
      setTimeout(() => ctx.close(), 120);
    } catch { /* ignore */ }
  }, [s.sound]);

  const tapHaptic = useCallback(() => {
    if (!s.haptic || typeof navigator === "undefined") return;
    if ("vibrate" in navigator) navigator.vibrate?.(8);
  }, [s.haptic]);

  const value = useMemo<Ctx>(() => ({
    ...s, set, t, fmt, convert, symbol, playClick, tapHaptic,
  }), [s, set, t, fmt, convert, symbol, playClick, tapHaptic]);

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  const v = useContext(SettingsCtx);
  if (!v) throw new Error("useSettings must be used within <SettingsProvider>");
  return v;
}

/** Convenience hook: call `tap()` inside any onClick to run haptic + sound. */
export function useTap() {
  const { playClick, tapHaptic } = useSettings();
  return useCallback(() => { tapHaptic(); playClick(); }, [playClick, tapHaptic]);
}
