import { useEffect, useMemo, useState } from 'react';
import {
  NOTE_TOPIC_LABELS,
  addPatientNote,
  fetchPatientRecord,
  fetchPatientRecords,
  type ApiError,
  type NoteTopic,
  type PatientRecord,
  type PatientRecordSummary,
  type QuoteSnapshot,
} from '../../lib/api';
import { formatSnapshotMoney } from '../../lib/patientRecords';
import { useNavValue } from '../../lib/navigation';

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function quoteHeadline(quote: QuoteSnapshot): string {
  const module = quote.module === 'dental' ? 'Dental' : 'Plastic surgery';
  const totals = quote.options.map((o) => formatSnapshotMoney(o.total, quote.currency)).join(' / ');
  return `${module} · ${totals}`;
}

function QuoteCard({ quote }: { quote: QuoteSnapshot }) {
  return (
    <div className="timeline-quote">
      <p className="hint">
        {quote.module === 'dental' ? 'Dental' : 'Plastic surgery'} · {quote.pdf === 'premium' ? 'Premium Proposal' : 'Simple Quotation'} PDF ·{' '}
        {quote.currency} · {quote.language}
        {quote.remark ? ` · ${quote.remark}` : ''}
      </p>
      {quote.options.map((option, index) => (
        <div className="timeline-option" key={index}>
          <div className="summary-row">
            <strong>{option.name}</strong>
            <strong>{formatSnapshotMoney(option.total, quote.currency)}</strong>
          </div>
          {option.lines.length > 0 && (
            <ul>
              {option.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function PatientDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState<NoteTopic | ''>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPatientRecord(id)
      .then(({ record }) => !cancelled && setRecord(record))
      .catch((err: ApiError) => !cancelled && setError(err?.message ?? 'Could not load this patient.'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function addNote() {
    if (!body.trim() || !record) return;
    setSaving(true);
    setError(null);
    try {
      const { entry } = await addPatientNote(record.id, body.trim(), topic || null);
      setRecord({ ...record, entries: [...record.entries, entry] });
      setBody('');
      setTopic('');
    } catch (err) {
      setError((err as ApiError)?.message ?? 'Could not save the note.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="wizard-step my-patients">
      <button type="button" className="secondary" onClick={onBack}>
        ← All my patients
      </button>
      {error && <p className="error-text">{error}</p>}
      {!record ? (
        !error && <p className="hint">Loading…</p>
      ) : (
        <>
          <h2>{record.patientName}</h2>
          <p className="step-intro">Saved {formatDateTime(record.createdAt)}. The timeline shows the original quote, then every quote and note added after it.</p>

          <ol className="timeline">
            {record.entries.map((entry, index) => (
              <li key={entry.id} className={`timeline-entry is-${entry.kind}`}>
                <div className="timeline-meta">
                  <span className="eyebrow">
                    {entry.kind === 'quote' ? (index === 0 ? 'Original quote' : 'Updated quote') : entry.topic ? NOTE_TOPIC_LABELS[entry.topic] : 'Note'}
                  </span>
                  <small>
                    {formatDateTime(entry.createdAt)} · {entry.authorName}
                  </small>
                </div>
                {entry.kind === 'quote' && entry.quote ? <QuoteCard quote={entry.quote} /> : <p className="timeline-note">{entry.body}</p>}
              </li>
            ))}
          </ol>

          <div className="timeline-add">
            <h3>Add a note</h3>
            <label htmlFor="note-topic">Type (optional)</label>
            <select id="note-topic" value={topic} onChange={(e) => setTopic(e.target.value as NoteTopic | '')}>
              <option value="">General note</option>
              {(Object.keys(NOTE_TOPIC_LABELS) as NoteTopic[]).map((key) => (
                <option key={key} value={key}>
                  {NOTE_TOPIC_LABELS[key]}
                </option>
              ))}
            </select>
            <label htmlFor="note-body">Note</label>
            <textarea
              id="note-body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What was discussed, objections raised, price negotiated, what to do next…"
            />
            <div className="wizard-actions">
              <button type="button" disabled={saving || !body.trim()} onClick={addNote}>
                {saving ? 'Saving…' : 'Add note'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/** "My Patients" — the signed-in coordinator's saved patients and their follow-up timelines. */
export function MyPatientsView() {
  const [records, setRecords] = useState<PatientRecordSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useNavValue<number | null>('patientId', null);
  const [search, setSearch] = useState('');

  // Reload whenever the list is shown again, so notes added on a patient's page show up in the counts.
  useEffect(() => {
    if (openId !== null) return;
    let cancelled = false;
    fetchPatientRecords()
      .then(({ records }) => {
        if (cancelled) return;
        setRecords(records);
        setError(null);
      })
      .catch((err: ApiError) => !cancelled && setError(err?.message ?? 'Could not load your patients.'));
    return () => {
      cancelled = true;
    };
  }, [openId]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (records ?? []).filter((r) => !q || r.patientName.toLowerCase().includes(q));
  }, [records, search]);

  if (openId !== null) return <PatientDetail id={openId} onBack={() => setOpenId(null)} />;

  return (
    <section className="wizard-step my-patients">
      <span className="eyebrow">Follow-up</span>
      <h2>My patients</h2>
      <p className="step-intro">
        Patients you saved when generating a PDF (tick "Save this patient to my records"). Open one to see the quote and add follow-up notes.
      </p>
      {error && <p className="error-text">{error}</p>}
      {records === null ? (
        !error && <p className="hint">Loading…</p>
      ) : records.length === 0 ? (
        <p className="rule-note">No saved patients yet.</p>
      ) : (
        <>
          <input type="search" aria-label="Search my patients" placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <ul className="patient-list">
            {visible.map((r) => (
              <li key={r.id}>
                <button type="button" className="patient-row" onClick={() => setOpenId(r.id)}>
                  <strong>{r.patientName}</strong>
                  <span>{r.latestQuote ? quoteHeadline(r.latestQuote) : '—'}</span>
                  <small>
                    Saved {formatDateTime(r.createdAt)} · {r.noteCount} {r.noteCount === 1 ? 'note' : 'notes'} · last activity {formatDateTime(r.updatedAt)}
                  </small>
                </button>
              </li>
            ))}
            {visible.length === 0 && <li className="hint">No patients match your search.</li>}
          </ul>
        </>
      )}
    </section>
  );
}
