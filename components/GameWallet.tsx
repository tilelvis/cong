'use client';

import { useAlien, usePayment } from '@alien_org/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { DEPOSIT_PACKS, type DepositPack } from '@/lib/deposit-packs';

interface PurchaseRecord {
  invoice: string;
  amount: string | null;
  token: string | null;
  status: string;
  created_at: string;
  product_id: string | null;
  trials_credited: number | null;
}

interface Props {
  trials: number;
  onClose: () => void;
  onTrialsUpdated: () => Promise<void>;
}

const TRIALS_LABEL: Record<string, string> = {
  'trials-10': '10 Trials',
  'trials-25': '27 Trials',
  'trials-50': '60 Trials',
  'trials-100': '130 Trials',
};

export function GameWallet({ trials, onClose, onTrialsUpdated }: Props) {
  const { authToken } = useAlien();
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [tab, setTab] = useState<'buy' | 'history'>('buy');
  const [history, setHistory] = useState<PurchaseRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Ref so polling closure always has the latest callback
  const onTrialsUpdatedRef = useRef(onTrialsUpdated);
  useEffect(() => { onTrialsUpdatedRef.current = onTrialsUpdated; }, [onTrialsUpdated]);

  const fetchHistory = useCallback(async () => {
    if (!authToken) return;
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/purchase-history', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) setHistory(await res.json());
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab, fetchHistory]);

  const { pay } = usePayment({
    onPaid: () => {
      setStatus({ text: '✅ Payment confirmed! Crediting trials...', ok: true });
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await onTrialsUpdatedRef.current();
        if (attempts >= 15) {
          clearInterval(poll);
          setStatus({ text: '✅ Trials credited!', ok: true });
          fetchHistory();
        }
      }, 2000);
    },
    onCancelled: () => setStatus({ text: 'Payment cancelled.', ok: false }),
    onFailed: (code: string) => setStatus({ text: `Payment failed: ${code}`, ok: false }),
  });

  const handleBuy = useCallback(async (pack: DepositPack) => {
    if (!authToken || buying) return;
    setBuying(pack.id);
    setStatus(null);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ productId: pack.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus({ text: `Failed: ${err.error ?? res.status}`, ok: false });
        return;
      }
      const data = await res.json();
      // RULE 5: pay() is NOT async
      pay({
        recipient: data.recipient,
        amount: data.amount,
        token: data.token,
        network: data.network,
        invoice: data.invoice,
        item: data.item,
        ...(data.test ? { test: data.test } : {}),
      });
    } catch (err) {
      console.error('Payment error:', err);
      setStatus({ text: 'An error occurred. Please try again.', ok: false });
    } finally {
      setBuying(null);
    }
  }, [authToken, buying, pay]);

  return (
    <div style={S.overlay}>
      <div style={S.sheet}>
        <div style={S.header}>
          <span style={S.title}>⚡ GET TRIALS</span>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={S.balance}>
          <span style={S.balanceNum}>{trials}</span>
          <span style={S.balanceLabel}> trials remaining</span>
        </div>
        <div style={S.tabs}>
          {(['buy', 'history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              ...S.tab,
              color: tab === t ? '#00ffb4' : '#444',
              borderBottom: tab === t ? '2px solid #00ffb4' : '2px solid transparent',
            }}>{t.toUpperCase()}</button>
          ))}
        </div>

        {tab === 'buy' && (
          <>
            <p style={S.subtitle}>1 ALIEN = 1 trial. Larger packs include bonus trials.</p>
            <div style={S.grid}>
              {DEPOSIT_PACKS.map(pack => (
                <button key={pack.id} onClick={() => handleBuy(pack)} disabled={!!buying}
                  style={{ ...S.packBtn, opacity: buying && buying !== pack.id ? 0.4 : 1,
                    borderColor: pack.bonus ? 'rgba(0,255,136,0.4)' : 'rgba(255,255,255,0.08)' }}>
                  {buying === pack.id ? (
                    <span style={{ color: '#888', fontSize: 12 }}>Processing...</span>
                  ) : (
                    <>
                      <div style={S.packTrials}>{pack.trials} Trials</div>
                      <div style={S.packPrice}>{Number(pack.amount) / 1e9} ALIEN</div>
                      {pack.bonus && <div style={S.packBonus}>{pack.bonus}</div>}
                    </>
                  )}
                </button>
              ))}
            </div>
            {status && (
              <div style={{ ...S.statusBox, color: status.ok ? '#00ffb4' : '#ef4444' }}>
                {status.text}
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <div style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#444', fontFamily: 'monospace', fontSize: 12 }}>Loading...</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#444', fontFamily: 'monospace', fontSize: 12 }}>No purchases yet</div>
            ) : history.map((item, i) => (
              <div key={i} style={S.histRow}>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>
                    {item.product_id ? (TRIALS_LABEL[item.product_id] ?? item.product_id)
                      : item.amount ? `${Number(item.amount) / 1e9} ALIEN` : 'Purchase'}
                  </div>
                  {item.trials_credited && (
                    <div style={{ color: '#00ffb4', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>
                      +{item.trials_credited} trials credited
                    </div>
                  )}
                  <div style={{ color: '#444', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                  color: item.status === 'paid' || item.status === 'completed' ? '#00ffb4' : '#ef4444' }}>
                  {item.status === 'paid' || item.status === 'completed' ? '✅ PAID' : item.status.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-end', zIndex: 100 },
  sheet:       { width: '100%', background: '#0a0a0f', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', maxHeight: '85vh', overflowY: 'auto' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:       { fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#00ffb4', letterSpacing: '0.1em' },
  closeBtn:    { background: 'none', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer', padding: '0 4px' },
  balance:     { textAlign: 'center', marginBottom: 12 },
  balanceNum:  { fontSize: 44, fontWeight: 900, fontFamily: 'monospace', color: '#00ffb4' },
  balanceLabel:{ fontSize: 13, color: '#666', fontFamily: 'monospace' },
  tabs:        { display: 'flex', marginBottom: 16, borderBottom: '1px solid #1a1a1a' },
  tab:         { flex: 1, padding: '10px 0', background: 'none', border: 'none', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' },
  subtitle:    { textAlign: 'center', color: '#555', fontSize: 12, fontFamily: 'monospace', marginBottom: 16 },
  grid:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 },
  packBtn:     { padding: '14px 10px', borderRadius: 12, background: '#111', border: '1px solid', cursor: 'pointer', textAlign: 'center', transition: 'opacity 0.15s' },
  packTrials:  { fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'monospace' },
  packPrice:   { fontSize: 12, color: '#f59e0b', fontFamily: 'monospace', marginTop: 4 },
  packBonus:   { fontSize: 10, color: '#00ffb4', fontFamily: 'monospace', marginTop: 3 },
  statusBox:   { fontSize: 12, fontFamily: 'monospace', textAlign: 'center', padding: 12, background: '#111', borderRadius: 8 },
  histRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #111' },
};
