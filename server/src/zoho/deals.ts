import { zohoJson, ZohoApiError } from './client.js';

export interface ZohoUser {
  id: string;
  fullName: string;
  email: string;
  role: string | null;
  status: string | null;
}

export interface Deal {
  id: string;
  name: string;
  stage: string | null;
  amount: number | null;
  currency: string | null;
  closingDate: string | null;
  pipeline: string | null;
  accountName: string | null;
  contactName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  createdTime: string | null;
  modifiedTime: string | null;
  raw?: Record<string, unknown>;
}

interface ZohoUsersResponse {
  users?: Array<{
    id: string;
    full_name?: string;
    email?: string;
    status?: string;
    role?: { name?: string } | null;
  }>;
  info?: { more_records?: boolean; page?: number };
}

/** Every active + inactive Zoho CRM user (paginated). */
export async function listAllZohoUsers(): Promise<ZohoUser[]> {
  const out: ZohoUser[] = [];
  let page = 1;
  // Guard against unbounded loops on very large orgs.
  for (; page <= 20; page++) {
    const body = await zohoJson<ZohoUsersResponse>(
      `/crm/v6/users?type=AllUsers&per_page=200&page=${page}`,
    );
    const users = body?.users ?? [];
    for (const u of users) {
      out.push({
        id: u.id,
        fullName: u.full_name ?? '',
        email: (u.email ?? '').toLowerCase(),
        role: u.role?.name ?? null,
        status: u.status ?? null,
      });
    }
    if (!body?.info?.more_records) break;
  }
  return out;
}

export async function findZohoUserByEmail(email: string): Promise<ZohoUser | null> {
  const target = email.trim().toLowerCase();
  const users = await listAllZohoUsers();
  return users.find((u) => u.email === target) ?? null;
}

interface CoqlResponse {
  data?: Array<Record<string, unknown>>;
  info?: { more_records?: boolean; count?: number };
}

function asRef(value: unknown): { name: string | null; id: string | null } {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return {
      name: typeof v.name === 'string' ? v.name : null,
      id: typeof v.id === 'string' ? v.id : null,
    };
  }
  return { name: null, id: null };
}

function mapDeal(row: Record<string, unknown>): Deal {
  const owner = asRef(row.Owner);
  const account = asRef(row.Account_Name);
  const contact = asRef(row.Contact_Name);
  const amount = row.Amount;
  return {
    id: String(row.id ?? ''),
    name: typeof row.Deal_Name === 'string' ? row.Deal_Name : '(untitled deal)',
    stage: typeof row.Stage === 'string' ? row.Stage : null,
    amount: typeof amount === 'number' ? amount : amount != null ? Number(amount) || null : null,
    currency: typeof row.Currency === 'string' ? row.Currency : null,
    closingDate: typeof row.Closing_Date === 'string' ? row.Closing_Date : null,
    pipeline: typeof row.Pipeline === 'string' ? row.Pipeline : null,
    accountName: account.name,
    contactName: contact.name,
    ownerName: owner.name,
    ownerEmail: null,
    createdTime: typeof row.Created_Time === 'string' ? row.Created_Time : null,
    modifiedTime: typeof row.Modified_Time === 'string' ? row.Modified_Time : null,
  };
}

const DEAL_FIELDS =
  'id, Deal_Name, Stage, Amount, Currency, Closing_Date, Pipeline, Account_Name, Contact_Name, Owner, Created_Time, Modified_Time';

/**
 * Deals owned by a given Zoho user id, newest first. Uses COQL with pagination.
 * COQL caps a page at 200 rows; we page until `more_records` is false (max 2000).
 */
export async function listDealsByOwnerId(ownerId: string): Promise<Deal[]> {
  const deals: Deal[] = [];
  for (let offset = 0; offset < 2000; offset += 200) {
    const select_query = `SELECT ${DEAL_FIELDS} FROM Deals WHERE Owner = '${ownerId}' ORDER BY Modified_Time DESC LIMIT ${offset}, 200`;
    let body: CoqlResponse | null;
    try {
      body = await zohoJson<CoqlResponse>('/crm/v6/coql', {
        method: 'POST',
        body: JSON.stringify({ select_query }),
      });
    } catch (err) {
      // COQL returns 204 (no rows) as an error in some SDKs; treat "no data" 204 as empty.
      if (err instanceof ZohoApiError && err.status === 204) break;
      throw err;
    }
    const rows = body?.data ?? [];
    for (const row of rows) deals.push(mapDeal(row));
    if (!body?.info?.more_records || rows.length === 0) break;
  }
  return deals;
}

export interface DealsResult {
  deals: Deal[];
  zohoUser: { id: string; email: string; fullName: string } | null;
  reason?: 'no_zoho_user';
}

/** Resolve the app user's email to a Zoho user, then fetch that owner's deals. */
export async function getDealsForEmail(email: string): Promise<DealsResult> {
  const zohoUser = await findZohoUserByEmail(email);
  if (!zohoUser) {
    return { deals: [], zohoUser: null, reason: 'no_zoho_user' };
  }
  const deals = await listDealsByOwnerId(zohoUser.id);
  for (const d of deals) {
    if (!d.ownerEmail && d.ownerName === zohoUser.fullName) d.ownerEmail = zohoUser.email;
  }
  return {
    deals,
    zohoUser: { id: zohoUser.id, email: zohoUser.email, fullName: zohoUser.fullName },
  };
}
