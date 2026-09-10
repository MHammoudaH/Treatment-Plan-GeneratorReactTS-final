-- 0008_logistics.sql
-- Operational travel records: flights, hotel reservations, transfers. Not
-- accounting. One patient can have many of each; each optionally pins to a
-- treatment_visit (the same-patient guarantee comes from the composite FK).

CREATE TABLE flights (
  id                 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id         integer NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  treatment_visit_id integer,
  direction          text NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
  airline            text,
  airline_iata       char(2),
  flight_number      text,
  departure_airport  char(3),      -- IATA
  arrival_airport    char(3),      -- IATA
  departure_at       timestamptz,  -- stored UTC
  arrival_at         timestamptz,  -- stored UTC
  booking_reference  text,         -- PNR
  ticket_number      text,
  status             text NOT NULL DEFAULT 'planned' CHECK (status IN
                       ('planned', 'booked', 'ticketed', 'changed', 'cancelled', 'completed', 'no_show')),
  booked_by          integer REFERENCES users(id) ON DELETE RESTRICT,
  updated_by         integer REFERENCES users(id) ON DELETE RESTRICT,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  CONSTRAINT flights_visit_fk
    FOREIGN KEY (treatment_visit_id, patient_id)
    REFERENCES treatment_visits (id, patient_id) ON DELETE RESTRICT,
  CONSTRAINT flights_time_chk
    CHECK (arrival_at IS NULL OR departure_at IS NULL OR arrival_at >= departure_at)
);
CREATE TRIGGER flights_set_updated_at BEFORE UPDATE ON flights
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX flights_patient_idx ON flights (patient_id) WHERE deleted_at IS NULL;
CREATE INDEX flights_visit_idx ON flights (treatment_visit_id);
CREATE INDEX flights_status_idx ON flights (status) WHERE deleted_at IS NULL;
CREATE INDEX flights_arrival_idx ON flights (arrival_at) WHERE deleted_at IS NULL;
CREATE INDEX flights_inbound_arrival_idx
  ON flights (arrival_at) WHERE direction = 'inbound' AND deleted_at IS NULL;

CREATE TABLE hotel_reservations (
  id                 integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id         integer NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  treatment_visit_id integer,
  hotel_id           integer REFERENCES hotels(id) ON DELETE RESTRICT,
  hotel_name         text,         -- fallback / ad-hoc when hotel_id is null
  check_in_date      date NOT NULL,
  check_out_date     date NOT NULL,
  nights             integer GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
  room_type          text,
  rooms              integer NOT NULL DEFAULT 1 CHECK (rooms > 0),
  guests             integer NOT NULL DEFAULT 1 CHECK (guests > 0),
  confirmation_number text,
  status             text NOT NULL DEFAULT 'requested' CHECK (status IN
                       ('requested', 'pending', 'booked', 'confirmed',
                        'checked_in', 'checked_out', 'cancelled', 'no_show')),
  price              numeric(14,2) CHECK (price IS NULL OR price >= 0),
  currency           char(3),
  created_by         integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by         integer REFERENCES users(id) ON DELETE RESTRICT,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  CONSTRAINT hotel_reservations_visit_fk
    FOREIGN KEY (treatment_visit_id, patient_id)
    REFERENCES treatment_visits (id, patient_id) ON DELETE RESTRICT,
  CONSTRAINT hotel_reservations_dates_chk CHECK (check_out_date > check_in_date),
  CONSTRAINT hotel_reservations_hotel_chk CHECK (hotel_id IS NOT NULL OR hotel_name IS NOT NULL)
);
CREATE TRIGGER hotel_reservations_set_updated_at BEFORE UPDATE ON hotel_reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX hotel_reservations_patient_idx
  ON hotel_reservations (patient_id) WHERE deleted_at IS NULL;
CREATE INDEX hotel_reservations_visit_idx ON hotel_reservations (treatment_visit_id);
CREATE INDEX hotel_reservations_checkin_idx
  ON hotel_reservations (check_in_date, status) WHERE deleted_at IS NULL;
CREATE INDEX hotel_reservations_hotel_idx ON hotel_reservations (hotel_id);
CREATE INDEX hotel_reservations_created_by_idx ON hotel_reservations (created_by);

CREATE TABLE transfers (
  id                          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id                  integer NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  treatment_visit_id          integer,
  transfer_type               text NOT NULL CHECK (transfer_type IN
                                ('airport_pickup', 'airport_dropoff', 'hotel_to_clinic',
                                 'clinic_to_hotel', 'inter_hotel', 'other')),
  from_type                   text CHECK (from_type IN ('airport', 'hotel', 'clinic', 'other')),
  from_name                   text,
  to_type                     text CHECK (to_type IN ('airport', 'hotel', 'clinic', 'other')),
  to_name                     text,
  related_flight_id           integer REFERENCES flights(id) ON DELETE SET NULL,
  related_hotel_reservation_id integer REFERENCES hotel_reservations(id) ON DELETE SET NULL,
  scheduled_at                timestamptz NOT NULL,
  completed_at                timestamptz,
  status                      text NOT NULL DEFAULT 'requested' CHECK (status IN
                                ('requested', 'scheduled', 'assigned', 'in_progress',
                                 'completed', 'cancelled', 'no_show')),
  driver_name                 text,
  driver_phone                text,
  vehicle_description         text,
  vehicle_plate               text,
  created_by                  integer NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by                  integer REFERENCES users(id) ON DELETE RESTRICT,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  deleted_at                  timestamptz,
  CONSTRAINT transfers_visit_fk
    FOREIGN KEY (treatment_visit_id, patient_id)
    REFERENCES treatment_visits (id, patient_id) ON DELETE RESTRICT
);
CREATE TRIGGER transfers_set_updated_at BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX transfers_patient_idx ON transfers (patient_id) WHERE deleted_at IS NULL;
CREATE INDEX transfers_visit_idx ON transfers (treatment_visit_id);
CREATE INDEX transfers_schedule_idx ON transfers (scheduled_at, status) WHERE deleted_at IS NULL;
CREATE INDEX transfers_flight_idx ON transfers (related_flight_id);
CREATE INDEX transfers_hotel_idx ON transfers (related_hotel_reservation_id);
