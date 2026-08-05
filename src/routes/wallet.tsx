import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState, useEffect } from "react";
import {
  Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, ArrowDownUp,
  Gift, History as HistoryIcon, Coins, Sparkles, X, Loader2, Check,
  Copy, AlertCircle, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, SectionTitle, GoldRing } from "@/components/idspace/shell";
import {
  useIdpointsBalance, useSwapHistory, useTransactions, useCheckin,
  createPendingDeposit, confirmDeposit, cancelDeposit,
  createPendingWithdraw,
  type TxStatus,
} from "@/lib/idpoints-store";
import { useMarket } from "@/lib/market-store";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
  head: () => ({
    meta: [
      { title: "Wallet — IDPI" },
      { name: "description", content: "Your Pi and IDPoints wallet: balances, deposits, swaps, and rewards." },
    ],
  }),
});

/* ---- Deposit amounts ---- */
const DEPOSIT_OPTIONS = [
  { idp: 1000, pi: 0.74 },
  { idp: 5000, pi: 3.70 },
  { idp: 10000, pi: 7.40 },
  { idp: 25000, pi: 18.50 },
];

/* Pi payment address — demo */
const PI_PAYMENT_ADDRESS = "GC5XKAQEDLNPTJQZFBFNACUMHCPQLJQVJQHXW4JY7K2M";

type DepositStep = "select" | "pay" | "verifying" | "done";
type WithdrawStep = "form" | "confirming" | "done";

