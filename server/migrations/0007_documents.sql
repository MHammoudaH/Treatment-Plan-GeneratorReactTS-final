-- 0007_documents.sql
-- Document METADATA only. Large files (CT scans, passports, tickets, vouchers,
-- payment proofs) live in object storage; PostgreSQL stores the reference.

CREATE TABLE documents (
  id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id        uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id       integer NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,

  doc_type         text NOT NULL CHECK (doc_type IN (
                     'ct_scan', 'xray', 'panoramic', 'photo', 'passport', 'visa', 'id_card',
                     'flight_ticket', 'hotel_voucher', 'payment_proof', 'invoice',
                     'consent_form', 'medical_report', 'prescription', 'other')),
  title            text,
  description      text,

  -- object-storage reference (never the bytes, never a signed URL)
  storage_provider text NOT NULL CHECK (storage_provider IN
                     ('s3', 'gcs', 'azure_blob', 'r2', 'local', 'zoho_workdrive', 'other')),
  storage_bucket   text,
  storage_key      text NOT NULL,
  storage_region   text,
  stable_url       text,

  file_name        text,
  content_type     text,
  byte_size        bigint CHECK (byte_size IS NULL OR byte_size >= 0),
  checksum_sha256  text,

  status           text NOT NULL DEFAULT 'available'
                   CHECK (status IN ('pending', 'available', 'quarantined', 'deleted')),

  uploaded_by      integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE TRIGGER documents_set_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE UNIQUE INDEX documents_public_id_key ON documents (public_id);
CREATE UNIQUE INDEX documents_storage_key
  ON documents (storage_provider, coalesce(storage_bucket, ''), storage_key);
CREATE INDEX documents_patient_type_idx
  ON documents (patient_id, doc_type) WHERE deleted_at IS NULL;
CREATE INDEX documents_checksum_idx
  ON documents (checksum_sha256) WHERE checksum_sha256 IS NOT NULL;

-- Polymorphic M:N link so one document can attach to several entities and each
-- entity can have several documents, without a nullable FK column per entity.
-- entity_id has no DB-level FK (it targets multiple tables); integrity is kept
-- by the application + the entity_type CHECK.
CREATE TABLE document_links (
  id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id integer NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN
                ('patient', 'treatment_plan', 'treatment_visit', 'payment',
                 'flight', 'hotel_reservation', 'transfer')),
  entity_id   integer NOT NULL,
  link_role   text,                 -- e.g. 'primary', 'proof', 'voucher', 'ticket'
  created_by  integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, entity_type, entity_id)
);
CREATE INDEX document_links_entity_idx ON document_links (entity_type, entity_id);
CREATE INDEX document_links_document_idx ON document_links (document_id);
