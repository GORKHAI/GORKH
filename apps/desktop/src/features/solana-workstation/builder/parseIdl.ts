import {
  SolanaBuilderIdlSummarySchema,
  type SolanaBuilderIdlSummary,
} from '@gorkh/shared';

// ============================================================================
// IDL JSON Parser — Phase 4
// ============================================================================
// Validates and normalizes Anchor IDL JSON files for read-only rendering.
// ============================================================================

/**
 * Parse an IDL JSON string into a validated summary.
 * Returns null if parsing fails or validation fails.
 */
export function parseIdlJson(content: string): SolanaBuilderIdlSummary | null {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }

  if (!raw || typeof raw !== 'object') return null;

  const r = raw as Record<string, unknown>;

  // Normalize common IDL shapes (v0.29+ and older)
  const name = String(r.name ?? (r.metadata && typeof r.metadata === 'object' ? (r.metadata as Record<string, unknown>).name : undefined) ?? 'unknown');
  const version = String(r.version ?? '');
  const spec = String((r as Record<string, unknown>).spec ?? (r as Record<string, unknown>)['idl-version'] ?? '');
  const description = typeof r.description === 'string' ? r.description : undefined;

  const instructions = Array.isArray(r.instructions)
    ? r.instructions.map((inst: unknown) => {
        if (!inst || typeof inst !== 'object') return { name: 'unknown', accounts: [], args: [] };
        const i = inst as Record<string, unknown>;
        return {
          name: String(i.name ?? 'unknown'),
          docs: Array.isArray(i.docs) ? i.docs.filter((d): d is string => typeof d === 'string') : undefined,
          accounts: Array.isArray(i.accounts)
            ? i.accounts.map((acc: unknown) => {
                if (!acc || typeof acc !== 'object') return { name: 'unknown' };
                const a = acc as Record<string, unknown>;
                return {
                  name: String(a.name ?? 'unknown'),
                  isMut: typeof a.isMut === 'boolean' ? a.isMut : undefined,
                  isSigner: typeof a.isSigner === 'boolean' ? a.isSigner : undefined,
                  docs: Array.isArray(a.docs) ? a.docs.filter((d): d is string => typeof d === 'string') : undefined,
                  pda: a.pda,
                  relations: Array.isArray(a.relations)
                    ? a.relations.filter((rel): rel is string => typeof rel === 'string')
                    : undefined,
                };
              })
            : [],
          args: Array.isArray(i.args)
            ? i.args.map((arg: unknown) => {
                if (!arg || typeof arg !== 'object') return { name: 'unknown', type: 'unknown' };
                const a = arg as Record<string, unknown>;
                return {
                  name: String(a.name ?? 'unknown'),
                  type: a.type ?? 'unknown',
                };
              })
            : [],
          returns: i.returns,
        };
      })
    : [];

  const accounts = Array.isArray(r.accounts)
    ? r.accounts.map((acc: unknown) => {
        if (!acc || typeof acc !== 'object') return { name: 'unknown', type: { kind: 'struct' as const, fields: [] } };
        const a = acc as Record<string, unknown>;
        const typeObj = a.type && typeof a.type === 'object' ? (a.type as Record<string, unknown>) : {};
        const fields = Array.isArray(typeObj.fields)
          ? typeObj.fields.map((f: unknown) => {
              if (!f || typeof f !== 'object') return { name: 'unknown', type: 'unknown' };
              const field = f as Record<string, unknown>;
              return {
                name: String(field.name ?? 'unknown'),
                type: field.type ?? 'unknown',
                docs: Array.isArray(field.docs)
                  ? field.docs.filter((d): d is string => typeof d === 'string')
                  : undefined,
              };
            })
          : [];
        return {
          name: String(a.name ?? 'unknown'),
          docs: Array.isArray(a.docs) ? a.docs.filter((d): d is string => typeof d === 'string') : undefined,
          type: {
            kind: 'struct' as const,
            fields: fields.length > 0 ? fields : undefined,
          },
        };
      })
    : [];

  const errors = Array.isArray(r.errors)
    ? r.errors.map((err: unknown) => {
        if (!err || typeof err !== 'object') return { code: 0, name: 'unknown', msg: '' };
        const e = err as Record<string, unknown>;
        return {
          code: typeof e.code === 'number' ? e.code : 0,
          name: String(e.name ?? 'unknown'),
          msg: String(e.msg ?? ''),
        };
      })
    : [];

  const events = Array.isArray(r.events)
    ? r.events.map((evt: unknown) => {
        if (!evt || typeof evt !== 'object') return { name: 'unknown', fields: [] };
        const e = evt as Record<string, unknown>;
        return {
          name: String(e.name ?? 'unknown'),
          fields: Array.isArray(e.fields)
            ? e.fields.map((f: unknown) => {
                if (!f || typeof f !== 'object') return { name: 'unknown', type: 'unknown' };
                const field = f as Record<string, unknown>;
                return {
                  name: String(field.name ?? 'unknown'),
                  type: field.type ?? 'unknown',
                  index: typeof field.index === 'boolean' ? field.index : undefined,
                };
              })
            : [],
        };
      })
    : [];

  const types = Array.isArray(r.types)
    ? r.types.map((t: unknown) => {
        if (!t || typeof t !== 'object') return { name: 'unknown', type: {} };
        const ty = t as Record<string, unknown>;
        return {
          name: String(ty.name ?? 'unknown'),
          type: ty.type ?? {},
          docs: Array.isArray(ty.docs) ? ty.docs.filter((d): d is string => typeof d === 'string') : undefined,
        };
      })
    : [];

  const metadata = r.metadata && typeof r.metadata === 'object' ? (r.metadata as Record<string, unknown>) : undefined;

  const candidate: SolanaBuilderIdlSummary = {
    name,
    version: version || undefined,
    spec: spec || undefined,
    description,
    instructions,
    accounts,
    errors,
    events: events.length > 0 ? events : undefined,
    types: types.length > 0 ? types : undefined,
    metadata,
  };

  const result = SolanaBuilderIdlSummarySchema.safeParse(candidate);
  return result.success ? result.data : null;
}
