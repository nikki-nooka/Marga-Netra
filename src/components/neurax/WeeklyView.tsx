import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CloudRain,
  Sun,
  Droplets,
  TrendingUp,
  Clock,
  Car,
  Fuel,
  Activity,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Sliders,
  Zap,
  Leaf,
  ShieldAlert,
  Search,
  X,
  Sparkles,
  ChevronRight,
  BarChart3,
  Gauge
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { neuraxEngine } from '../../services/neuraxService';
import type {
  WeeklyMacroDay,
  HourlyTrafficPoint,
  TrafficRegime,
  RoadSegment
} from '../../types/neurax';

interface WeeklyViewProps {
  selectedSegmentId?: string;
  onSelectSegment?: (segmentId: string) => void;
  currentRegime?: TrafficRegime;
}

type SituationMode =
  | 'baseline'
  | 'weekend_mall_rush'
  | 'sunday_highway_inbound'
  | 'monsoon_storm'
  | 'workzone'
  | 'stadium_event';

type ChartTab = 'diurnal' | 'capacity' | 'macro_7day' | 'delay_emissions';

const POPULAR_ROADS = [
  { id: 'ALL', label: 'All Network (436 Segments)' },
  { id: 'R0435', label: 'R0435 (Outer Ring / Bottleneck)' },
  { id: 'R0376', label: 'R0376 (IT Corridor Inflow)' },
  { id: 'R0067', label: 'R0067 (Freight Arterial)' },
  { id: 'R0188', label: 'R0188 (Expressway Merge)' },
  { id: 'R0137', label: 'R0137 (Underpass Workzone)' },
  { id: 'R0341', label: 'R0341 (Signal Corridor)' },
  { id: 'R0097', label: 'R0097 (Airport Expressway)' },
  { id: 'R0012', label: 'R0012 (Central Commercial)' }
];

