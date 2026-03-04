// src/pages/admin/telemetry/TelemetryMicrosSection.tsx
// Sección "Diagnósticos por pruebas" del panel de telemetría admin

const MAP_DISPLAY: Record<string, string> = {
    performance: 'Pagespeed',
    security: 'Security',
    accessibility: 'Accesibilidad',
    reliability: 'Fiabilidad',
    maintainability: 'Mantenibilidad',
    portability: 'Portabilidad',
};

interface MicroEntry {
    micro: string;
    avgMs?: number;
    count?: number;
    failCount?: number;
    users?: Array<{ userId?: string; name?: string; count?: number }>;
    byRole?: Record<string, number>;
}

interface RoleSummaryRow {
    role: string;
    byApi?: Record<string, number>;
    [k: string]: unknown;
}

interface TelemetryMicrosSectionProps {
    diag: {
        micros?: unknown[];
        byTipo?: unknown[];
    };
    rolesSummary: RoleSummaryRow[];
    normalizeMicroRoles: (m: unknown) => Array<{ role: string; count: number }>;
}

export function TelemetryMicrosSection({ diag, rolesSummary, normalizeMicroRoles }: TelemetryMicrosSectionProps) {
    const baseMicros: MicroEntry[] = (diag.micros ?? []).map((m: unknown) => {
        const r = m as Record<string, unknown>;
        return {
            micro: String(r.micro ?? ''),
            avgMs: r.avgMs as number | undefined,
            count: r.count as number | undefined,
            failCount: r.failCount as number | undefined,
            users: r.users as MicroEntry['users'],
            byRole: undefined,
        };
    });

    const qualityTipos = ((diag.byTipo ?? []) as Array<Record<string, unknown>>).filter(
        (t) => !['performance', 'security'].includes(String(t.tipo ?? '')),
    );

    const qualityEntries: MicroEntry[] = qualityTipos.map((t) => {
        const rolesForTipo: Record<string, number> = {};
        rolesSummary.forEach((r) => {
            if (r.byApi && (r.byApi as Record<string, number>)[String(t.tipo)] > 0) {
                rolesForTipo[r.role] = (r.byApi as Record<string, number>)[String(t.tipo)];
            }
        });
        return {
            micro: MAP_DISPLAY[String(t.tipo)] ?? String(t.tipo),
            avgMs: t.avgMs as number | undefined,
            count: t.count as number | undefined,
            failCount: 0,
            users: ((t.users ?? []) as Array<Record<string, unknown>>).map((u) => ({
                userId: String(u.userId ?? ''),
                name: u.name ? String(u.name) : undefined,
                count: u.count as number | undefined,
            })),
            byRole: rolesForTipo,
        };
    });

    const allItems = [...baseMicros, ...qualityEntries];
    const empty = !baseMicros.length && !qualityEntries.length;

    return (
        <div className="grid grid-cols-1 gap-6">
            <div className="p-4 rounded border bg-white">
                <h3 className="text-sm font-medium mb-4">Diagnósticos por pruebas</h3>
                <ul className="text-xs space-y-4 max-h-[420px] overflow-auto pr-1">
                    {allItems.map((m) => {
                        const roles = normalizeMicroRoles(m);
                        const users = m.users ?? [];
                        return (
                            <li key={m.micro} className="flex flex-col border-b pb-3 last:border-0">
                                <div className="flex justify-between flex-col sm:flex-row gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-800 mb-0.5 capitalize">{m.micro}</div>
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                                {m.count ?? 0} ejec.
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                                {m.avgMs ? Math.round(m.avgMs) + 'ms' : '—'}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                                                {m.failCount ?? 0} fallos
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end justify-start gap-1">
                                        <span className="text-[10px] font-medium text-slate-500">Por rol</span>
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {roles.length ? (
                                                roles.map((r) => (
                                                    <span key={r.role} className="text-[10px] px-1.5 py-0.5 rounded border bg-slate-50 text-slate-700">
                                                        {r.role}: {r.count}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">—</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    <span className="text-[10px] text-slate-500 mr-1">Usuarios:</span>
                                    {users.length > 0 ? (
                                        users.map((u) => (
                                            <span
                                                key={u.userId}
                                                className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded"
                                            >
                                                {u.name || u.userId}: {u.count}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-[10px] text-slate-400 italic">—</span>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                    {empty && <li className="text-slate-400">Sin datos</li>}
                </ul>
            </div>
        </div>
    );
}
