// src/pages/admin/DiagnosticHistory.tsx
// Histórico general de ejecuciones del Dashboard — accesible para admin y usuarios con permiso 'history.view'

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';
import { BarChart2, Trash2, RefreshCw, Search, ChevronLeft, ChevronRight, Calendar, User, Globe, ArrowLeft } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RunScores {
  performance?:    number | null;
  security?:       number | null;
  accessibility?:  number | null;
  reliability?:    number | null;
  maintainability?: number | null;
  portability?:    number | null;
}

interface DiagnosticRun {
  _id:          string;
  url:          string;
  fecha:        string;
  userName?:    string | null;
  userEmail?:   string | null;
  overallScore: number;
  scores:       RunScores;
  durationMs?:  number | null;
  fromCache?:   boolean;
}

interface HistoryResponse {
  ok:    boolean;
  page:  number;
  limit: number;
  total: number;
  pages: number;
  runs:  DiagnosticRun[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'text-gray-400';
  if (score >= 90) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function scoreBg(score: number | null | undefined): string {
  if (score == null) return 'bg-gray-100 text-gray-400';
  if (score >= 90) return 'bg-green-50 text-green-700';
  if (score >= 60) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}

function fmtDuration(ms: number | null | undefined): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const SCORE_LABELS: Record<keyof RunScores, string> = {
  performance:    'Perf.',
  security:       'Seg.',
  accessibility:  'Acc.',
  reliability:    'Fiab.',
  maintainability:'Mant.',
  portability:    'Port.',
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DiagnosticHistoryPage() {
  const navigate = useNavigate();
  const [runs, setRuns]         = useState<DiagnosticRun[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [filterUrl, setFilterUrl] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo]   = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const LIMIT = 20;

  const fetchHistory = useCallback(async (p = 1) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (filterUrl.trim())  params.set('url',  filterUrl.trim());
      if (filterFrom.trim()) params.set('from', filterFrom.trim());
      if (filterTo.trim())   params.set('to',   filterTo.trim());

      const res = await fetch(`/api/admin/history?${params}`, { credentials: 'include' });
      const data: HistoryResponse = await res.json().catch(() => ({ ok: false, runs: [], total: 0, pages: 1, page: 1, limit: LIMIT }));
      if (!res.ok) throw new Error((data as any)?.error || `Error ${res.status}`);
      setRuns(data.runs || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(data.page || 1);
    } catch (e: any) {
      setError(e?.message || 'Error cargando histórico');
    } finally { setLoading(false); }
  }, [filterUrl, filterFrom, filterTo]);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchHistory(1); };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/history/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error || 'Error'); }
      setConfirmDelete(null);
      fetchHistory(page);
    } catch (e: any) {
      alert(`Error al eliminar: ${e?.message}`);
    } finally { setDeleting(false); }
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto" data-page="diagnostic-history">
      {/* Volver */}
      <button
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={15} /> Volver
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Histórico General</h1>
            <p className="text-sm text-gray-500">{total} ejecuciones registradas</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchHistory(page)}
          disabled={loading}
          className="flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-5">
        <CardContent className="pt-4 pb-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Globe size={12} className="inline mr-1" />URL
              </label>
              <div className="relative">
                <input
                  ref={urlInputRef}
                  type="text"
                  placeholder="https://ejemplo.com"
                  value={filterUrl}
                  onChange={e => setFilterUrl(e.target.value)}
                  className="w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-8"
                />
                {filterUrl && (
                  <button type="button" onClick={() => setFilterUrl('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Calendar size={12} className="inline mr-1" />Desde
              </label>
              <input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <Calendar size={12} className="inline mr-1" />Hasta
              </label>
              <input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <Button type="submit" size="sm" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Search size={13} />
              Buscar
            </Button>
            {(filterUrl || filterFrom || filterTo) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setFilterUrl(''); setFilterFrom(''); setFilterTo(''); }}
              >
                Limpiar
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {loading && runs.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">Cargando…</div>
          ) : runs.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              No hay registros aún.
              <br />
              <span className="text-xs mt-1 block">Los registros aparecen después de ejecutar el Dashboard de diagnóstico.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">URL</th>
                    <th className="px-4 py-3 text-left">
                      <User size={12} className="inline mr-1" />Usuario
                    </th>
                    <th className="px-4 py-3 text-center">Score</th>
                    {(Object.keys(SCORE_LABELS) as Array<keyof RunScores>).map(k => (
                      <th key={k} className="px-2 py-3 text-center">{SCORE_LABELS[k]}</th>
                    ))}
                    <th className="px-4 py-3 text-center">Duración</th>
                    <th className="px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {runs.map(run => (
                    <tr key={run._id} className="hover:bg-gray-50 transition-colors">
                      {/* Fecha */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {fmtDate(run.fecha)}
                        {run.fromCache && (
                          <span className="ml-1.5 px-1 py-0.5 rounded text-[10px] bg-gray-100 text-gray-400">caché</span>
                        )}
                      </td>
                      {/* URL */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <a
                          href={run.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline truncate block text-xs"
                          title={run.url}
                        >
                          {run.url}
                        </a>
                      </td>
                      {/* Usuario */}
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {run.userName && <span className="font-medium">{run.userName}</span>}
                        {run.userEmail && (
                          <span className="block text-gray-400 truncate max-w-[160px]">{run.userEmail}</span>
                        )}
                        {!run.userName && !run.userEmail && <span className="text-gray-300">—</span>}
                      </td>
                      {/* Score general */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${scoreBg(run.overallScore)}`}>
                          {run.overallScore}
                        </span>
                      </td>
                      {/* Scores individuales */}
                      {(Object.keys(SCORE_LABELS) as Array<keyof RunScores>).map(k => {
                        const val = run.scores?.[k];
                        return (
                          <td key={k} className={`px-2 py-3 text-center text-xs font-semibold ${scoreColor(val)}`}>
                            {val != null ? Math.round(val) : <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}
                      {/* Duración */}
                      <td className="px-4 py-3 text-center text-xs text-gray-400">
                        {fmtDuration(run.durationMs)}
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3 text-center">
                        {confirmDelete === run._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(run._id)}
                              disabled={deleting}
                              className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {deleting ? '…' : 'Confirmar'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(run._id)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {page} de {pages} ({total} registros)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHistory(page - 1)}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1"
            >
              <ChevronLeft size={14} />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHistory(page + 1)}
              disabled={page >= pages || loading}
              className="flex items-center gap-1"
            >
              Siguiente
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
