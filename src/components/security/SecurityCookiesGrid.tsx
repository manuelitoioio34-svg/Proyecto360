// src/components/security/SecurityCookiesGrid.tsx
// Grid de cookies con banderas de seguridad (Secure, HttpOnly, SameSite)

import { SectionDivider } from './SecuritySectionDivider';

interface SecurityCookiesGridProps {
    cookies: Record<string, unknown>[];
}

export function SecurityCookiesGrid({ cookies }: SecurityCookiesGridProps) {
    return (
        <>
            <SectionDivider
                label="Cookies"
                info={<>Revisa cookies detectadas y valida banderas de seguridad: Secure, HttpOnly y SameSite.</>}
            />
            <div>
                <h3 className="text-lg font-semibold mb-2">Cookies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cookies.map((ck, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 dark:border-[#1e2d45] p-3 bg-white dark:bg-[#13203a]">
                            <div className="flex items-start justify-between">
                                <div className="font-medium break-words text-slate-900 dark:text-slate-100">
                                    {String(ck?.name || '(sin nombre)')}
                                </div>
                                <div className="flex items-center gap-1 text-[10px]">
                                    {!!ck?.secure && (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                            Secure
                                        </span>
                                    )}
                                    {!!ck?.httpOnly && (
                                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                                            HttpOnly
                                        </span>
                                    )}
                                    {!!ck?.sameSite && (
                                        <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                                            SameSite:{String(ck.sameSite)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {!!ck?.value && (
                                <div className="mt-2">
                                    <div className="text-[11px] text-slate-500">Valor</div>
                                    <code className="text-xs bg-slate-100 dark:bg-[#162440] dark:text-slate-300 px-2 py-1 rounded whitespace-pre-wrap break-all">
                                        {String(ck.value)}
                                    </code>
                                </div>
                            )}
                            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                                {!!ck?.domain && (
                                    <div>
                                        <span className="font-medium">Dominio:</span> {String(ck.domain)}
                                    </div>
                                )}
                                {!!ck?.path && (
                                    <div>
                                        <span className="font-medium">Path:</span> {String(ck.path)}
                                    </div>
                                )}
                                {!!ck?.expires && (
                                    <div>
                                        <span className="font-medium">Expira:</span> {String(ck.expires)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
