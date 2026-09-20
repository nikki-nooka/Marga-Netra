import React from 'react';
import {
  Gauge,
  TrendingUp,
  AlertTriangle,
  Activity,
  Zap,
  CheckCircle2,
  Car,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { CityKPIs } from '../../types/neurax';

interface KPIRibbonProps {
  kpis: CityKPIs;
  onSelectBottlenecks?: () => void;
  onSelectIncidents?: () => void;
}

export const KPIRibbon: React.FC<KPIRibbonProps> = ({
  kpis,
  onSelectBottlenecks,
  onSelectIncidents,
}) => {
  return (
    <div id="kpi-ribbon-container" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 items-stretch">
      {/* 1. Avg Speed */}
      <div id="kpi-avg-speed" className="h-[106px] min-h-[106px] max-h-[106px] bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between hover:border-blue-400 transition-colors select-none">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate pr-1">Avg Speed</span>
          <Gauge className="w-4 h-4 text-blue-600 shrink-0" />
        </div>
        <div className="my-auto py-0.5">
          <div className="text-xl font-bold text-slate-900 tracking-tight flex items-baseline gap-1 leading-none">
            {kpis.avg_speed_kmh}
            <span className="text-xs font-semibold text-slate-400">km/h</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold truncate h-4" title="+2.4% vs 1h ago">
          <TrendingUp className="w-3 h-3 shrink-0" />
          <span className="truncate">+2.4% vs 1h ago</span>
        </div>
      </div>

      {/* 2. Total Flow */}
      <div id="kpi-total-flow" className="h-[106px] min-h-[106px] max-h-[106px] bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between hover:border-indigo-400 transition-colors select-none">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate pr-1">Network Flow</span>
          <Car className="w-4 h-4 text-indigo-600 shrink-0" />
        </div>
        <div className="my-auto py-0.5">
          <div className="text-xl font-bold text-slate-900 tracking-tight flex items-baseline gap-1 leading-none">
            {(kpis.total_flow_vph / 1000).toFixed(1)}k
            <span className="text-xs font-semibold text-slate-400">vph</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 truncate h-4 flex items-center" title={`${kpis.total_segments} active monitored links`}>
          <span className="truncate">{kpis.total_segments} active links</span>
        </div>
      </div>

      {/* 3. Free Flow % */}
      <div id="kpi-free-flow" className="h-[106px] min-h-[106px] max-h-[106px] bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between hover:border-emerald-400 transition-colors select-none">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate pr-1">Free Flow</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        </div>
        <div className="my-auto py-0.5">
          <div className="text-xl font-bold text-emerald-600 tracking-tight flex items-baseline gap-1 leading-none">
            {kpis.free_flow_pct}%
          </div>
        </div>
        <div className="text-[11px] text-slate-500 truncate h-4 flex items-center" title="Speed ratio > 80%">
          <span className="truncate">Speed ratio &gt; 80%</span>
        </div>
      </div>

      {/* 4. Moderate % */}
      <div id="kpi-moderate" className="h-[106px] min-h-[106px] max-h-[106px] bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between hover:border-amber-400 transition-colors select-none">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate pr-1">Moderate</span>
          <Activity className="w-4 h-4 text-amber-500 shrink-0" />
        </div>
        <div className="my-auto py-0.5">
          <div className="text-xl font-bold text-amber-600 tracking-tight flex items-baseline gap-1 leading-none">
            {kpis.moderate_pct}%
          </div>
        </div>
        <div className="text-[11px] text-slate-500 truncate h-4 flex items-center" title="Speed ratio 50-80%">
          <span className="truncate">Speed ratio 50–80%</span>
        </div>
      </div>

      {/* 5. Heavy % */}
      <div id="kpi-heavy" className="h-[106px] min-h-[106px] max-h-[106px] bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between hover:border-orange-400 transition-colors select-none">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate pr-1">Heavy</span>
          <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
        </div>
        <div className="my-auto py-0.5">
          <div className="text-xl font-bold text-orange-600 tracking-tight flex items-baseline gap-1 leading-none">
            {kpis.heavy_pct}%
          </div>
        </div>
        <div className="text-[11px] text-slate-500 truncate h-4 flex items-center" title="Speed ratio 30-50%">
          <span className="truncate">Speed ratio 30–50%</span>
        </div>
      </div>

      {/* 6. Gridlock % */}
      <div id="kpi-gridlock" className="h-[106px] min-h-[106px] max-h-[106px] bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col justify-between hover:border-red-400 transition-colors select-none">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 truncate pr-1">Gridlock</span>
          <Zap className="w-4 h-4 text-red-500 shrink-0" />
        </div>
        <div className="my-auto py-0.5">
          <div className="text-xl font-bold text-red-600 tracking-tight flex items-baseline gap-1 leading-none">
            {kpis.gridlock_pct}%
          </div>
        </div>
        <div className="text-[11px] text-slate-500 truncate h-4 flex items-center" title="Speed ratio < 30%">
          <span className="truncate">Speed ratio &lt; 30%</span>
        </div>
      </div>

      {/* 7. Active Incidents */}
      <div
        id="kpi-active-incidents"
        onClick={onSelectIncidents}
        className="h-[106px] min-h-[106px] max-h-[106px] bg-white border border-rose-200 rounded-xl p-3 shadow-xs flex flex-col justify-between hover:border-rose-400 cursor-pointer transition-all hover:shadow-xs select-none"
        title="Click to view and trace active incident spillback"
      >
        <div className="flex items-center justify-between text-rose-600">
          <span className="text-[11px] font-bold uppercase tracking-wider truncate pr-1">Incidents</span>
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
        </div>
        <div className="my-auto py-0.5">
          <div className="text-xl font-bold text-rose-700 tracking-tight flex items-baseline gap-1 leading-none">
            {kpis.active_incidents_count}
            <span className="text-xs font-semibold text-rose-400">active</span>
          </div>
        </div>
        <div className="text-[11px] text-rose-600 font-semibold truncate h-4 flex items-center" title="R0435, R0376, R0067">
          <span className="truncate">R0435, R0376, R0067</span>
        </div>
      </div>

      {/* 8. Network Health Score */}
      <div
        id="kpi-health-score"
        onClick={onSelectBottlenecks}
        className="h-[106px] min-h-[106px] max-h-[106px] bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-xl p-3 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-all select-none"
        title="Click to view structural bottlenecks"
      >
        <div className="flex items-center justify-between text-blue-200">
          <span className="text-[11px] font-bold uppercase tracking-wider truncate pr-1">Health Index</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        </div>
        <div className="my-auto py-0.5">
          <div className="text-xl font-extrabold text-white tracking-tight flex items-baseline gap-1 leading-none">
            {kpis.network_health_score}
            <span className="text-xs font-semibold text-emerald-400">/ 100</span>
          </div>
        </div>
        <div className="text-[11px] text-blue-200 truncate h-4 flex items-center" title={`${kpis.active_bottlenecks_count} bottlenecks tracked`}>
          <span className="truncate">{kpis.active_bottlenecks_count} bottlenecks</span>
        </div>
      </div>
    </div>
  );
};
