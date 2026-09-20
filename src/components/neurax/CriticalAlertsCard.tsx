import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
  GitFork,
  Radio,
  Search,
  X
} from 'lucide-react';
import type { RoadSegment } from '../../types/neurax';

interface CriticalAlertsCardProps {
  criticalSegments: RoadSegment[];
  onSelectSegment: (segmentId: string) => void;
  onTraceSpillback: (segmentId: string) => void;
  onPlanDiversion: (segmentId: string) => void;
  onForecast: (segmentId: string) => void;
}

export const CriticalAlertsCard: React.FC<CriticalAlertsCardProps> = ({
  criticalSegments,
  onSelectSegment,
  onTraceSpillback,
  onPlanDiversion,
  onForecast
}) => {
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'ELEVATED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const criticalCount = useMemo(
    () => criticalSegments.filter((s) => s.ai_risk_level === 'CRITICAL').length,
    [criticalSegments]
  );
  const elevatedCount = useMemo(
    () => criticalSegments.filter((s) => s.ai_risk_level === 'ELEVATED').length,
    [criticalSegments]
  );

  const filteredSegments = useMemo(() => {
    return criticalSegments.filter((seg) => {
      if (severityFilter === 'CRITICAL' && seg.ai_risk_level !== 'CRITICAL') return false;
      if (severityFilter === 'ELEVATED' && seg.ai_risk_level !== 'ELEVATED') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = seg.segment_id.toLowerCase().includes(q);
        const matchesNodes =
          seg.source_node.toLowerCase().includes(q) || seg.target_node.toLowerCase().includes(q);
        const matchesStatus = (seg.ai_status || '').toLowerCase().includes(q);
        return matchesId || matchesNodes || matchesStatus;
      }
      return true;
    });
  }, [criticalSegments, severityFilter, searchQuery]);

  return (
    <div
      id="critical-alerts-card"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col h-[560px] max-h-[560px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Active Critical Incidents & Bottlenecks</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {criticalSegments.length} Active
              </span>
            </h3>
            <p className="text-xs text-slate-500">Real-time kinematic wave queue detection</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="pt-2.5 pb-2 flex items-center justify-between gap-2 shrink-0 border-b border-slate-100/80">
        {/* Severity Tabs */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setSeverityFilter('ALL')}
            className={`px-2 py-1 rounded-md transition-colors text-[11px] ${
              severityFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({criticalSegments.length})
          </button>
          <button
            onClick={() => setSeverityFilter('CRITICAL')}
            className={`px-2 py-1 rounded-md transition-colors text-[11px] flex items-center gap-1 ${
              severityFilter === 'CRITICAL'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold shadow-xs'
                : 'text-rose-600 hover:text-rose-800'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setSeverityFilter('ELEVATED')}
            className={`px-2 py-1 rounded-md transition-colors text-[11px] flex items-center gap-1 ${
              severityFilter === 'ELEVATED'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 font-bold shadow-xs'
                : 'text-amber-600 hover:text-amber-800'
            }`}
          >
            Elevated ({elevatedCount})
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-36 sm:w-44">
          <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="Search road/node..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable list contained neatly inside the box */}
      <div className="divide-y divide-slate-100 my-1 flex-1 min-h-0 overflow-y-auto pr-1.5 custom-scrollbar">
        {filteredSegments.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No active incidents found matching the filter criteria.
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const isCritical = seg.ai_risk_level === 'CRITICAL';
            return (
              <div
                key={seg.segment_id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 -mx-1 px-2 rounded-xl transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                      {seg.segment_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        isCritical
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {seg.ai_risk_level}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {seg.ai_status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                    <span>
                      Nodes: <strong className="text-slate-700">{seg.source_node}</strong> →{' '}
                      <strong className="text-slate-700">{seg.target_node}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Queue: <strong className="text-rose-600">{seg.queue_length_veh} veh</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Speed:{' '}
                      <strong className="text-slate-800">
                        {seg.speed_kmh} km/h
                      </strong>{' '}
                      ({Math.round((1 - seg.speed_ratio) * 100)}% drop)
                    </span>
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    id={`btn-briefing-${seg.segment_id}`}
                    onClick={() => onSelectSegment(seg.segment_id)}
                    title="Load into AI Situational Briefing"
                    className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-violet-50 hover:border-violet-300 text-slate-700 hover:text-violet-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Radio className="w-3 h-3 text-violet-600" />
                    <span>Briefing</span>
                  </button>

                  <button
                    id={`btn-spillback-${seg.segment_id}`}
                    onClick={() => onTraceSpillback(seg.segment_id)}
                    title="Trace Causal Shockwave Spillback"
                    className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Layers className="w-3 h-3 text-blue-600" />
                    <span>Spillback</span>
                  </button>

                  <button
                    id={`btn-diversion-${seg.segment_id}`}
                    onClick={() => onPlanDiversion(seg.segment_id)}
                    title="Compute K-Shortest Path Diversions"
                    className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <GitFork className="w-3 h-3 text-emerald-600" />
                    <span>Reroute</span>
                  </button>

                  <button
                    id={`btn-forecast-${seg.segment_id}`}
                    onClick={() => onForecast(seg.segment_id)}
                    title="Multi-horizon Predictive Forecast"
                    className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Forecast</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0 mt-auto">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Showing {filteredSegments.length} of {criticalSegments.length} bottlenecks
        </span>
        <button
          onClick={() => {
            setSeverityFilter('ALL');
            setSearchQuery('');
            onSelectSegment(criticalSegments[0]?.segment_id || 'R0435');
          }}
          className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
        >
          <span>Reset filter</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
