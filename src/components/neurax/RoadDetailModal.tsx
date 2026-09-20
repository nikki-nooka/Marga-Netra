import React from 'react';
import {
  X,
  Gauge,
  Car,
  Activity,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Sparkles,
  Layers,
  GitFork,
  ShieldAlert,
  Zap,
  ArrowRight,
  TrendingDown,
  Clock,
  Compass,
  Radio,
  Sliders
} from 'lucide-react';
import type { RoadSegment } from '../../types/neurax';
import { neuraxEngine } from '../../services/neuraxService';

interface RoadDetailModalProps {
  segment: RoadSegment | null;
  theme?: 'dark' | 'light';
  onClose: () => void;
  onForecast: (segmentId: string) => void;
  onTraceSpillback: (segmentId: string) => void;
  onPlanDiversion: (segmentId: string) => void;
}

export const RoadDetailModal: React.FC<RoadDetailModalProps> = ({
  segment,
  theme = 'dark',
  onClose,
  onForecast,
  onTraceSpillback,
  onPlanDiversion
}) => {
  if (!segment) return null;

  const isLight = theme === 'light';

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isCritical = segment.ai_risk_level === 'CRITICAL';
  const isElevated = segment.ai_risk_level === 'ELEVATED';

  // Kinematic calculations
  const travelTimeMin = Math.round((segment.length_km / Math.max(1, segment.speed_kmh)) * 60 * 10) / 10;
  const freeFlowTimeMin = Math.round((segment.length_km / (segment.free_flow_speed_kmh || 50)) * 60 * 10) / 10;
  const delayMinutes = Math.max(0, Math.round((travelTimeMin - freeFlowTimeMin) * 10) / 10);
  const queueLengthMeters = Math.round(segment.queue_length_veh * 7.5);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all ${
        isLight ? 'bg-slate-900/40 backdrop-blur-sm' : 'bg-slate-950/80 backdrop-blur-md'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-fadeIn transition-all ${
          isLight
            ? 'bg-white border border-slate-200 text-slate-800 shadow-xl'
            : 'bg-slate-900 border border-slate-700/80 text-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-mono text-sm font-black shadow-inner ${
              isLight ? 'bg-slate-100 border border-slate-200 text-blue-600' : 'bg-slate-800 border border-slate-700 text-cyan-400'
            }`}>
              {segment.segment_id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Corridor Diagnostic Spatial Inspector
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isCritical
                      ? isLight ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse' : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : isElevated
                      ? isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {segment.ai_risk_level}
                </span>
              </div>
              <p className={`text-xs flex items-center gap-1.5 mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <span>Junction {segment.source_node}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span>Junction {segment.target_node}</span>
                <span>•</span>
                <span className={`capitalize font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{segment.road_class} Highway</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors border ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border-slate-200' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700/60'
            }`}
            title="Close Inspector (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Telemetry Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-3.5 rounded-2xl border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border border-slate-700/70'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Velocity</span>
              <Gauge className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <div className={`text-xl font-black mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {segment.speed_kmh}{' '}
              <span className={`text-xs font-normal ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>/ {segment.free_flow_speed_kmh} km/h</span>
            </div>
            <div className="text-[11px] font-mono text-cyan-500 mt-1 flex items-center gap-1">
              <span>Ratio:</span>
              <span className="font-bold">{Math.round(segment.speed_ratio * 100)}%</span>
              <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>({segment.speed_ratio < 0.4 ? 'Degraded' : 'Nominal'})</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border border-slate-700/70'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Throughput</span>
              <Car className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className={`text-xl font-black mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {segment.flow_vph}{' '}
              <span className={`text-xs font-normal ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>vph</span>
            </div>
            <div className={`text-[11px] mt-1 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Cap: <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>{segment.capacity_vph}</span> (V/C {Math.round((segment.flow_vph / (segment.capacity_vph || 1)) * 100)}%)
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/80 border border-slate-700/70'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Physical Queue</span>
              <Activity className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-xl font-black text-rose-500 mt-1">
              {segment.queue_length_veh}{' '}
              <span className={`text-xs font-normal ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>veh</span>
            </div>
            <div className={`text-[11px] mt-1 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Tailback: <span className="text-rose-500 font-bold">{queueLengthMeters}m</span> ({delayMinutes}m delay)
            </div>
          </div>
        </div>

        {/* Physical & Spatial Characteristics */}
        <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border border-slate-700/60'
        }`}>
          <div className="flex items-center justify-between font-bold">
            <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>Geometric & Kinematic Model:</span>
            <span className="text-[11px] font-mono text-cyan-500 font-bold">BPR Alpha=0.15 Beta=4.0</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className={`p-2 rounded-xl border ${
              isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
            }`}>
              <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>Lanes</div>
              <div className={`font-extrabold text-sm mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{segment.lanes} Active</div>
            </div>
            <div className={`p-2 rounded-xl border ${
              isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
            }`}>
              <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>Length</div>
              <div className={`font-extrabold text-sm mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{segment.length_km} km</div>
            </div>
            <div className={`p-2 rounded-xl border ${
              isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
            }`}>
              <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>Free Travel</div>
              <div className={`font-extrabold text-sm mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{freeFlowTimeMin} min</div>
            </div>
            <div className={`p-2 rounded-xl border ${
              isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'
            }`}>
              <div className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>Current Travel</div>
              <div className="font-extrabold text-amber-500 text-sm mt-0.5">{travelTimeMin} min</div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {segment.structural_bottleneck === 1 && (
              <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                isLight 
                  ? 'bg-amber-100 text-amber-900 border-amber-300' 
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                <AlertTriangle className="w-3 h-3" />
                Structural Bottleneck (Capacity Deficit)
              </span>
            )}
            {segment.is_anomaly && (
              <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
                isLight 
                  ? 'bg-purple-100 text-purple-900 border-purple-300' 
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              }`}>
                <Zap className="w-3 h-3" />
                Detector Anomaly Calibrated
              </span>
            )}
          </div>
        </div>

        {/* AI Action Advisory & Neural Policy */}
        <div className={`p-4 rounded-2xl border space-y-1.5 text-xs ${
          isLight 
            ? 'bg-blue-50/80 border-blue-200' 
            : 'bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border-blue-800/50'
        }`}>
          <div className={`font-bold flex items-center gap-2 ${isLight ? 'text-blue-900' : 'text-cyan-300'}`}>
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Neura-X Autonomous Policy Recommendation:</span>
          </div>
          <p className={`font-semibold leading-relaxed ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{segment.ai_action}</p>
          <p className={`text-[11px] font-mono ${isLight ? 'text-blue-600 font-bold' : 'text-cyan-400/80'}`}>{segment.ai_trend}</p>
        </div>

        {/* Quick Corridor Alleviation */}
        {segment.queue_length_veh > 0 ? (
          <button
            onClick={() => {
              neuraxEngine.relieveSegmentQueue(segment.segment_id);
              onClose();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Flush Residual Queue & Clear Corridor (Turn Green)</span>
          </button>
        ) : (
          <button
            onClick={() => {
              neuraxEngine.restoreSegmentQueue(segment.segment_id);
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            <span>Reset to Peak Congestion</span>
          </button>
        )}

        {/* Action Buttons */}
        <div className={`grid grid-cols-3 gap-2.5 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
          <button
            onClick={() => {
              onClose();
              onForecast(segment.segment_id);
            }}
            className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulate Forecast</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onTraceSpillback(segment.segment_id);
            }}
            className="py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Spillback Wave</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onPlanDiversion(segment.segment_id);
            }}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Deploy Reroute</span>
          </button>
        </div>
      </div>
    </div>
  );
};
