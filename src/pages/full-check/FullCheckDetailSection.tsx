// src/pages/full-check/FullCheckDetailSection.tsx

// DetailSection (acordeón animado) y ActionPlanList
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionPlanItem } from '../../shared/types/api';

export function DetailSection({
    title,
    icon,
    expanded,
    onToggle,
    count,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    expanded: boolean;
    onToggle: () => void;
    count?: number;
    children: React.ReactNode;
}) {
    return (
        <>
            <div className="border-2 rounded-xl overflow-hidden bg-white shadow-sm" data-pdf-avoid>
                <button
                    onClick={onToggle}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors focus:outline-none"
                >
                    <div className="flex items-center gap-3">
                        {icon}
                        <span className="font-bold text-gray-900 text-base">{title}</span>
                    </div>
                    <div
                        className="transition-transform"
                        style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                        {expanded ? (
                            <ChevronUp size={20} className="text-gray-600" />
                        ) : (
                            <ChevronDown size={20} className="text-gray-600" />
                        )}
                    </div>
                </button>
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                            data-pdf-avoid
                        >
                            <div className="p-4 border-t-2 bg-gray-50">{children}</div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* Prefer to break the page after each detail section */}
            <div data-pdf-stop style={{ height: 1 }} />
        </>
    );
}

export function ActionPlanList({ items }: { items: ActionPlanItem[] }) {
    return (
        <>
            <ul className="space-y-2.5">
                {items.map((item, idx) => (
                    <li
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border-2 hover:shadow-md transition-shadow"
                        data-pdf-avoid
                    >
                        <div
                            className={`mt-0.5 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                                item.severity === 'high'
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : item.severity === 'medium'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-gray-100 text-gray-800 border border-gray-300'
                            }`}
                        >
                            {item.severity || 'info'}
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-1 text-sm">{item.title}</div>
                            <div className="text-sm text-gray-600 leading-relaxed">{item.recommendation}</div>
                        </div>
                    </li>
                ))}
            </ul>
            {/* Allow a page break after action plan block */}
            <div data-pdf-stop style={{ height: 1 }} />
        </>
    );
}
