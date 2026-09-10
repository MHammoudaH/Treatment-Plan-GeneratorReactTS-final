import { useCallback, useEffect, useState } from 'react';
import {
  disconnectZoho,
  fetchDeals,
  fetchZohoStatus,
  zohoConnectUrl,
  type ApiError,
  type Deal,
  type DealsResponse,
  type ZohoStatus,
} from '../lib/api';

function readZohoRedirectFlash(): { kind: 'ok' | 'error'; reason?: string } | null {
  const params = new URLSearchParams(window.location.search);
  const zoho = params.get('zoho');
  if (!zoho) return null;
  const reason = params.get('reason') ?? undefined;
  // Clean the query string so a refresh doesn't re-show the flash.
  params.delete('zoho');
  params.delete('reason');
  const qs = params.toString();
  window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
  return zoho === 'connected' ? { kind: 'ok' } : { kind: 'error', reason };
}

function money(amount: number | null, currency: string | null): string {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency ?? ''} ${amount.toLocaleString('en-US')}`.trim();
  }
}

export function ZohoDealsPanel() {
  const [status, setStatus] = useState<ZohoStatus | null>(null);
  const [deals, setDeals] = useState<DealsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'error'; reason?: string } | null>(() => readZohoRedirectFlash());

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await fetchZohoStatus());
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Could not load Zoho status.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeals = useCallback(async () => {
    setDealsLoading(true);
    setError(null);
    try {
      setDeals(await fetchDeals());
    } catch (err) {
      const e = err as ApiError;
      if (e.code === 'zoho_not_connected') setDeals(null);
      else setError(e?.message ?? 'Could not load deals.');
    } finally {
      setDealsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (status?.connected) void loadDeals();
  }, [status?.connected, loadDeals]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  async function onDisconnect() {
    await disconnectZoho();
    setDeals(null);
    await loadStatus();
  }

  if (loading) return <section className="zoho-panel wizard-step">Loading Zoho status…</section>;

  return (
    <section className="zoho-panel wizard-step">
      <div className="zoho-panel-head">
        <div>
          <span className="eyebrow">Zoho CRM</span>
          <h2>My deals</h2>
        </div>
        {status?.connected ? (
          <span className="zoho-chip connected">Connected</span>
        ) : (
          <span className="zoho-chip">Not connected</span>
        )}
      </div>

      {flash?.kind === 'ok' && (
        <p className="success-note" role="status">
          Zoho CRM connected. Your deals are loading below.
        </p>
      )}
      {flash?.kind === 'error' && (
        <p className="auth-error" role="alert">
          Zoho connection failed{flash.reason ? `: ${flash.reason.replace(/_/g, ' ')}` : ''}.
        </p>
      )}

      {!status?.configured && (
        <p className="rule-note">
          The backend has no Zoho OAuth client yet. Add <code>ZOHO_CLIENT_ID</code> and{' '}
          <code>ZOHO_CLIENT_SECRET</code> to <code>server/.env</code> (see <code>server/.env.example</code>),
          restart the server, then use the button below.
        </p>
      )}

      {!status?.connected ? (
        <div className="wizard-actions">
          <a className="button-link" href={zohoConnectUrl()}>
            Connect Zoho CRM
          </a>
        </div>
      ) : (
        <>
          <div className="zoho-meta">
            <span>Connected by {status.connectedBy ?? 'unknown'}</span>
            <span>API: {status.apiBase}</span>
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          {deals?.reason === 'no_zoho_user' && (
            <p className="rule-note">{deals.message}</p>
          )}

          <div className="wizard-actions">
            <button type="button" onClick={() => void loadDeals()} disabled={dealsLoading}>
              {dealsLoading ? 'Refreshing…' : 'Refresh deals'}
            </button>
            <button type="button" className="secondary" onClick={() => void onDisconnect()}>
              Disconnect
            </button>
          </div>

          {deals && deals.deals.length > 0 ? (
            <div className="zoho-deals-table-wrap">
              <table className="zoho-deals-table">
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Stage</th>
                    <th>Amount</th>
                    <th>Closing</th>
                    <th>Account</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.deals.map((d: Deal) => (
                    <tr key={d.id}>
                      <td>{d.name}</td>
                      <td>{d.stage ?? '—'}</td>
                      <td>{money(d.amount, d.currency)}</td>
                      <td>{d.closingDate ?? '—'}</td>
                      <td>{d.accountName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="hint">
                {deals.count} deal{deals.count === 1 ? '' : 's'} owned by{' '}
                {deals.zohoUser?.fullName ?? deals.email}.
              </p>
            </div>
          ) : (
            !dealsLoading &&
            deals &&
            deals.reason !== 'no_zoho_user' && <p className="hint">No deals found for your account.</p>
          )}
        </>
      )}
    </section>
  );
}