function WalletPage() {
  const { balance } = useIdpointsBalance();
  const { txs } = useTransactions();
  const { items: swaps } = useSwapHistory();
  const { state: checkin } = useCheckin();
  const m = useMarket();

  const idrValue = useMemo(() => Math.floor(balance / 9), [balance]);
  const usdValue = useMemo(
    () => (m.usdIdr > 0 ? idrValue / m.usdIdr : 0),
    [idrValue, m.usdIdr],
  );

  /* Deposit modal state */
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositStep, setDepositStep] = useState<DepositStep>("select");
  const [selectedDeposit, setSelectedDeposit] = useState(DEPOSIT_OPTIONS[0]);
  const [pendingDepositId, setPendingDepositId] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [verifyTimer, setVerifyTimer] = useState(0);

  /* Withdraw modal state */
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<WithdrawStep>("form");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawTxId, setWithdrawTxId] = useState<string | null>(null);

  /* Reset deposit modal */
  const openDeposit = () => {
    setDepositStep("select");
    setPendingDepositId(null);
    setVerifyTimer(0);
    setDepositOpen(true);
  };

  /* Proceed to payment step */
  const startPayment = () => {
    const txId = createPendingDeposit(
      selectedDeposit.idp,
      `Deposit ${selectedDeposit.idp.toLocaleString()} IDPoints`
    );
    setPendingDepositId(txId);
    setDepositStep("pay");
    setVerifyTimer(0);
  };

  /* User clicked "I've paid — verify" */
  const verifyPayment = useCallback(() => {
    if (!pendingDepositId) return;
    setDepositStep("verifying");
    // Simulate verification delay (3 seconds)
    setTimeout(() => {
      confirmDeposit(pendingDepositId!);
      setDepositStep("done");
      toast.success(`+${selectedDeposit.idp.toLocaleString()} IDPoints deposited!`);
    }, 3000);
  }, [pendingDepositId, selectedDeposit.idp]);

  /* Cancel deposit */
  const cancelDepositFlow = () => {
    if (pendingDepositId && depositStep === "pay") {
      cancelDeposit(pendingDepositId);
    }
    setDepositOpen(false);
  };

  /* Copy Pi address */
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(PI_PAYMENT_ADDRESS);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
      toast.success("Address copied!");
    } catch { toast.error("Copy failed"); }
  };

  /* Countdown timer when on payment step */
  useEffect(() => {
    if (depositStep !== "pay") return;
    const t = setInterval(() => setVerifyTimer((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [depositStep]);

  /* Withdraw */
  const openWithdraw = () => {
    setWithdrawStep("form");
    setWithdrawAmount("");
    setWithdrawAddress("");
    setWithdrawTxId(null);
    setWithdrawOpen(true);
  };

  const submitWithdraw = () => {
    const amt = parseInt(withdrawAmount.replace(/,/g, ""), 10);
    if (!amt || amt < 100) { toast.error("Minimum withdrawal: 100 IDPoints"); return; }
    if (amt > balance) { toast.error("Insufficient balance"); return; }
    if (!withdrawAddress.trim()) { toast.error("Please enter your Pi wallet address"); return; }
    const txId = createPendingWithdraw(amt, `Withdraw ${amt.toLocaleString()} IDPoints`);
    if (!txId) { toast.error("Insufficient balance"); return; }
    setWithdrawTxId(txId);
    setWithdrawStep("confirming");
    // Simulate admin processing (5 seconds → approved in demo)
    setTimeout(() => {
      setWithdrawStep("done");
      toast.success("Withdrawal submitted for review");
    }, 5000);
  };

  return (
    <AppShell active="Wallet">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 text-center">
          <div className="text-[11px] tracking-[.4em] gold-text uppercase">IDPI • Wallet</div>
          <h1 className="mt-1 font-display text-3xl gold-shimmer">My Wallet</h1>
        </div>

        {/* Balances */}
        <div className="grid gap-3 md:grid-cols-2">
          <BalanceCard
            symbol="π" label="Pi Balance"
            value="0.00000000 PI"
            sub="Connect Pi Wallet to sync"
            color="#FFD76A"
          />
          <BalanceCard
            symbol="◈" label="IDPoints Balance"
            value={`${balance.toLocaleString()} IDP`}
            sub={`≈ Rp${idrValue.toLocaleString()} · $${usdValue.toFixed(2)}`}
            color="#56FF76"
          />
        </div>

        {/* Actions */}
        <div className="glass-card p-4 mt-4">
          <SectionTitle icon={<Sparkles className="h-4 w-4"/>} title="ACTIONS"/>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ActionButton icon={<ArrowDownToLine className="h-5 w-5"/>} label="Deposit" onClick={openDeposit}/>
            <ActionButton icon={<ArrowUpFromLine className="h-5 w-5"/>} label="Withdraw" onClick={openWithdraw}/>
            <ActionLink icon={<ArrowDownUp className="h-5 w-5"/>} label="Swap" to="/swap"/>
            <ActionLink icon={<Gift className="h-5 w-5"/>} label="Check-In" to="/checkin"/>
          </div>
        </div>

        {/* Transaction history */}
        <div className="glass-card p-4 mt-4">
          <SectionTitle icon={<HistoryIcon className="h-4 w-4"/>} title="TRANSACTION HISTORY"/>
          {txs.length === 0 ? (
            <Empty>No transactions yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {txs.slice(0, 30).map((tx) => (
                <li key={tx.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                    style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                  <span className="flex items-center gap-2 text-white">
                    <StatusIcon status={tx.status} />
                    <span className="uppercase text-[10px] gold-text w-20">{tx.kind}</span>
                    <span className="text-emerald-100/70 truncate max-w-[120px]">{tx.note}</span>
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="font-mono" style={{
                      color: tx.status === "pending" ? "#FFD76A"
                           : tx.status === "failed" || tx.status === "cancelled" ? "#FF7676"
                           : tx.delta >= 0 ? "#56FF76" : "#FF7676"
                    }}>
                      {tx.delta >= 0 ? "+" : ""}{tx.delta.toLocaleString()}
                    </span>
                    <StatusBadge status={tx.status} />
                    <span className="text-emerald-100/40">{new Date(tx.at).toLocaleTimeString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Swap history */}
        <div className="glass-card p-4 mt-4">
          <SectionTitle icon={<ArrowDownUp className="h-4 w-4"/>} title="SWAP HISTORY"
            right={<Link to="/swap" className="text-[11px] gold-text hover:underline">Open Swap</Link>}/>
          {swaps.length === 0 ? <Empty>No swaps yet.</Empty> : (
            <ul className="space-y-2">
              {swaps.slice(0, 10).map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                    style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                  <span className="font-mono text-white">
                    {h.amount.toLocaleString()} {h.from} → {h.result.toLocaleString()} {h.to}
                  </span>
                  <span className="text-emerald-100/50">{new Date(h.at).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reward history */}
        <div className="glass-card p-4 mt-4">
          <SectionTitle icon={<Gift className="h-4 w-4"/>} title="REWARD HISTORY"
            right={<Link to="/checkin" className="text-[11px] gold-text hover:underline">Open Check-In</Link>}/>
          {checkin.history.length === 0 ? <Empty>No rewards claimed yet.</Empty> : (
            <ul className="space-y-2">
              {checkin.history.slice(0, 10).map((r) => (
                <li key={r.at} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs"
                    style={{ background: "rgba(5,8,6,.5)", border: "1px solid rgba(255,215,106,.12)" }}>
                  <span className="text-white">Day {r.day} · <span className="gold-text">+{r.amount.toLocaleString()}</span> IDPoints</span>
                  <span className="text-emerald-100/50">{new Date(r.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {depositOpen && (
        <Modal onClose={depositStep === "verifying" ? undefined : cancelDepositFlow}>
          <DepositFlow
            step={depositStep}
            selected={selectedDeposit}
            onSelect={setSelectedDeposit}
            onProceed={startPayment}
            onVerify={verifyPayment}
            onCancel={cancelDepositFlow}
            onDone={() => setDepositOpen(false)}
            address={PI_PAYMENT_ADDRESS}
            copiedAddress={copiedAddress}
            onCopyAddress={copyAddress}
            timer={verifyTimer}
          />
        </Modal>
      )}

      {/* Withdraw Modal */}
      {withdrawOpen && (
        <Modal onClose={withdrawStep === "confirming" ? undefined : () => setWithdrawOpen(false)}>
          <WithdrawFlow
            step={withdrawStep}
            amount={withdrawAmount}
            setAmount={setWithdrawAmount}
            address={withdrawAddress}
            setAddress={setWithdrawAddress}
            balance={balance}
            txId={withdrawTxId}
            onSubmit={submitWithdraw}
            onDone={() => setWithdrawOpen(false)}
          />
        </Modal>
      )}
    </AppShell>
  );
}

/* ---- Deposit Flow ---- */
function DepositFlow({
  step, selected, onSelect, onProceed, onVerify, onCancel, onDone,
  address, copiedAddress, onCopyAddress, timer,
}: {
  step: DepositStep;
  selected: (typeof DEPOSIT_OPTIONS)[number];
  onSelect: (o: (typeof DEPOSIT_OPTIONS)[number]) => void;
  onProceed: () => void;
  onVerify: () => void;
  onCancel: () => void;
  onDone: () => void;
  address: string;
  copiedAddress: boolean;
  onCopyAddress: () => void;
  timer: number;
}) {
  if (step === "done") return (
    <div className="text-center py-4">
      <CheckCircle2 className="mx-auto h-16 w-16 mb-4" style={{ color: "#56FF76" }} />
      <div className="text-xl font-semibold text-white mb-2">Deposit Successful!</div>
      <div className="text-sm text-emerald-100/60 mb-6">
        {selected.idp.toLocaleString()} IDPoints have been credited to your wallet.
      </div>
      <button onClick={onDone}
        className="w-full rounded-xl py-3 text-sm font-bold text-black"
        style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}>
        Done
      </button>
    </div>
  );

  if (step === "verifying") return (
    <div className="text-center py-4">
      <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin" style={{ color: "#FFD76A" }} />
      <div className="text-xl font-semibold text-white mb-2">Verifying Payment…</div>
      <div className="text-sm text-emerald-100/60">This usually takes a few seconds.</div>
      <div className="mt-4 text-xs text-emerald-100/40">Do not close this window.</div>
    </div>
  );

  if (step === "pay") return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-lg font-semibold gold-shimmer">Send Pi Payment</div>
        <div className="text-xs text-emerald-100/60 mt-1">
          Send exactly <span className="gold-text font-bold">{selected.pi} PI</span> to receive{" "}
          <span className="text-white font-bold">{selected.idp.toLocaleString()} IDPoints</span>
        </div>
      </div>

      <div className="rounded-xl p-4 text-center"
        style={{ background: "rgba(5,8,6,.7)", border: "1px solid rgba(255,215,106,.3)" }}>
        <div className="text-[10px] uppercase tracking-widest gold-text mb-2">Pi Payment Address</div>
        <div className="font-mono text-xs text-white break-all mb-3">{address}</div>
        <button onClick={onCopyAddress}
          className="flex items-center gap-2 mx-auto rounded-full px-4 py-1.5 text-xs transition"
          style={{ border: "1px solid rgba(255,215,106,.4)", color: copiedAddress ? "#56FF76" : "#FFD76A" }}>
          {copiedAddress ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copiedAddress ? "Copied!" : "Copy Address"}
        </button>
      </div>

      <div className="rounded-xl p-3 flex items-start gap-3"
        style={{ background: "rgba(255,159,118,.08)", border: "1px solid rgba(255,159,118,.25)" }}>
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#FF9F76" }} />
        <p className="text-[11px] text-emerald-100/70 leading-relaxed">
          Send payment from your Pi Wallet. After completing the transfer, click the button below. Your balance will update after verification.
        </p>
      </div>

      {timer > 0 && (
        <div className="text-center text-xs text-emerald-100/50">
          Waiting {timer}s… Take your time to complete the payment.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onCancel}
          className="rounded-xl py-3 text-sm text-white/70 transition"
          style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,255,255,.15)" }}>
          Cancel
        </button>
        <button onClick={onVerify}
          className="rounded-xl py-3 text-sm font-bold text-black transition active:scale-95"
          style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}>
          I've Paid — Verify
        </button>
      </div>
    </div>
  );

  /* step === "select" */
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-lg font-semibold gold-shimmer">Deposit IDPoints</div>
        <div className="text-xs text-emerald-100/60 mt-1">Select amount to deposit via Pi payment</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {DEPOSIT_OPTIONS.map((opt) => {
          const active = opt.idp === selected.idp;
          return (
            <button key={opt.idp} onClick={() => onSelect(opt)}
              className="flex flex-col items-center rounded-xl px-3 py-4 text-white transition active:scale-[.97]"
              style={{
                background: active ? "linear-gradient(180deg,rgba(255,215,106,.2),rgba(86,255,118,.1))" : "rgba(5,8,6,.6)",
                border: `1px solid ${active ? "rgba(255,215,106,.7)" : "rgba(255,215,106,.15)"}`,
                boxShadow: active ? "0 0 18px rgba(255,215,106,.2)" : undefined,
              }}>
              <div className="text-xl font-bold" style={{ color: active ? "#FFD76A" : "white" }}>
                {opt.idp.toLocaleString()} IDP
              </div>
              <div className="text-xs mt-1" style={{ color: active ? "#56FF76" : "rgba(255,255,255,.5)" }}>
                {opt.pi} PI
              </div>
              {active && <Check className="h-4 w-4 mt-2" style={{ color: "#56FF76" }} />}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl p-3 flex items-start gap-3"
        style={{ background: "rgba(86,255,118,.05)", border: "1px solid rgba(86,255,118,.2)" }}>
        <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#56FF76" }} />
        <p className="text-[11px] text-emerald-100/70 leading-relaxed">
          Payment is processed securely. IDPoints are only credited after payment verification. Pending transactions never affect your balance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onCancel}
          className="rounded-xl py-3 text-sm text-white/70 transition"
          style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,255,255,.15)" }}>
          Cancel
        </button>
        <button onClick={onProceed}
          className="rounded-xl py-3 text-sm font-bold text-black transition active:scale-95"
          style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}>
          Proceed to Payment
        </button>
      </div>
    </div>
  );
}

/* ---- Withdraw Flow ---- */
function WithdrawFlow({
  step, amount, setAmount, address, setAddress, balance, txId, onSubmit, onDone,
}: {
  step: WithdrawStep;
  amount: string;
  setAmount: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  balance: number;
  txId: string | null;
  onSubmit: () => void;
  onDone: () => void;
}) {
  if (step === "done") return (
    <div className="text-center py-4">
      <Clock className="mx-auto h-16 w-16 mb-4" style={{ color: "#FFD76A" }} />
      <div className="text-xl font-semibold text-white mb-2">Withdrawal Submitted</div>
      <div className="text-sm text-emerald-100/60 mb-2">
        Your withdrawal is pending admin review. Funds will be released within 24 hours.
      </div>
      {txId && <div className="text-xs text-emerald-100/40 font-mono mb-6">Ref: {txId.slice(0, 16)}…</div>}
      <button onClick={onDone}
        className="w-full rounded-xl py-3 text-sm font-bold text-black"
        style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}>
        Done
      </button>
    </div>
  );

  if (step === "confirming") return (
    <div className="text-center py-4">
      <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin" style={{ color: "#FFD76A" }} />
      <div className="text-xl font-semibold text-white mb-2">Submitting…</div>
      <div className="text-sm text-emerald-100/60">Processing your withdrawal request.</div>
    </div>
  );

  const parsedAmount = parseInt(amount.replace(/,/g, ""), 10) || 0;
  const isValid = parsedAmount >= 100 && parsedAmount <= balance && address.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-lg font-semibold gold-shimmer">Withdraw IDPoints</div>
        <div className="text-xs text-emerald-100/60 mt-1">
          Available: <span className="gold-text font-medium">{balance.toLocaleString()} IDPoints</span>
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-widest gold-text mb-1.5">Amount (IDPoints)</label>
        <div className="relative">
          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Min. 100 IDPoints"
            className="w-full bg-transparent rounded-xl px-4 py-3 text-white outline-none text-sm"
            style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.25)" }}
          />
          <button
            onClick={() => setAmount(String(balance))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded-full gold-border gold-text"
          >
            MAX
          </button>
        </div>
        {parsedAmount > 0 && parsedAmount < 100 && (
          <p className="mt-1 text-[11px]" style={{ color: "#FF9F76" }}>Minimum withdrawal: 100 IDPoints</p>
        )}
        {parsedAmount > balance && (
          <p className="mt-1 text-[11px]" style={{ color: "#FF7676" }}>Insufficient balance</p>
        )}
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-widest gold-text mb-1.5">Your Pi Wallet Address</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Pi wallet address…"
          className="w-full bg-transparent rounded-xl px-4 py-3 text-white outline-none text-sm font-mono"
          style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.25)" }}
        />
      </div>

      {parsedAmount > 0 && parsedAmount <= balance && (
        <div className="rounded-xl p-3"
          style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.15)" }}>
          <div className="text-xs text-emerald-100/60 space-y-1">
            <div className="flex justify-between">
              <span>Amount</span>
              <span className="text-white">{parsedAmount.toLocaleString()} IDPoints</span>
            </div>
            <div className="flex justify-between">
              <span>≈ IDR</span>
              <span className="text-white">Rp{Math.floor(parsedAmount / 9).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Status after submit</span>
              <span className="gold-text">Pending Review</span>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl p-3 flex items-start gap-3"
        style={{ background: "rgba(255,159,118,.06)", border: "1px solid rgba(255,159,118,.2)" }}>
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#FF9F76" }} />
        <p className="text-[11px] text-emerald-100/70 leading-relaxed">
          Withdrawals are reviewed within 24 hours. Your balance is debited immediately upon submission and refunded if rejected.
        </p>
      </div>

      <button onClick={onSubmit} disabled={!isValid}
        className="w-full rounded-xl py-3 text-sm font-bold text-black transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(90deg,#FFD76A,#56FF76)" }}>
        Submit Withdrawal
      </button>
    </div>
  );
}

/* ---- Sub-components ---- */
function StatusIcon({ status }: { status: TxStatus }) {
  switch (status) {
    case "pending": return <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: "#FFD76A" }} />;
    case "success": return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: "#56FF76" }} />;
    case "failed": return <XCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#FF7676" }} />;
    case "cancelled": return <XCircle className="h-3.5 w-3.5 shrink-0" style={{ color: "#FF9F76" }} />;
  }
}

function StatusBadge({ status }: { status: TxStatus }) {
  const map: Record<TxStatus, { label: string; color: string }> = {
    pending:   { label: "Pending",   color: "#FFD76A" },
    success:   { label: "Success",   color: "#56FF76" },
    failed:    { label: "Failed",    color: "#FF7676" },
    cancelled: { label: "Cancelled", color: "#FF9F76" },
  };
  const { label, color } = map[status];
  return (
    <span className="rounded-full px-2 py-0.5 text-[9px] font-medium"
      style={{ background: `${color}20`, border: `1px solid ${color}50`, color }}>
      {label}
    </span>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0" onClick={onClose}
        style={{ background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)" }} />
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl p-5 overflow-y-auto max-h-[90vh]"
        style={{
          background: "linear-gradient(180deg, rgba(11,26,18,.99), rgba(5,8,6,.99))",
          border: "1px solid rgba(255,215,106,.35)",
          boxShadow: "0 24px 80px rgba(0,0,0,.8), 0 0 40px rgba(86,255,118,.12)",
        }}>
        {onClose && (
          <button onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full glass-card transition active:scale-90">
            <X className="h-4 w-4" style={{ color: "#FFD76A" }} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function BalanceCard({ symbol, label, value, sub, color }: {
  symbol: string; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <GoldRing size={64}>
        <span className="text-2xl font-bold" style={{ color }}>{symbol}</span>
      </GoldRing>
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-widest text-emerald-100/60">{label}</div>
        <div className="text-2xl font-semibold text-white font-mono">{value}</div>
        <div className="text-[11px] gold-text">{sub}</div>
      </div>
      <Coins className="h-4 w-4 opacity-50" style={{ color }}/>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl p-3 transition hover:-translate-y-0.5 active:scale-95"
      style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.2)" }}>
      <GoldRing size={44}><span style={{ color: "#FFD76A" }}>{icon}</span></GoldRing>
      <span className="text-xs text-white">{label}</span>
    </button>
  );
}

function ActionLink({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link to={to}
      className="flex flex-col items-center gap-2 rounded-xl p-3 transition hover:-translate-y-0.5 active:scale-95"
      style={{ background: "rgba(5,8,6,.6)", border: "1px solid rgba(255,215,106,.2)" }}>
      <GoldRing size={44}><span style={{ color: "#FFD76A" }}>{icon}</span></GoldRing>
      <span className="text-xs text-white">{label}</span>
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4 text-center text-xs text-emerald-100/50"
         style={{ background: "rgba(5,8,6,.5)", border: "1px dashed rgba(255,215,106,.2)" }}>
      {children}
    </div>
  );
}

// Suppress unused import warning
void WalletIcon;