export const WeeklyView: React.FC<WeeklyViewProps> = ({
  selectedSegmentId = 'ALL',
  onSelectSegment,
  currentRegime
}) => {
  // Road selection state
  const [selectedRoad, setSelectedRoad] = useState<string>(selectedSegmentId || 'ALL');
  const [roadSearch, setRoadSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sync with prop when parent switches context
  useEffect(() => {
    if (selectedSegmentId && selectedSegmentId !== selectedRoad) {
      setSelectedRoad(selectedSegmentId);
    }
  }, [selectedSegmentId]);

  // Operational controls
  const [selectedDay, setSelectedDay] = useState<string>('Saturday');
  const [weatherCondition, setWeatherCondition] = useState<'dry' | 'light_rain' | 'heavy_rain'>('dry');
  const [situation, setSituation] = useState<SituationMode>('baseline');
  const [activeTab, setActiveTab] = useState<ChartTab>('diurnal');

  // Regime state
  const [regime, setRegime] = useState<TrafficRegime>(() => currentRegime || neuraxEngine.getRegime());

  useEffect(() => {
    const unsub = neuraxEngine.onRegimeChange((newRegime) => {
      setRegime(newRegime);
    });
    return unsub;
  }, []);

  const handleRegimeChange = (r: TrafficRegime) => {
    setRegime(r);
    neuraxEngine.setRegime(r);
  };

  // Road metadata
  const targetSegment = useMemo(() => {
    if (selectedRoad === 'ALL') return null;
    return neuraxEngine.getSegment(selectedRoad) || null;
  }, [selectedRoad]);

  const allRoads = useMemo(() => {
    return neuraxEngine.getAllRoadsIntelligence().roads;
  }, []);

  const filteredRoads = useMemo(() => {
    if (!roadSearch.trim()) return allRoads.slice(0, 15);
    const q = roadSearch.toLowerCase().trim();
    return allRoads
      .filter((r) => r.segment_id.toLowerCase().includes(q) || r.road_class.toLowerCase().includes(q) || r.source_node.toLowerCase().includes(q) || r.target_node.toLowerCase().includes(q))
      .slice(0, 20);
  }, [allRoads, roadSearch]);

  // Dynamic Weekly Macro Profile (Recomputes whenever road, weather, situation, or regime changes)
  const weeklyProfile = useMemo(() => {
    return neuraxEngine.getWeeklyMacroProfile({
      segmentId: selectedRoad,
      regime,
      weather: weatherCondition,
      situation
    });
  }, [selectedRoad, regime, weatherCondition, situation]);

  // Dynamic 24-hour Diurnal Profile for Selected Day
  const hourlyData: HourlyTrafficPoint[] = useMemo(() => {
    return neuraxEngine.getRoadHourlyProfile(selectedDay, {
      segmentId: selectedRoad,
      regime,
      weather: weatherCondition,
      situation
    });
  }, [selectedDay, selectedRoad, regime, weatherCondition, situation]);

  // Cumulative delay and fuel accumulation curve
  const cumulativeData = useMemo(() => {
    let accDelay = 0;
    let accFuel = 0;
    return hourlyData.map((pt) => {
      accDelay += pt.delay_min * (pt.flow_vph / 2000);
      accFuel += pt.fuel_waste_liters;
      return {
        hour: pt.hour,
        cumulative_delay_hours: Math.round(accDelay * 10) / 10,
        cumulative_fuel_liters: Math.round(accFuel),
        hourly_fuel: Math.round(pt.fuel_waste_liters),
        hourly_delay: pt.delay_min
      };
    });
  }, [hourlyData]);

  // Active day statistics
  const activeDayStats = useMemo(() => {
    return weeklyProfile.days.find((d) => d.day_name === selectedDay) || weeklyProfile.days[0];
  }, [weeklyProfile, selectedDay]);

  // Peak hourly point for active day
  const peakHourPoint = useMemo(() => {
    return [...hourlyData].sort((a, b) => b.congestion - a.congestion)[0] || hourlyData[12];
  }, [hourlyData]);

  const handleSelectRoad = (id: string) => {
    setSelectedRoad(id);
    setIsSearchOpen(false);
    setRoadSearch('');
    if (onSelectSegment && id !== 'ALL') {
      onSelectSegment(id);
    }
  };

  return (
    <div id="weekly-view" className="space-y-4">
      {/* 1. Header & Quick Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Dynamic Weekly Patterns & Diurnal Road Analytics
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Physics-grounded 24-hour diurnal flow curves, weekend commercial & return surges, weather sensitivity multipliers, and Level of Service (LOS).
            </p>
          </div>

          {/* Weather Simulation Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Weather Factor:</span>
            </span>
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setWeatherCondition('dry')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  weatherCondition === 'dry'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Dry (1.0x)</span>
              </button>
              <button
                onClick={() => setWeatherCondition('light_rain')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  weatherCondition === 'light_rain'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                <span>Light Rain (+20%)</span>
              </button>
              <button
                onClick={() => setWeatherCondition('heavy_rain')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                  weatherCondition === 'heavy_rain'
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5 text-indigo-500" />
                <span>Monsoon Storm (+45%)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Operational Regime Sync Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Operational Regime Sync:</span>
            </span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              {(['PEAK_AM', 'MIDDAY', 'PEAK_PM', 'LATE_NIGHT'] as TrafficRegime[]).map((r) => {
                const labels: Record<TrafficRegime, string> = {
                  PEAK_AM: 'Morning Peak (08:30)',
                  MIDDAY: 'Midday Ops (13:15)',
                  PEAK_PM: 'Evening Peak (18:45)',
                  LATE_NIGHT: 'Late Night (01:30)'
                };
                return (
                  <button
                    key={r}
                    onClick={() => handleRegimeChange(r)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      regime === r
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {labels[r]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Telemetry Calibrated: BPR $\alpha=0.15, \beta=4.0$ Dynamic Physics</span>
          </div>
        </div>
      </div>

      {/* 2. Road Selection & Traffic Situation Presets */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Popular Corridors Quick Selection */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>Target Corridor / Road Analysis:</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Active: <strong className="text-slate-800">{selectedRoad === 'ALL' ? 'Entire Network (436 Segments)' : selectedRoad}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {POPULAR_ROADS.map((r) => {
                const isSelected = selectedRoad === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRoad(r.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}

              {/* Road Search Button */}
              <div className="relative">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center gap-1"
                >
                  <Search className="w-3 h-3 text-slate-500" />
                  <span>Other Roads (436)</span>
                </button>

                {isSearchOpen && (
                  <div className="absolute left-0 top-full mt-1 w-64 sm:w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-2 space-y-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search road ID, node, or class..."
                        value={roadSearch}
                        onChange={(e) => setRoadSearch(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      {roadSearch && (
                        <button
                          onClick={() => setRoadSearch('')}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs custom-scrollbar">
                      {filteredRoads.map((rd) => (
                        <button
                          key={rd.segment_id}
                          onClick={() => handleSelectRoad(rd.segment_id)}
                          className="w-full text-left px-2 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 rounded flex items-center justify-between transition-colors"
                        >
                          <div>
                            <strong className="font-mono">{rd.segment_id}</strong>
                            <span className="text-slate-400 ml-1.5">({rd.road_class})</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{rd.speed_kmh} km/h</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Traffic Situation Presets */}
          <div className="shrink-0">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">
              Traffic Situation Preset:
            </span>
            <select
              value={situation}
              onChange={(e) => setSituation(e.target.value as SituationMode)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="baseline">Standard Operational Baseline</option>
              <option value="weekend_mall_rush">Weekend Commercial & Retail Rush (Sat/Sun Midday)</option>
              <option value="sunday_highway_inbound">Sunday Evening Inter-City Return Surge (17:00-21:30)</option>
              <option value="monsoon_storm">Monsoon Storm & Hydroplaning Friction</option>
              <option value="stadium_event">Major Stadium / Concert Egress Surge</option>
              <option value="workzone">Single-Lane Construction Workzone</option>
            </select>
          </div>
        </div>

        {/* Selected Road Attribute Banner */}
        {targetSegment && (
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>Segment {targetSegment.segment_id}</span>
              </span>
              <span className="text-slate-600">
                Class: <strong>{targetSegment.road_class}</strong> ({targetSegment.lanes} lanes)
              </span>
              <span className="text-slate-600">
                Design Capacity: <strong>{targetSegment.capacity_vph} vph</strong>
              </span>
              <span className="text-slate-600">
                Free-Flow Speed: <strong>{targetSegment.free_flow_speed_kmh} km/h</strong>
              </span>
              <span className="text-slate-600">
                Current Telemetry: <strong className="text-indigo-700">{targetSegment.speed_kmh} km/h</strong> ({Math.round(targetSegment.congestion_index * 100)}% cong)
              </span>
            </div>
            <button
              onClick={() => handleSelectRoad('ALL')}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Switch back to All Network</span>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 3. 7 Days Interactive Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 items-stretch">
        {weeklyProfile.days.map((d: WeeklyMacroDay) => {
          const isSelected = d.day_name === selectedDay;
          const isWeekend = d.is_weekend;

          return (
            <div
              key={d.day_name}
              onClick={() => setSelectedDay(d.day_name)}
              className={`h-[136px] min-h-[136px] max-h-[136px] p-3 rounded-2xl border cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between select-none ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50/80 shadow-2xs'
              }`}
            >
              {/* Weekend / Surge Indicator Pill */}
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-extrabold text-sm">{d.day_name.slice(0, 3)}</span>
                {isWeekend ? (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isSelected
                        ? 'bg-indigo-500/80 text-white'
                        : d.day_name === 'Saturday'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {d.day_name === 'Saturday' ? 'Sat Rush' : 'Sun Return'}
                  </span>
                ) : (
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    Weekday
                  </span>
                )}
              </div>

              {/* Congestion Index & Progress Bar */}
              <div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xl font-black tracking-tight">
                    {d.avg_congestion}%
                  </div>
                  <div className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {d.los}
                  </div>
                </div>

                {/* Miniature gauge */}
                <div className={`h-1.5 w-full rounded-full mt-1.5 overflow-hidden ${isSelected ? 'bg-indigo-900/40' : 'bg-slate-100'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      d.avg_congestion >= 70
                        ? isSelected ? 'bg-rose-300' : 'bg-rose-500'
                        : d.avg_congestion >= 50
                        ? isSelected ? 'bg-amber-300' : 'bg-amber-500'
                        : isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${d.avg_congestion}%` }}
                  />
                </div>
              </div>

              {/* Bottom metadata */}
              <div className="mt-2.5 pt-2 border-t border-slate-100/30 text-[11px] space-y-0.5">
                <div className={`flex items-center justify-between ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                  <span>Speed:</span>
                  <strong className={isSelected ? 'text-white' : 'text-slate-800'}>{d.avg_speed} km/h</strong>
                </div>
                <div className={`flex items-center justify-between ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                  <span>Trips:</span>
                  <span>{d.total_trips_k}k</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Main Graph Analytics Console with Tabbed Views */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {activeTab === 'diurnal' && `24-Hour Diurnal Congestion & Speed Dynamics: ${selectedDay}`}
                {activeTab === 'capacity' && `Volume vs. Capacity (V/C) Saturation Analysis: ${selectedDay}`}
                {activeTab === 'macro_7day' && '7-Day Weekly Macro Comparison Profile (Mon – Sun)'}
                {activeTab === 'delay_emissions' && `Cumulative Delay & Idling Fuel Inefficiency: ${selectedDay}`}
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {selectedRoad === 'ALL' ? 'City Network Aggregate' : `Corridor ${selectedRoad}`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeDayStats.is_weekend
                ? selectedDay === 'Saturday'
                  ? 'Saturday profile: Calm early morning with major midday commercial surge (12:00-15:30) and evening dining/nightlife peak (19:00-22:30).'
                  : 'Sunday profile: Quiet morning with massive inter-city highway return wave (17:00-21:30) as weekend travelers return.'
                : 'Weekday dual-peak commuter profile with AM office arrival and extended evening departure congestion.'}
            </p>
          </div>

          {/* Chart Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveTab('diurnal')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'diurnal'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Diurnal Curve</span>
            </button>
            <button
              onClick={() => setActiveTab('capacity')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'capacity'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>V/C Saturation</span>
            </button>
            <button
              onClick={() => setActiveTab('macro_7day')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'macro_7day'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>7-Day Macro</span>
            </button>
            <button
              onClick={() => setActiveTab('delay_emissions')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'delay_emissions'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fuel className="w-3.5 h-3.5" />
              <span>Delay & Emissions</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Diurnal Hourly Flow & Congestion Curve */}
        {activeTab === 'diurnal' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-indigo-600" />
                  <span className="font-semibold text-slate-700">Congestion Index (%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-500" />
                  <span className="font-semibold text-slate-700">Mean Operating Speed (km/h)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-rose-500" />
                  <span className="text-rose-600 font-semibold">Breakdown Limit (65%)</span>
                </span>
              </div>
              <div className="hidden sm:block text-[11px] text-slate-400">
                Peak: <strong className="text-slate-700">{peakHourPoint.hour}</strong> ({peakHourPoint.congestion}% cong • {peakHourPoint.avg_speed} km/h)
              </div>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={hourlyData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    unit="%"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, Math.round((targetSegment?.free_flow_speed_kmh || 60) * 1.15)]}
                    tick={{ fontSize: 11, fill: '#10b981' }}
                    axisLine={{ stroke: '#10b981' }}
                    unit=" km/h"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0].payload as HourlyTrafficPoint;
                      return (
                        <div className="bg-slate-900 text-white rounded-xl p-3 text-xs shadow-xl border border-slate-800 space-y-1.5 min-w-44">
                          <div className="font-bold flex items-center justify-between pb-1 border-b border-slate-800">
                            <span>Hour: {label}</span>
                            <span className="text-indigo-300">{pt.los}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Congestion:</span>
                            <span className="font-bold text-indigo-400">{pt.congestion}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Mean Speed:</span>
                            <span className="font-bold text-emerald-400">{pt.avg_speed} km/h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Demand Flow:</span>
                            <span className="font-bold">{pt.flow_vph} vph</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">V/C Ratio:</span>
                            <span className={pt.vc_ratio > 1.0 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                              {pt.vc_ratio}
                            </span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px]">
                            <span className="text-slate-400">Delay per veh:</span>
                            <span className="text-amber-400 font-bold">+{pt.delay_min} min</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine yAxisId="left" y={65} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth={1.5} />
                  <Bar
                    yAxisId="left"
                    dataKey="congestion"
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                    name="Congestion (%)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avg_speed"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981' }}
                    name="Speed (km/h)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 2: Volume vs. Capacity (V/C Saturation Analysis) */}
        {activeTab === 'capacity' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-indigo-500/70" />
                  <span className="font-semibold text-slate-700">Demand Volume (vph)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t-2 border-rose-500" />
                  <span className="font-semibold text-rose-600">Design Capacity Limit</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="font-semibold text-amber-700">Over-saturation Threshold (V/C &gt; 1.0)</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Design Capacity: <strong className="text-slate-700">{hourlyData[0].capacity_vph} vph</strong>
              </span>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} unit=" vph" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <ReferenceLine y={hourlyData[0].capacity_vph} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'Capacity Limit (v/c = 1.0)', fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }} />
                  <Area
                    type="monotone"
                    dataKey="flow_vph"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#volumeGradient)"
                    name="Demand Flow (vph)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 3: 7-Day Macro Profile Comparison */}
        {activeTab === 'macro_7day' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-indigo-600" />
                  <span className="font-semibold text-slate-700">Average Congestion (%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-amber-500" />
                  <span className="font-semibold text-slate-700">Peak Commuter Delay (min)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-slate-400" />
                  <span className="font-semibold text-slate-700">Vehicle Trips (k)</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Busiest Day: <strong className="text-indigo-600">{weeklyProfile.busiest_day}</strong>
              </span>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyProfile.days} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day_name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="avg_congestion" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Congestion (%)" />
                  <Bar dataKey="delay_minutes" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Delay (min)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 4: Cumulative Delay & Fuel Inefficiency */}
        {activeTab === 'delay_emissions' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-rose-500/80" />
                  <span className="font-semibold text-slate-700">Cumulative Lost Hours (VHD)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-amber-500" />
                  <span className="font-semibold text-slate-700">Excess Idling Fuel (Liters)</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Accumulated throughout {selectedDay}
              </span>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="delayGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative_delay_hours"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#delayGradient)"
                    name="Lost Commuter Hours (hrs)"
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative_fuel_liters"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="Fuel Waste (Liters)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 5. Comprehensive Traffic Engineering Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        {/* Level of Service Card */}
        <div className="h-[160px] min-h-[160px] max-h-[160px] bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between select-none">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Gauge className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              HCM Standards
            </span>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Level of Service (LOS)</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5 flex items-center gap-2">
              <span>{activeDayStats.los}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              Peak Volume/Capacity: <strong className="text-slate-700">{activeDayStats.vc_ratio}</strong>
            </p>
          </div>
        </div>

        {/* Buffer Index / Travel Time Reliability */}
        <div className="h-[160px] min-h-[160px] max-h-[160px] bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between select-none">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Reliability Buffer
            </span>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Buffer Time Index</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">
              +{activeDayStats.buffer_index_pct}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate" title="Extra cushion required for 95% on-time arrival.">
              Extra cushion required for 95% on-time arrival.
            </p>
          </div>
        </div>

        {/* Lost Commuter Delay (VHD) */}
        <div className="h-[160px] min-h-[160px] max-h-[160px] bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between select-none">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Congestion Cost
            </span>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Weekly Lost Delay</div>
            <div className="text-2xl font-black text-rose-600 mt-0.5">
              {weeklyProfile.lost_hours_k}k hrs
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate" title="Total network commuter hours lost to bottleneck queues.">
              Total hours lost to bottleneck queues.
            </p>
          </div>
        </div>

        {/* Idling Fuel & Carbon Emissions */}
        <div className="h-[160px] min-h-[160px] max-h-[160px] bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between select-none">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Fuel className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              CO₂ Footprint
            </span>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Idling Fuel Inefficiency</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {weeklyProfile.fuel_wasted_k_liters}k L
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate" title={`Yielding ~${weeklyProfile.carbon_tons} metric tons excess CO₂.`}>
              Yielding ~<strong className="text-slate-700">{weeklyProfile.carbon_tons} tons</strong> excess CO₂.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
