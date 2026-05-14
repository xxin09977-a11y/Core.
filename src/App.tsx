/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import confetti from 'canvas-confetti';
import { 
  Settings, 
  Plus, 
  Check, 
  Minus,
  Flame, 
  Moon, 
  Coffee, 
  Dumbbell, 
  Book, 
  Wind,
  Brain,
  Droplets,
  Timer,
  Terminal,
  Footprints,
  Heart,
  Music,
  X,
  Palette,
  MoonStar,
  Monitor,
  Sun,
  Star,
  Zap,
  PenTool,
  Code,
  Camera,
  TreePine,
  Car,
  Plane,
  ShoppingBag,
  Gamepad2,
  Brush,
  Utensils,
  Leaf,
  Pill,
  Smile,
  Calendar,
  Anchor, Compass, Coins, Map, Ship, Swords, Crown, Ghost, Skull, RotateCcw,
  Activity, Folder, ChevronDown, ChevronUp, Layers, Bell, Database, Download, Upload, ChevronRight, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type HabitStatus = 'done' | 'skip' | 'empty';

interface Habit {
  id: string;
  name: string;
  intent?: string;
  category?: string;
  folderId?: string | null;
  icon: keyof typeof ICON_MAP;
  color: string;
  history: HabitStatus[]; // Legacy
  logs?: Record<string, HabitStatus>; // YYYY-MM-DD -> status
  tags?: string[];
  bestStreak?: number;
  reminder?: {
    time: string; // HH:mm format
    active: boolean;
    days?: number[]; // 0-6 (Sun-Sat)
    lastNotified?: string; // YYYY-MM-DD
  };
}

interface Folder {
  id: string;
  name: string;
  isOpen: boolean;
}

const getTodayStr = () => new Date().toISOString().split('T')[0];

const getRollingWindowDates = (length: number) => Array.from({ length }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - i);
  return d.toISOString().split('T')[0];
}).reverse();

const calculateStreak = (habit: Habit) => {
  if (!habit.logs) return 0;
  let streak = 0;
  const now = new Date();
  let checkDate = new Date();
  
  while (true) {
    const ds = checkDate.toISOString().split('T')[0];
    const status = habit.logs[ds];
    
    if (status === 'done') {
      streak++;
    } else if (status === 'skip') {
      // Continue without breaking
    } else {
      // If it's today and empty, don't break yet
      if (ds === getTodayStr()) {
        // just continue checking previous days
      } else {
        break;
      }
    }
    checkDate.setDate(checkDate.getDate() - 1);
    // Limit safety
    if (streak > 3650) break; 
  }
  return streak;
};

const getStreakHistory = (habit: Habit) => {
  if (!habit.logs) return [];
  const streaks: number[] = [];
  let current = 0;
  
  // Sort dates
  const dates = Object.keys(habit.logs).sort();
  if (dates.length === 0) return [];

  const start = new Date(dates[0]);
  const end = new Date();
  let curr = new Date(start);

  while (curr <= end) {
    const ds = curr.toISOString().split('T')[0];
    const status = habit.logs[ds];

    if (status === 'done') {
      current++;
    } else if (status === 'skip') {
      // ignore
    } else {
      if (current > 0) streaks.push(current);
      current = 0;
    }
    curr.setDate(curr.getDate() + 1);
  }

  if (current > 0) streaks.push(current);
  return streaks;
};

const ICON_MAP = {
  JollyRoger: Skull,
  LogPose: Compass,
  Berry: Coins,
  TreasureMap: Map,
  Anchor: Anchor,
  PirateShip: Ship,
  Swords: Swords,
  Crown: Crown,
  Ghost: Ghost,
  Flame: Flame,
  Heart: Heart,
  Music: Music,
  Star: Star,
  Smile: Smile,
  Zap: Zap,
  Coffee: Coffee,
  Dumbbell: Dumbbell,
  Book: Book,
  Utensils: Utensils,
  Terminal: Terminal
};

const ACCENT_COLORS = [
  '#EF4444', // Luffy Red
  '#22C55E', // Zoro Green
  '#F97316', // Nami Orange
  '#3B82F6', // Sanji Blue
  '#F472B6', // Chopper Pink
  '#8B5CF6', // Robin Purple
  '#06B6D4', // Franky Cyan
  '#EAB308', // Usopp Yellow
  '#E4E4E7', // Brook White
  '#0284C7', // Jinbe Blue
];

const COLOR_LABELS: Record<string, string> = {
  '#EF4444': 'Red',
  '#22C55E': 'Green',
  '#F97316': 'Orange',
  '#3B82F6': 'Blue',
  '#F472B6': 'Pink',
  '#8B5CF6': 'Purple',
  '#06B6D4': 'Cyan',
  '#EAB308': 'Yellow',
  '#E4E4E7': 'White',
  '#0284C7': 'Azure'
};

const THEMES: Record<string, {primary: string, secondary: string}> = {
  VOID: { primary: '#6c63ff', secondary: '#c026d3' }, // Deep purple/pink
  AURORA: { primary: '#38bdf8', secondary: '#34d399' }, // Cyan/Green
  MATCHA: { primary: '#4ade80', secondary: '#fcd34d' }, // Green/Yellow
  CYBERPUNK: { primary: '#f0abfc', secondary: '#fb923c' }, // Pink/Orange
  'MIDNIGHT OCEAN': { primary: '#0ea5e9', secondary: '#1d4ed8' }, // Blues
  SAKURA: { primary: '#f472b6', secondary: '#fda4af' }, // Pinks
  EMBER: { primary: '#f97316', secondary: '#dc2626' }, // Orange/Red
  MONOCHROME: { primary: '#e2e8f0', secondary: '#64748b' }, // Gray/Slate
};

const QUOTES = [
  { text: "When do you think people die? When they are forgotten.", author: "Dr. Hiriluk" },
  { text: "I have no sympathy for criminals, but for my family, I do.", author: "Monkey D. Garp" },
  { text: "Scars on the back are a swordsman's shame.", author: "Roronoa Zoro" },
  { text: "Inherited Will, The Destiny of the Age, and The Dreams of the People.", author: "Gol D. Roger" },
  { text: "No matter how hard or impossible it is, never lose sight of your goal.", author: "Monkey D. Luffy" }
];

const THEME_SWATCHES: Record<string, string> = {
  VOID: 'linear-gradient(135deg, #2d2b55, #1e1e3f)',
  AURORA: 'linear-gradient(135deg, #1a2a4a, #1e3a5f)',
  MATCHA: 'linear-gradient(135deg, #1a3a2a, #1f4a30)',
  CYBERPUNK: 'linear-gradient(135deg, #3d1060, #1a0040)',
  'MIDNIGHT OCEAN': 'linear-gradient(135deg, #0a2040, #102a55)',
  SAKURA: 'linear-gradient(135deg, #3d1030, #2a0820)',
  EMBER: 'linear-gradient(135deg, #3d1500, #2a0f00)',
  MONOCHROME: 'linear-gradient(135deg, #2a2a2a, #1a1a1a)',
};

const HABIT_CATEGORIES = [
  'Spirit', // Mindfulness
  'Body',   // Health
  'Will',   // Productivity
  'Knowledge', // Skills
  'Bonds',   // Social
  'Wealth',  // Finance
  'Quest',   // Goal/Project
];

const INITIAL_HABITS: Habit[] = [
  {
    id: '1',
    name: 'Haki Training',
    category: 'Spirit',
    icon: 'Swords',
    color: '#EF4444',
    history: [],
    logs: { [getTodayStr()]: 'done' }
  },
  {
    id: '2',
    name: 'Find the All Blue',
    category: 'Quest',
    icon: 'Swords',
    color: '#3B82F6',
    history: [],
    logs: { [getTodayStr()]: 'empty' }
  }
];

// Watermark Background Component - Optimized
const WatermarkBackground = ({ pureBlack }: { pureBlack?: boolean }) => {
  return (
    <div className={`fixed inset-0 pointer-events-none z-[-1] transition-colors duration-500 ${pureBlack ? 'bg-black' : 'bg-[#0f0f14]'}`}>
      {!pureBlack && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
        />
      )}
    </div>
  );
};

const MemoizedHabitCard = React.memo(({ 
  habit, 
  idx, 
  onToggle, 
  onEdit, 
  onLongPress, 
  onLongPressCancel,
  isQuickActionsOpen,
  theme,
  weekDays,
  isSelectionMode,
  isSelected,
  onToggleSelection
}: { 
  habit: Habit; 
  idx: number; 
  onToggle: (id: string, date: string, e: any) => void;
  onEdit: () => void;
  onLongPress: (e: React.PointerEvent, h: Habit) => void;
  onLongPressCancel: () => void;
  isQuickActionsOpen: boolean;
  theme: string;
  weekDays: string[];
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
}) => {
  const IconComponent = ICON_MAP[habit.icon] || Wind;
  const habitColor = habit.color;

  return (
    <div
      onClick={() => {
        if (isSelectionMode) {
          onToggleSelection(habit.id);
        } else if (!isQuickActionsOpen) {
          onEdit();
        }
      }}
      className={`relative rounded-[16px] mb-3 flex bg-[#1e1e2e] border border-[#2a2a45] overflow-hidden transition-transform active:scale-[0.98] ${isSelected ? 'ring-2 ring-amber-500/50' : ''}`}
      onPointerDown={(e) => !isSelectionMode && onLongPress(e, habit)}
      onPointerUp={onLongPressCancel}
      onPointerLeave={onLongPressCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isSelectionMode && (
        <div className="absolute top-2 left-2 z-30">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-white/20 bg-black/20'}`}>
            {isSelected && <Check size={12} strokeWidth={4} className="text-white" />}
          </div>
        </div>
      )}
      <div className={`flex flex-col flex-1 py-[10px] pr-[12px] pl-[10px] ${isSelectionMode ? 'pl-[36px]' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-[28px] h-[28px] rounded-lg flex items-center justify-center shrink-0 bg-[#252540]" 
            style={{ color: habitColor }}
          >
            <IconComponent size={14} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col flex-1 overflow-hidden mr-2">
            <h3 className="text-[14px] font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis tracking-tight leading-tight">
              {habit.name}
            </h3>
            {habit.tags && habit.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5 overflow-x-auto no-scrollbar pb-0.5">
                {habit.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-bold px-1.5 py-[1px] rounded bg-white/10 text-white/60 tracking-wide uppercase shrink-0">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div 
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 bg-[#1a1a30]"
              style={{ color: (THEMES[theme] || THEMES.VOID).secondary }}
            >
              <Flame size={10} />
              <span>{calculateStreak(habit)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-1 px-0.5 pb-0.5">
          {weekDays.map((dateStr) => {
            const status = habit.logs?.[dateStr] || 'empty';
            const isToday = dateStr === getTodayStr();
            const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'narrow' });
            const dateNum = new Date(dateStr).getDate();
            const isDone = status === 'done';
            const isSkip = status === 'skip';

            let dayCircleStyle: React.CSSProperties = {
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.5)'
            };
            
            if (isDone) {
              dayCircleStyle = { background: habitColor, border: 'none', color: 'white' };
            } else if (isSkip) {
              dayCircleStyle = { background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' };
            } else if (isToday) {
              dayCircleStyle = { background: 'rgba(108,99,255,0.12)', border: '1.5px solid #6c63ff', color: 'rgba(255,255,255,0.6)' };
            }

            return (
              <button
                key={dateStr}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(habit.id, dateStr, e);
                }}
                className={`flex-1 flex flex-col items-center gap-[4px] p-[6px_2px] rounded-xl transition-colors active:scale-90 ${isToday ? 'bg-white/5' : ''}`}
              >
                <span className={`text-[8px] font-black uppercase tracking-tighter leading-none ${isToday ? 'text-white' : 'text-white/20'}`}>
                  {dayName}
                </span>
                <div
                  className={`w-[28px] h-[28px] rounded-lg flex items-center justify-center text-[10px] font-bold`}
                  style={dayCircleStyle}
                >
                  <div className="relative flex items-center justify-center w-full h-full">
                    <span className={`absolute top-0.5 right-[1.5px] text-[8px] font-black leading-none ${isDone || isSkip ? 'text-white/70' : 'text-white/40'}`}>
                      {dateNum}
                    </span>
                    {isDone && <Check size={15} strokeWidth={4} className="text-white z-10" />}
                    {isSkip && <Minus size={15} strokeWidth={4} className="text-red-400 z-10" />}
                    {isToday && !isDone && !isSkip && (
                      <div className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: habitColor }} />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

const DetailStats = React.memo(({ totalDone, streak, bestStreak, completionRate }: { totalDone: number; streak: number; bestStreak: number; completionRate: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <div className="p-4 rounded-2xl bg-[#1e1e2e] border border-[#2a2a45] flex flex-col justify-between">
      <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 flex items-center gap-1.5">
        <Check size={12} className="text-emerald-400" /> Total Logs
      </div>
      <div className="text-[26px] font-black text-emerald-400">{totalDone}</div>
    </div>
    <div className="p-4 rounded-2xl bg-[#1e1e2e] border border-[#2a2a45] flex flex-col justify-between">
      <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 flex items-center gap-1.5">
        <Activity size={12} className="text-blue-400" /> Rate
      </div>
      <div className="text-[26px] font-black text-blue-400">{completionRate}%</div>
    </div>
    <div className="p-4 rounded-2xl bg-[#1e1e2e] border border-[#2a2a45] flex flex-col justify-between">
      <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 flex items-center gap-1.5">
        <Flame size={12} className="text-orange-500" /> Cur Streak
      </div>
      <div className="text-[26px] font-black text-white">{streak}</div>
    </div>
    <div className="p-4 rounded-2xl bg-[#1e1e2e] border border-[#2a2a45] flex flex-col justify-between">
      <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1 flex items-center gap-1.5">
        <Star size={12} className="text-yellow-500" /> Max Streak
      </div>
      <div className="text-[26px] font-black text-white">{bestStreak}</div>
    </div>
  </div>
));

const VoyageMap = React.memo(({ heatmapWeeks, habitColor }: { heatmapWeeks: any[][]; habitColor: string }) => (
  <div className="p-5 sm:p-6 rounded-2xl bg-[#1e1e2e] border border-[#2a2a45]">
      <div className="flex items-center justify-between mb-4">
          <h4 className="text-[17px] font-bold uppercase tracking-tight">90-Day Voyage Map</h4>
          <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm bg-white/5 border border-white/10" />
                  <span className="text-[9px] font-bold text-white/30 uppercase">Empty</span>
              </div>
              <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: habitColor }} />
                  <span className="text-[9px] font-bold text-white/30 uppercase">Done</span>
              </div>
          </div>
      </div>
      
      <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
          <div className="flex flex-col gap-1 pr-2 pt-5">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <span key={i} className="text-[8px] font-black text-white/20 h-2.5 flex items-center">{day}</span>
              ))}
          </div>
          {heatmapWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1 shrink-0">
                  {wIdx % 4 === 0 && (
                      <span className="text-[8px] font-black text-white/30 h-4 flex items-end -mt-4 mb-0.5">
                          {new Date(week[0].dateStr).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                  )}
                  {wIdx % 4 !== 0 && <div className="h-4 -mt-4 mb-0.5" />}
                  {week.map((day) => {
                      const isDone = day.status === 'done';
                      const isSkip = day.status === 'skip';
                      return (
                          <div 
                              key={day.dateStr}
                              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm ${
                                  day.isFuture ? 'opacity-0' : ''
                              }`}
                              style={{ 
                                  backgroundColor: isDone ? habitColor : isSkip ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.05)',
                                  border: isDone ? 'none' : '1px solid rgba(255,255,255,0.05)'
                              }}
                              title={`${day.dateStr}: ${day.status}`}
                          />
                      );
                  })}
              </div>
          ))}
      </div>
  </div>
));

const WeeklyCompletionChart = React.memo(({ weeklyData, habitColor }: { weeklyData: any[]; habitColor: string }) => (
  <div className="p-5 sm:p-6 rounded-2xl bg-[#1e1e2e] border border-[#2a2a45]">
    <div className="flex items-center justify-between mb-6">
        <h4 className="text-[17px] font-bold uppercase tracking-tight">6-Week Completion</h4>
        <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Rate %</span>
        </div>
    </div>
    <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-neutral-900 border border-white/10 p-3 rounded-xl shadow-2xl">
                            <p className="text-[10px] font-black uppercase text-white/40 mb-1">{payload[0].payload.name}</p>
                            <p className="text-lg font-black" style={{ color: habitColor }}>{payload[0].value}% Done</p>
                            <p className="text-[10px] font-bold text-white/60">{payload[0].payload.count} / 7 days</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                />
                <Bar dataKey="rate" radius={[6, 6, 6, 6]} barSize={32}>
                    {weeklyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 5 ? habitColor : `${habitColor}60`} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    </div>
  </div>
));

const CalendarCellGrid = React.memo(({ cells, habitColor, onToggle }: { 
  cells: any[]; 
  habitColor: string; 
  onToggle: (date: string, e: any) => void;
}) => (
  <div className="p-5 sm:p-6 rounded-2xl bg-[#1e1e2e] border border-[#2a2a45]">
    <h4 className="text-[17px] font-medium leading-tight mb-5">Past 6 Weeks</h4>
    <div className="grid grid-cols-7 gap-2 mb-3">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
        <div key={i} className="text-center text-[10px] font-bold text-white/30 uppercase">{day}</div>
      ))}
    </div>
    <div className="grid grid-cols-7 gap-2 sm:gap-3">
      {cells.map(cell => {
        if (cell.type === 'future') {
          return <div key={cell.id} className="aspect-square rounded-lg bg-transparent" />;
        }
        const isDone = cell.status === 'done';
        const isSkip = cell.status === 'skip';
        
        return (
          <button
            key={cell.id}
            onClick={(e) => onToggle(cell.dateStr!, e)}
            className="aspect-square rounded-lg sm:rounded-xl flex items-center justify-center border active:scale-90 transition-transform"
            style={{ 
              backgroundColor: isDone ? habitColor : isSkip ? 'rgba(255,255,255,0.05)' : 'transparent',
              borderColor: isDone ? habitColor : isSkip ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
            }}
          >
            {isDone && <Check size={16} strokeWidth={4} className="text-white" />}
            {isSkip && <Minus size={16} strokeWidth={4} className="text-white/40" />}
          </button>
        );
      })}
    </div>
  </div>
));

const ToggleSwitch = ({ checked, onChange, themeColor }: { checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, themeColor: string }) => (
  <label className="toggle-switch">
    <input 
      type="checkbox" 
      className="toggle-input" 
      checked={checked} 
      onChange={onChange} 
    />
    <span 
      className="toggle-track" 
      style={checked ? { background: themeColor } : {}}
    >
      <span className="toggle-thumb" />
    </span>
  </label>
);

export default function App() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    if (typeof window === 'undefined') return INITIAL_HABITS;
    const saved = localStorage.getItem('core_habits');
    if (!saved) return INITIAL_HABITS;
    try {
      const parsed = JSON.parse(saved);
      // Migrate to logs
      return parsed.map((h: any) => {
        if (!h.logs) {
          const logs: Record<string, HabitStatus> = {};
          (h.history || []).forEach((status: any, idx: number) => {
            const d = new Date();
            d.setDate(d.getDate() - idx);
            const ds = d.toISOString().split('T')[0];
            if (status === true || status === 'done') logs[ds] = 'done';
            else if (status === 'skip') logs[ds] = 'skip';
            else logs[ds] = 'empty';
          });
          return { ...h, logs };
        }
        return h;
      });
    } catch (e) {
      console.error('Failed to parse habits', e);
      return INITIAL_HABITS;
    }
  });

  const [folders, setFolders] = useState<Folder[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('core_folders');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [quickActions, setQuickActions] = useState<{ habit: Habit; x: number; y: number } | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [activePopover, setActivePopover] = useState<{ habitId: string; dayIdx: number } | null>(null);

  const selectedHabit = habits.find(h => h.id === selectedHabitId);

  const dailyQuote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);

  const [settings, setSettings] = useState<{
    pureBlack: boolean;
    theme: keyof typeof THEMES;
    remindersEnabled: boolean;
    reminderTone: string;
    startedAt: string;
    rollingWindowDays: number;
    hasSeenTutorial?: boolean;
    glassIntensity: number;
    glassBlur: number;
  }>(() => {
    const defaultSettings = {
      pureBlack: false,
      theme: 'VOID' as const,
      remindersEnabled: true,
      reminderTone: 'chime',
      startedAt: new Date().toISOString(),
      rollingWindowDays: 6,
      hasSeenTutorial: false,
      glassIntensity: 5,
      glassBlur: 10,
    };
    if (typeof window === 'undefined') return defaultSettings;
    const saved = localStorage.getItem('core_settings');
    if (!saved) return defaultSettings;
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.startedAt) {
        parsed.startedAt = new Date().toISOString();
      }
      if (parsed.rollingWindowDays === undefined) {
        parsed.rollingWindowDays = 6;
      }
      if (parsed.hasSeenTutorial === undefined) {
        parsed.hasSeenTutorial = false;
      }
      return { ...defaultSettings, ...parsed };
    } catch (e) {
      return defaultSettings;
    }
  });

  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const TUTORIAL_STEPS = [
    { title: "Welcome to Grand Line", text: "Create quests to track your daily progress and embark on a new journey.", icon: Anchor },
    { title: "Sailing Forward", text: "Long-press a quest to see quick actions, or tap it repeatedly to cycle through its status.", icon: Compass },
    { title: "Manage the Voyage", text: "Group your quests into paths, view your stats, and build streaks to stay on course.", icon: Map },
    { title: "Ready?", text: "Let's set sail and begin your grand adventure.", icon: Ship }
  ];

  const [showSettings, setShowSettings] = useState(false);
  const rollingWeekDays = useMemo(() => getRollingWindowDates(settings.rollingWindowDays), [settings.rollingWindowDays]);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef<number>(0);

  // Embark Form State
  const [newName, setNewName] = useState('');
  const [newIntent, setNewIntent] = useState('');
  const [newCategory, setNewCategory] = useState(HABIT_CATEGORIES[0]);
  const [newFolderId, setNewFolderId] = useState<string | null>(null);
  const [newColor, setNewColor] = useState(ACCENT_COLORS[0]);
  const [newIcon, setNewIcon] = useState<keyof typeof ICON_MAP>('JollyRoger');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('09:00');
  const [newReminderActive, setNewReminderActive] = useState(false);
  const [newReminderDays, setNewReminderDays] = useState<number[]>([]);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIntent, setEditIntent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState<keyof typeof ICON_MAP>('JollyRoger');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editReminderActive, setEditReminderActive] = useState(false);
  const [editReminderTime, setEditReminderTime] = useState('09:00');
  const [editReminderDays, setEditReminderDays] = useState<number[]>([]);

  const [activeInput, setActiveInput] = useState<string | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'Name' | 'Streak' | 'Progress'>('Name');
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'status' | 'folder' | 'category' | 'delete'>('status');
  const [bulkTargetStatus, setBulkTargetStatus] = useState<HabitStatus>('done');
  const [bulkTargetFolderId, setBulkTargetFolderId] = useState<string | null>(null);
  const [bulkTargetCategory, setBulkTargetCategory] = useState(HABIT_CATEGORIES[0]);

  const sortedHabits = useMemo(() => {
    let sorted = [...(habits || [])];
    if (sortBy === 'Streak') {
      sorted.sort((a, b) => calculateStreak(b) - calculateStreak(a));
    } else if (sortBy === 'Progress') {
      sorted.sort((a, b) => {
        const aDone = Object.values(a.logs || {}).filter(s => s === 'done').length;
        const bDone = Object.values(b.logs || {}).filter(s => s === 'done').length;
        return bDone - aDone;
      });
    }
    return sorted;
  }, [habits, sortBy]);

  const groupedHabits = useMemo(() => {
    const habitsByFolder: Record<string, Habit[]> = {};
    const unassignedHabits: Habit[] = [];
    const folderExists = new Set(folders.map(f => f.id));

    for (const h of sortedHabits) {
      if (h.folderId && folderExists.has(h.folderId)) {
        if (!habitsByFolder[h.folderId]) habitsByFolder[h.folderId] = [];
        habitsByFolder[h.folderId].push(h);
      } else {
        unassignedHabits.push(h);
      }
    }
    return { habitsByFolder, unassignedHabits };
  }, [sortedHabits, folders]);

  const selectedHabitStats = useMemo(() => {
    if (!selectedHabit) return null;
    const logs = selectedHabit.logs || {};
    
    // Calendar data calculation
    const today = new Date();
    const todayDay = today.getDay();
    const futureDaysCount = 6 - todayDay;
    const historyNeeded = 42 - futureDaysCount;
    
    const cells = [];
    for (let i = 0; i < 42; i++) {
        if (i >= historyNeeded) {
            cells.push({ type: 'future', id: `future-${i}` });
        } else {
            const daysAgo = historyNeeded - 1 - i;
            const d = new Date();
            d.setDate(d.getDate() - daysAgo);
            const ds = d.toISOString().split('T')[0];
            const status = logs[ds] || 'empty';
            cells.push({ type: 'history', dateStr: ds, status, id: `history-${ds}` });
        }
    }

    const totalDone = Object.values(logs).filter(s => s === 'done').length;
    const streak = calculateStreak(selectedHabit);
    const bestStreak = Math.max(selectedHabit.bestStreak || 0, streak);

    const logDates = Object.keys(logs).sort();
    const firstDateStr = logDates.length > 0 ? logDates[0] : getTodayStr();
    const todayParsed = new Date(getTodayStr()).getTime();
    const firstParsed = new Date(firstDateStr).getTime();
    const totalTrackedDays = Math.max(1, Math.floor((todayParsed - firstParsed) / (1000 * 60 * 60 * 24)) + 1);
    const overallCompletionRate = Math.round((totalDone / totalTrackedDays) * 100);

    // Heatmap
    const heatmapWeeks = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    for (let w = 0; w < 13; w++) {
        const weekDays = [];
        for (let d = 0; d < 7; d++) {
            const ds = currentDate.toISOString().split('T')[0];
            weekDays.push({ dateStr: ds, status: logs[ds] || 'empty', isFuture: currentDate > today });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        heatmapWeeks.push(weekDays);
    }

    // Weekly Chart
    const weeklyData = [];
    for (let i = 5; i >= 0; i--) {
        let doneCount = 0;
        for (let d = 0; d < 7; d++) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - (i * 7 + d));
            const ds = checkDate.toISOString().split('T')[0];
            if (logs[ds] === 'done') doneCount++;
        }
        weeklyData.push({
            name: i === 0 ? 'This Week' : `${i}w ago`,
            rate: Math.round((doneCount / 7) * 100),
            count: doneCount
        });
    }

    // Chart Data Preparation (Daily Volume)
    const chartData = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const status = logs[ds] || 'empty';
        chartData.push({
            name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            completed: status === 'done' ? 1 : 0,
            status: status
        });
    }

    return { cells, totalDone, streak, bestStreak, overallCompletionRate, heatmapWeeks, weeklyData, chartData };
  }, [selectedHabit]);

  const [lastAction, setLastAction] = useState<{
    habitId: string;
    dateStr: string;
    prevStatus: HabitStatus;
    prevBestStreak: number;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    if (lastAction) {
      const timer = setTimeout(() => {
        setLastAction(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  useEffect(() => {
    localStorage.setItem('core_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('core_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('core_settings', JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme);
    if (settings.pureBlack) {
      document.body.style.backgroundColor = '#000000';
    } else {
      document.body.style.backgroundColor = '#0f0f14';
    }
  }, [settings]);

  useEffect(() => {
    if (selectedHabit) {
      // Only reset edit states if not currently editing or if selected habit changed
      setEditName(selectedHabit.name);
      setEditIntent(selectedHabit.intent || '');
      setEditCategory(selectedHabit.category || HABIT_CATEGORIES[0]);
      setEditFolderId(selectedHabit.folderId || null);
      setEditColor(selectedHabit.color);
      setEditIcon(selectedHabit.icon);
      setEditTags(selectedHabit.tags || []);
      setEditTagInput('');
      setEditReminderActive(selectedHabit.reminder?.active ?? false);
      setEditReminderTime(selectedHabit.reminder?.time ?? '09:00');
      setEditReminderDays(selectedHabit.reminder?.days ?? []);
    } else {
      setIsEditingDetails(false);
    }
  }, [selectedHabitId]);

  const exportData = () => {
    const data = { habits, folders, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `core_quests_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetData = () => {
    if (confirm('Are you sure you want to delete ALL your quests and settings? This cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.habits) {
          setHabits(data.habits);
          localStorage.setItem('core_habits', JSON.stringify(data.habits));
        }
        if (data.folders) {
          setFolders(data.folders);
          localStorage.setItem('core_folders', JSON.stringify(data.folders));
        }
        if (data.settings) {
          setSettings(data.settings);
          localStorage.setItem('core_settings', JSON.stringify(data.settings));
        }
        alert('Data imported successfully!');
        window.location.reload();
      } catch (err) {
        alert('Failed to import data: Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Reminder Monitor
  useEffect(() => {
    const checkReminders = () => {
      if (!settingsRef.current.remindersEnabled) return;
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const today = now.toISOString().split('T')[0];

      setHabits(prevHabits => {
        let changed = false;
        const newHabits = prevHabits.map(habit => {
          const dayOfWeek = now.getDay();
          const isEnabledToday = !habit.reminder?.days || habit.reminder.days.length === 0 || habit.reminder.days.includes(dayOfWeek);

          if (habit.reminder?.active && isEnabledToday && habit.reminder.time === currentTime && habit.reminder.lastNotified !== today) {
            // Trigger notification
            if (typeof window !== 'undefined' && window.Notification && Notification.permission === "granted") {
              new Notification(`Ritual Reminder: ${habit.name}`, {
                body: habit.intent || "Time to set sail on your daily quest!",
                icon: "/favicon.ico" // Might not work in AI Studio preview but good practice
              });
              
              const storedTone = settingsRef.current.reminderTone || 'chime';
              playSound(storedTone);

              changed = true;
              return {
                ...habit,
                reminder: { ...habit.reminder, lastNotified: today }
              };
            }
          }
          return habit;
        });
        return changed ? newHabits : prevHabits;
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch {
      return false;
    }
  };

  let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
  if (typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

const NOTIFICATION_TONES = [
  { id: 'kaching', label: 'Ka-Ching' },
  { id: 'bell', label: 'Crystal Bell' },
  { id: 'chime', label: 'Magic Chime' },
  { id: 'harp', label: 'Harp Arpeggio' },
  { id: 'bowl', label: 'Tibetan Bowl' },
  { id: 'marimba', label: 'Marimba Bounce' }
] as const;

const playSound = (type: string) => {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  
  const t = ctx.currentTime;

  if (type === 'kaching') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(987.77, t);
    osc.frequency.setValueAtTime(1318.51, t + 0.1);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    gain.gain.setValueAtTime(0, t + 0.1);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  } else if (type === 'bell') {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    const rootFreq = 659.25; // E5
    osc1.frequency.value = rootFreq;
    osc2.frequency.value = rootFreq * 2.76;
    
    gain1.gain.setValueAtTime(0.3, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
    
    gain2.gain.setValueAtTime(0.1, t);
    gain2.gain.exponentialRampToValueAtTime(0.01, t + 1.0);
    
    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(ctx.destination);
    gain2.connect(ctx.destination);
    
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.5);
    osc2.stop(t + 1.5);
  } else if (type === 'chime') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.50, t); // C6
    osc.frequency.setValueAtTime(1318.51, t + 0.1); // E6
    osc.frequency.setValueAtTime(1567.98, t + 0.2); // G6
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.0);
  } else if (type === 'harp') {
    const root = 523.25; // C5
    [0, 4, 7, 12].forEach((interval, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = root * Math.pow(2, interval / 12);
      
      const startTime = t + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 1.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 1.5);
    });
  } else if (type === 'bowl') {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.value = 261.63; // C4
    osc2.frequency.value = 264.63; // Slight beating for that vibrating bowl sound
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.3, t + 0.5);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 4.0);
    gain2.gain.setValueAtTime(0, t);
    gain2.gain.linearRampToValueAtTime(0.2, t + 0.5);
    gain2.gain.exponentialRampToValueAtTime(0.01, t + 4.0);
    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(ctx.destination);
    gain2.connect(ctx.destination);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 4.0);
    osc2.stop(t + 4.0);
  } else if (type === 'marimba') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 783.99; // G5
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }
};

const triggerConfetti = (x: number, y: number, color: string) => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { x, y },
      colors: [color, '#ffffff', '#000000'],
      disableForReducedMotion: true,
      zIndex: 100
    });
  };

  // Handle Undoing last action
  const undoAction = useCallback(() => {
    if (!lastAction) return;
    setHabits(prev => prev.map(h => {
      if (h.id === lastAction.habitId) {
        return {
          ...h,
          bestStreak: lastAction.prevBestStreak,
          logs: {
            ...(h.logs || {}),
            [lastAction.dateStr]: lastAction.prevStatus
          }
        };
      }
      return h;
    }));
    setLastAction(null);
  }, [lastAction]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (window.navigator.vibrate) window.navigator.vibrate(10);
  }, []);

  const toggleHabit = useCallback((habitId: string, dateStr: string, event?: React.MouseEvent | React.TouchEvent | any) => {
    let x = 0.5;
    let y = 0.5;
    
    if (event && 'clientX' in event) {
      x = (event as React.MouseEvent).clientX / window.innerWidth;
      y = (event as React.MouseEvent).clientY / window.innerHeight;
    } else if (event && 'changedTouches' in event) {
      x = (event as React.TouchEvent).changedTouches[0].clientX / window.innerWidth;
      y = (event as React.TouchEvent).changedTouches[0].clientY / window.innerHeight;
    }

    setHabits(prev => prev.map(habit => {
      if (habit.id === habitId) {
        const logs = { ...(habit.logs || {}) };
        const current = logs[dateStr] || 'empty';
        let next: HabitStatus = 'empty';
        
        if (current === 'empty') next = 'done';
        else if (current === 'done') next = 'skip';
        else if (current === 'skip') next = 'empty';

        setLastAction({
          habitId,
          dateStr,
          prevStatus: current,
          prevBestStreak: habit.bestStreak || 0,
          timestamp: Date.now()
        });

        if (next === 'done') {
          triggerConfetti(x, y, habit.color);
          playSound('kaching');
        }

        logs[dateStr] = next;
        const updatedHabit = { ...habit, logs };
        const currentStreak = calculateStreak(updatedHabit);
        const bestStreak = Math.max(habit.bestStreak || 0, currentStreak);
        
        return { ...updatedHabit, bestStreak };
      }
      return habit;
    }));
  }, []);


  const addHabit = async () => {
    if (!newName.trim()) return;

    if (newReminderActive) {
      await requestNotificationPermission();
    }

    const newHabit: Habit = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      intent: newIntent,
      category: newCategory,
      folderId: newFolderId,
      icon: newIcon,
      color: newColor,
      tags: newTags,
      history: [],
      logs: {},
      reminder: {
        time: newReminderTime,
        active: newReminderActive,
        days: newReminderDays
      }
    };
    setHabits([...habits, newHabit]);
    setShowAddModal(false);
    
    // Reset form
    setNewName('');
    setNewIntent('');
    setNewTags([]);
    setNewTagInput('');
    setNewCategory(HABIT_CATEGORIES[0]);
    setNewFolderId(null);
    setNewColor(ACCENT_COLORS[0]);
    setNewIcon('JollyRoger');
    setNewReminderTime('09:00');
    setNewReminderActive(false);
    setNewReminderDays([]);
  };

  const saveHabitEdit = () => {
    if (!selectedHabit || !editName.trim()) return;
    playSound('bell');
    setHabits(prev => prev.map(h => h.id === selectedHabit.id ? {
      ...h,
      name: editName,
      intent: editIntent,
      category: editCategory,
      folderId: editFolderId,
      color: editColor,
      icon: editIcon,
      tags: editTags,
      reminder: {
        ...h.reminder,
        active: editReminderActive,
        time: editReminderTime,
        days: editReminderDays
      }
    } : h));
    setIsEditingDetails(false);
  };

  // Get weekday letters for the 6-day window
  const dayLabels = useMemo(() => {
    const labels = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      labels.push(d.toLocaleDateString('en-US', { weekday: 'narrow' }));
    }
    return labels;
  }, []);

  const handlePointerDown = (e: React.PointerEvent, habit: Habit) => {
    const x = e.clientX;
    const y = e.clientY;
    longPressTimer.current = setTimeout(() => {
      setQuickActions({ habit, x, y });
      if (window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 600);
  };

  const handlePointerUpOrCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const executeBulkAction = () => {
    if (selectedIds.size === 0) return;

    if (bulkActionType === 'delete') {
      setHabits(prev => prev.filter(h => !selectedIds.has(h.id)));
      playSound('bell');
    } else if (bulkActionType === 'folder') {
      setHabits(prev => prev.map(h => selectedIds.has(h.id) ? { ...h, folderId: bulkTargetFolderId } : h));
      playSound('bell');
    } else if (bulkActionType === 'category') {
      setHabits(prev => prev.map(h => selectedIds.has(h.id) ? { ...h, category: bulkTargetCategory } : h));
      playSound('bell');
    } else if (bulkActionType === 'status') {
      const today = getTodayStr();
      setHabits(prev => prev.map(h => {
        if (selectedIds.has(h.id)) {
          const logs = { ...(h.logs || {}) };
          logs[today] = bulkTargetStatus;
          const updated = { ...h, logs };
          const currentStreak = calculateStreak(updated);
          const bestStreak = Math.max(updated.bestStreak || 0, currentStreak);
          return { ...updated, bestStreak };
        }
        return h;
      }));
      if (bulkTargetStatus === 'done') playSound('kaching');
      else playSound('bell');
    }

    setIsSelectionMode(false);
    setSelectedIds(new Set());
    setShowBulkActionModal(false);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const quickUpdateHabitStatus = (habitId: string, status: HabitStatus) => {
    const dateStr = getTodayStr();
    setHabits(prev => prev.map(habit => {
      if (habit.id === habitId) {
        const logs = { ...(habit.logs || {}) };
        const prevStatus = logs[dateStr] || 'empty';
        
        if (status === 'done') {
          triggerConfetti(0.5, 0.5, habit.color);
          playSound('kaching');
        }

        logs[dateStr] = status;
        const updatedHabit = { ...habit, logs };
        const currentStreak = calculateStreak(updatedHabit);
        const bestStreak = Math.max(habit.bestStreak || 0, currentStreak);

        setLastAction({
          habitId,
          dateStr,
          prevStatus,
          prevBestStreak: habit.bestStreak || 0,
          timestamp: Date.now()
        });

        return { ...updatedHabit, bestStreak };
      }
      return habit;
    }));
    setQuickActions(null);
  };

  return (
    <div 
      className="min-h-screen relative text-white font-sans transition-colors duration-500 overflow-hidden bg-theme-bg"
      style={{ 
        backgroundColor: settings.pureBlack ? 'var(--tw-color-black)' : 'var(--theme-bg)',
        '--glass-intensity': settings.glassIntensity / 10,
        '--glass-blur': `${settings.glassBlur}px`,
        '--theme-accent': (THEMES[settings.theme] || THEMES.VOID).primary,
        '--theme-accent2': (THEMES[settings.theme] || THEMES.VOID).secondary,
      } as React.CSSProperties}
    >
      {/* Quick Actions Menu Overlay */}
      <AnimatePresence>
        {quickActions && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/20"
              onClick={() => setQuickActions(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              className="fixed z-[120] p-1.5 rounded-2xl bg-neutral-900 border border-white/20 shadow-2xl min-w-[160px]"
              style={{ 
                left: Math.min(window.innerWidth - 180, Math.max(20, quickActions.x - 80)),
                top: Math.min(window.innerHeight - 200, Math.max(20, quickActions.y - 40)),
              }}
            >
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => quickUpdateHabitStatus(quickActions.habit.id, 'done')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-emerald-400 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-400/10 flex items-center justify-center group-hover:bg-emerald-400/20">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="text-[12px] font-bold uppercase tracking-wider">Mark as Done</span>
                </button>
                <button
                  onClick={() => quickUpdateHabitStatus(quickActions.habit.id, 'skip')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-orange-400 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-orange-400/10 flex items-center justify-center group-hover:bg-orange-400/20">
                    <Minus size={14} strokeWidth={3} />
                  </div>
                  <span className="text-[12px] font-bold uppercase tracking-wider">Mark as Skip</span>
                </button>
                <div className="h-px bg-white/5 my-0.5 mx-2" />
                <button
                  onClick={() => {
                    setSelectedHabitId(quickActions.habit.id);
                    setQuickActions(null);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-white/70 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10">
                    <PenTool size={14} />
                  </div>
                  <span className="text-[12px] font-bold uppercase tracking-wider">Edit Ritual</span>
                </button>
                <button
                  onClick={() => {
                    setHabitToDelete(quickActions.habit);
                    setQuickActions(null);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-red-500 group"
                >
                  <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20">
                    <Skull size={14} />
                  </div>
                  <span className="text-[12px] font-bold uppercase tracking-wider">Delete</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Ambient Background for Glassmorphism */}
      <WatermarkBackground pureBlack={settings.pureBlack} />

      <div className="relative z-10 h-full overflow-y-auto w-full hide-scrollbar">
        <header className="flex items-center justify-between px-[16px] pt-[16px] pb-[8px] max-w-lg mx-auto sticky top-0 bg-[#12121f] z-[40] border-b border-white/5">
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[20px] font-[900] tracking-[-0.5px] text-white"
              >
                GRAND LINE.
              </motion.h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedIds(new Set());
                    playSound('bell');
                  }}
                  className={`flex items-center justify-center w-[34px] h-[34px] rounded-full text-white border-none transition-all shadow-lg ${isSelectionMode ? 'bg-amber-500 scale-105' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <Layers size={16} strokeWidth={isSelectionMode ? 3 : 2} />
                </button>

                <button
                  onClick={() => {
                    playSound('bell');
                    setShowAddModal(true);
                  }}
                  className="flex items-center justify-center w-[34px] h-[34px] rounded-full text-white border-none transition-transform hover:scale-105 active:scale-95 shadow-lg"
                  style={{ backgroundColor: (THEMES[settings.theme] || THEMES.VOID).primary }}
                >
                  <Plus size={18} strokeWidth={3} />
                </button>
                <motion.button 
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    playSound('bell');
                    setShowSettings(true);
                  }}
                  className="w-[34px] h-[34px] rounded-[10px] bg-white/[0.08] flex items-center justify-center shrink-0 text-white/70 hover:bg-white/20 transition-colors"
                >
                  <Settings size={16} />
                </motion.button>
              </div>
        </header>

        <main className="px-5 pb-32 max-w-lg mx-auto mt-6">
          {/* Date + Progress Row */}
          <div className="mb-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              <span className="text-[10px] font-black text-white/80">
                {habits.filter(h => h.logs?.[getTodayStr()] === 'done').length}/{habits.length} quests complete
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden shadow-inner">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${(habits.filter(h => h.logs?.[getTodayStr()] === 'done').length / Math.max(1, habits.length)) * 100}%` }}
                 className="h-full transition-all duration-1000 ease-out"
                 style={{ 
                   background: `linear-gradient(90deg, ${(THEMES[settings.theme] || THEMES.VOID).primary}, ${(THEMES[settings.theme] || THEMES.VOID).secondary})` 
                 }}
               />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-1.5 mb-6">
            {[
              { label: 'Total', value: habits.length },
              { label: 'Today', value: habits.filter(h => h.logs?.[getTodayStr()] === 'done').length },
              { label: 'Streak', value: Math.max(0, ...habits.map(h => calculateStreak(h)), 0) }
            ].map((stat, i) => (
              <div key={i} className="p-2 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-[0.05em] mb-0.5">{stat.label}</p>
                <p className="text-base font-black text-white leading-none tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Habit List */}
          <div className="space-y-12 mb-12">
            {(() => {
              const { habitsByFolder, unassignedHabits } = groupedHabits;

              return (
                <div className="space-y-10">
                  {/* Folders */}
                  {folders.map(folder => {
                    const habitsInFolder = habitsByFolder[folder.id] || [];
                    if (habitsInFolder.length === 0) return null;

                    return (
                      <div key={folder.id} className="space-y-4">
                        <div className="flex items-center gap-3 px-1">
                           <Folder size={16} style={{ color: (THEMES[settings.theme] || THEMES.VOID).primary }} />
                           <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white/80">{folder.name}</h3>
                           <div className="h-px flex-1 bg-white/5" />
                           <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{habitsInFolder.length} Quests</span>
                        </div>
                        <div className="space-y-[10px]">
                           {habitsInFolder.map((h, i) => (
                             <MemoizedHabitCard 
                               key={h.id} 
                               habit={h} 
                               idx={i} 
                               onToggle={toggleHabit} 
                               onEdit={() => setSelectedHabitId(h.id)}
                               onLongPress={handlePointerDown}
                               onLongPressCancel={handlePointerUpOrCancel}
                               isQuickActionsOpen={!!quickActions}
                               theme={settings.theme}
                               weekDays={rollingWeekDays}
                               isSelectionMode={isSelectionMode}
                               isSelected={selectedIds.has(h.id)}
                               onToggleSelection={toggleSelection}
                             />
                           ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Unassigned Habits */}
                  {unassignedHabits.length > 0 && (
                    <div className="space-y-4">
                      {folders.length > 0 && (
                         <div className="flex items-center gap-3 px-1">
                            <Layers size={16} className="text-white/20" />
                            <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white/30">Free Sails</h3>
                            <div className="h-px flex-1 bg-white/5" />
                         </div>
                      )}
                      <div className="space-y-[10px]">
                        {unassignedHabits.map((h, i) => (
                          <MemoizedHabitCard 
                             key={h.id} 
                             habit={h} 
                             idx={i} 
                             onToggle={toggleHabit} 
                             onEdit={() => setSelectedHabitId(h.id)}
                             onLongPress={handlePointerDown}
                             onLongPressCancel={handlePointerUpOrCancel}
                             isQuickActionsOpen={!!quickActions}
                             theme={settings.theme}
                             weekDays={rollingWeekDays}
                             isSelectionMode={isSelectionMode}
                             isSelected={selectedIds.has(h.id)}
                             onToggleSelection={toggleSelection}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Empty State */}
                  {habits.length === 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="py-20 text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <Compass size={32} className="text-white/20" />
                      </div>
                      <h4 className="text-[14px] font-black uppercase tracking-widest text-white/40">No Quests Found</h4>
                      <p className="text-[11px] text-white/20 mt-2 italic font-serif">"The fog of the Grand Line obscures your path..."</p>
                    </motion.div>
                  )}
                </div>
              );
            })()}
          </div>

        {/* Ship's Log Entry - Quote */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-12 border-t border-theme-border pt-8 pb-8 text-center max-w-lg mx-auto"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-theme-subtext mb-4 flex items-center justify-center gap-2">
            <Book size={12} /> Ship's Log Entry
          </p>
          <p className="text-theme-text font-serif italic text-[15px] sm:text-[17px] opacity-80 leading-relaxed mb-4">"{dailyQuote.text}"</p>
          <p className="text-theme-subtext text-[10px] tracking-wider uppercase font-bold">— {dailyQuote.author}</p>
        </motion.div>
      </main>

      {/* Selection Action Bar */}
      <AnimatePresence>
        {isSelectionMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            className="fixed bottom-6 left-4 right-4 z-[90] max-w-lg mx-auto"
          >
            <div className="p-3 px-4 rounded-3xl border border-white/20 bg-neutral-900 shadow-2xl flex items-center justify-between gap-2">
              <div className="flex items-center pl-1 shrink max-w-[80px] sm:max-w-none w-min sm:w-auto">
                <div className="flex flex-col">
                  <span className="text-[12px] sm:text-[13px] font-black text-white leading-tight">{selectedIds.size} ritual{selectedIds.size > 1 ? 's' : ''}</span>
                  <span className="text-[8px] sm:text-[9px] font-black text-amber-500 uppercase tracking-widest leading-[1.1] mt-0.5">In Command</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    setBulkActionType('status');
                    setShowBulkActionModal(true);
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/70"
                >
                  <Check size={16} />
                </button>
                <div className="w-px h-6 bg-white/10 mx-0.5" />
                <button
                  onClick={() => {
                    setBulkActionType('folder');
                    setShowBulkActionModal(true);
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/70"
                >
                  <Folder size={16} />
                </button>
                <button
                  onClick={() => {
                    setBulkActionType('category');
                    setShowBulkActionModal(true);
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/70"
                >
                  <Layers size={16} />
                </button>
                <button
                  onClick={() => {
                    setBulkActionType('delete');
                    setShowBulkActionModal(true);
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-2xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors text-red-500"
                >
                  <Skull size={16} />
                </button>
                <div className="w-px h-6 bg-white/10 mx-0.5" />
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] sm:rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Action Modal */}
      <AnimatePresence>
        {showBulkActionModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 pointer-events-auto"
              onClick={() => setShowBulkActionModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative pointer-events-auto w-full max-w-sm max-h-[90vh] overflow-y-auto no-scrollbar bg-[#1e1e2e] border border-[#2a2a45] p-5 rounded-[32px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col"
            >
              <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${bulkActionType === 'delete' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>
                  {bulkActionType === 'delete' ? <Skull size={20} /> : bulkActionType === 'folder' ? <Folder size={20} /> : bulkActionType === 'status' ? <Check size={20} /> : <Layers size={20} />}
                </div>
                
                <h3 className="text-[18px] font-black text-white mb-1.5 leading-tight">
                  {bulkActionType === 'delete' ? 'Confirm Purge' : bulkActionType === 'folder' ? 'Assign Fleet' : bulkActionType === 'status' ? 'Update Status' : 'Recategorize'}
                </h3>
                
                <p className="text-[13px] font-medium text-white/60 mb-5 leading-snug">
                  {bulkActionType === 'delete' 
                    ? `Are you certain you wish to purge these ${selectedIds.size} rituals from your logbook? This cannot be undone.` 
                    : bulkActionType === 'status'
                    ? `Set today's status for the ${selectedIds.size} selected rituals.`
                    : `Choose the target destination for your ${selectedIds.size} selected rituals.`}
                </p>

                {bulkActionType === 'folder' && (
                  <div className="w-full mb-5">
                    <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto no-scrollbar">
                      <button
                        onClick={() => setBulkTargetFolderId(null)}
                        className={`p-2.5 rounded-2xl border text-center transition-all text-[11px] font-black uppercase tracking-widest ${bulkTargetFolderId === null ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'}`}
                      >
                        Unassigned
                      </button>
                      {folders.map(f => (
                        <button
                          key={f.id}
                          onClick={() => setBulkTargetFolderId(f.id)}
                          className={`p-2.5 rounded-2xl border text-center transition-all text-[11px] font-black uppercase tracking-widest ${bulkTargetFolderId === f.id ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'}`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {bulkActionType === 'category' && (
                  <div className="w-full mb-5">
                    <div className="grid grid-cols-2 gap-2">
                      {HABIT_CATEGORIES.map(c => (
                        <button
                          key={c}
                          onClick={() => setBulkTargetCategory(c)}
                          className={`py-2 px-3 rounded-[14px] border text-center transition-all text-[10px] font-black uppercase tracking-widest ${bulkTargetCategory === c ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {bulkActionType === 'status' && (
                  <div className="w-full mb-5">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setBulkTargetStatus('done')}
                        className={`py-2 px-2 rounded-[14px] border text-center transition-all flex flex-col items-center gap-1 text-[10px] font-black uppercase tracking-widest ${bulkTargetStatus === 'done' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'}`}
                      >
                        <Check size={16} />
                        Done
                      </button>
                      <button
                        onClick={() => setBulkTargetStatus('skip')}
                        className={`py-2 px-2 rounded-[14px] border text-center transition-all flex flex-col items-center gap-1 text-[10px] font-black uppercase tracking-widest ${bulkTargetStatus === 'skip' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'}`}
                      >
                        <Minus size={16} />
                        Skip
                      </button>
                      <button
                        onClick={() => setBulkTargetStatus('empty')}
                        className={`py-2 px-2 rounded-[14px] border text-center transition-all flex flex-col items-center gap-1 text-[10px] font-black uppercase tracking-widest ${bulkTargetStatus === 'empty' ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'}`}
                      >
                        <RotateCcw size={16} />
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 w-full mt-auto">
                  <button
                    onClick={() => setShowBulkActionModal(false)}
                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-white/70 transition-colors"
                  >
                    Hold On
                  </button>
                  <button
                    onClick={executeBulkAction}
                    className={`flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${bulkActionType === 'delete' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-amber-500 text-neutral-900 shadow-lg shadow-amber-500/30'}`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Undo Action Toast */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: '-50%' }}
            animate={{ opacity: 1, y: -90, x: '-50%' }}
            exit={{ opacity: 0, y: 100, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-50 pointer-events-auto"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-neutral-900 border border-white/20 shadow-2xl">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Action Recorded</span>
              <button 
                onClick={undoAction}
                className="px-3 py-1.5 rounded-lg bg-theme-accent text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-1.5"
                style={{ backgroundColor: (THEMES[settings.theme] || THEMES.VOID).primary }}
              >
                <RotateCcw size={12} />
                 Undo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Settings Full-Screen Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] w-full text-white overflow-y-auto overflow-x-hidden no-scrollbar modal"
            style={{ backgroundColor: '#0f0f14', WebkitOverflowScrolling: 'touch' }}
          >
            <WatermarkBackground pureBlack={settings.pureBlack} />
            {/* Header */}
            <div className="px-4 py-4 flex items-center gap-4 bg-[#12121f] sticky top-0 z-20 border-b border-white/5">
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 -ml-2 text-white hover:text-white/80 transition-colors"
              >
                <motion.svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </motion.svg>
              </button>
              <h2 className="text-xl font-bold tracking-wide text-white">Settings</h2>
            </div>

            <div className="px-4 py-6 pb-32 max-w-2xl mx-auto space-y-12">
              
              {/* Appearance Section */}
              <section>
                <div className="flex items-center gap-2 mb-6 ml-2">
                  <Palette size={18} style={{ color: (THEMES[settings.theme] || THEMES.VOID).primary }} />
                  <h3 className="text-[11px] font-black uppercase tracking-[2px] mt-0.5" style={{ color: (THEMES[settings.theme] || THEMES.VOID).primary }}>Appearance</h3>
                </div>
                
                <div className="p-6 rounded-[32px] border border-white/15 bg-white/[0.05] shadow-2xl space-y-8">
                  {/* Theme Palette */}
                  <div>
                    <div className="mb-5 ml-1">
                       <h4 className="text-[18px] text-white font-bold leading-tight" style={{ color: '#ffffff' }}>Theme Palette</h4>
                       <p className="text-white text-[14px] mt-1 leading-snug font-medium" style={{ color: '#ffffff' }}>Choose a global aesthetic theme.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                      {Object.entries(THEME_SWATCHES).map(([name, gradient]) => {
                        const isActive = settings.theme === name;
                        const accent = THEMES[name].primary;
                        return (
                          <button
                            key={name}
                            onClick={() => setSettings(s => ({ ...s, theme: name as keyof typeof THEMES }))}
                            className={`relative h-[90px] rounded-[14px] overflow-hidden text-left focus:outline-none transition-all duration-300 ${isActive ? 'scale-105 z-10' : 'scale-100'}`}
                            style={{
                              background: gradient,
                              border: isActive ? '2px solid #ffffff' : '2px solid rgba(255,255,255,0.15)',
                              boxShadow: isActive ? `0 0 20px rgba(255,255,255,0.2), 0 0 40px ${accent}4d` : 'none',
                              padding: '16px'
                            }}
                          >
                            {/* Mini Preview Strips */}
                            <div className="absolute top-[10px] left-[10px] flex flex-col gap-[3px]">
                              <div className="w-[60px] h-[6px] rounded-[3px] bg-white/20" />
                              <div className="w-[44px] h-[6px] rounded-[3px] bg-white/20" />
                              <div className="w-[52px] h-[6px] rounded-[3px] bg-white/20" />
                            </div>

                            <span 
                              className="absolute bottom-[10px] left-[10px] right-[24px] text-[10px] sm:text-[11px] font-[800] tracking-[1.5px] uppercase truncate"
                              style={{ 
                                color: '#ffffff',
                                WebkitTextFillColor: '#ffffff',
                                textShadow: '0 1px 4px rgba(0,0,0,0.8)'
                              }}
                            >
                              {name}
                            </span>
                            
                            <div 
                              className="absolute bottom-[12px] right-[10px] w-[8px] h-[8px] rounded-full shrink-0" 
                              style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }}
                            />
                            
                            {isActive && (
                              <div className="absolute top-[8px] right-[8px] w-[22px] h-[22px] bg-white text-black rounded-full flex items-center justify-center shadow-lg font-bold text-[12px]">
                                ✓
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-white/5" />

                  {/* Pure Black Toggle */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-[18px] text-white font-bold leading-tight" style={{ color: '#ffffff' }}>True Noir Mode</h4>
                      <p className="text-white text-[14px] mt-1 leading-snug font-medium" style={{ color: '#ffffff' }}>Use pure OLED black for backgrounds. Saves battery and increases contrast.</p>
                    </div>
                    <ToggleSwitch 
                      checked={settings.pureBlack} 
                      onChange={(e) => setSettings(s => ({ ...s, pureBlack: e.target.checked }))} 
                      themeColor={(THEMES[settings.theme] || THEMES.VOID).primary} 
                    />
                  </div>

                <div className="h-px bg-white/5" />

                {/* Rolling Window */}
                <div>
                  <h4 className="text-[18px] text-white font-bold leading-tight" style={{ color: '#ffffff' }}>Tracking Horizon</h4>
                    <p className="text-white text-[14px] mt-1 leading-snug font-medium" style={{ color: '#ffffff' }}>Number of days visible in your rolling window.</p>
                    <div className="flex items-center gap-4 mt-6">
                      <input
                        type="range"
                        min="3"
                        max="14"
                        step="1"
                        value={settings.rollingWindowDays}
                        onChange={(e) => setSettings(s => ({ ...s, rollingWindowDays: parseInt(e.target.value) }))}
                        className="glass-slider flex-1"
                        style={{ 
                          background: `linear-gradient(90deg, ${(THEMES[settings.theme] || THEMES.VOID).primary} ${((settings.rollingWindowDays - 3) / 11) * 100}%, rgba(255,255,255,0.1) ${((settings.rollingWindowDays - 3) / 11) * 100}%)`
                        }}
                      />
                      <span className="w-8 text-center text-white font-black text-sm">{settings.rollingWindowDays}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-white/30 mt-3 tracking-widest uppercase">
                      <span>Focused</span>
                      <span>Panorama</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Reminders Section */}
              <section>
                <div className="flex items-center gap-2 mb-6 ml-2">
                  <Bell size={18} style={{ color: (THEMES[settings.theme] || THEMES.VOID).primary }} />
                  <h3 className="text-[11px] font-black uppercase tracking-[2px] mt-0.5" style={{ color: (THEMES[settings.theme] || THEMES.VOID).primary }}>Reminders</h3>
                </div>
                
                <div className="p-6 rounded-[32px] border border-white/15 bg-white/[0.05] shadow-2xl space-y-6">
                  <div className="flex items-center justify-between gap-4 px-1">
                    <div className="pr-4">
                      <h4 className="text-[18px] text-white font-bold leading-tight" style={{ color: '#ffffff' }}>Global Notifications</h4>
                      <p className="text-white text-[14px] mt-1 leading-snug font-medium" style={{ color: '#ffffff' }}>Enable or disable all quest reminders globally.</p>
                    </div>
                    <ToggleSwitch 
                      checked={settings.remindersEnabled} 
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSettings(s => ({ ...s, remindersEnabled: checked }));
                        if (checked && 'Notification' in window) {
                          try {
                            Notification.requestPermission().catch(() => {});
                          } catch (err) {
                            console.log('Notifications not supported in this context');
                          }
                        }
                      }} 
                      themeColor={(THEMES[settings.theme] || THEMES.VOID).primary} 
                    />
                  </div>
                  
                  {settings.remindersEnabled && (
                    <div className="flex flex-col gap-3 px-1 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[16px] text-white font-bold leading-tight">Reminder Tone</h4>
                          <p className="text-white/60 text-[13px] mt-1 leading-snug">Choose the gentle sound that will play.</p>
                        </div>
                        <div className="relative">
                           <select
                            value={settings.reminderTone || 'chime'}
                            onChange={(e) => {
                              setSettings(s => ({ ...s, reminderTone: e.target.value }));
                              playSound(e.target.value);
                            }}
                            className="appearance-none bg-white/5 border border-white/10 text-white text-[13px] font-bold px-4 py-2 pr-8 rounded-xl outline-none focus:border-white/30 cursor-pointer"
                           >
                              {NOTIFICATION_TONES.map(tone => (
                                <option key={tone.id} value={tone.id} className="bg-neutral-900 text-white">
                                  {tone.label}
                                </option>
                              ))}
                           </select>
                           <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                             <ChevronDown size={14} />
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 shrink-0">
                      <Info size={16} />
                    </div>
                    <p className="text-[13px] text-white/50 leading-snug">Individual quest reminders can still be tuned in the quest's editor.</p>
                  </div>
                </div>
              </section>

              {/* Journey Info Section */}
              <section>
                <div className="flex items-center gap-2 mb-6 ml-2">
                  <Compass size={18} style={{ color: (THEMES[settings.theme] || THEMES.VOID).primary }} />
                  <h3 className="text-[11px] font-black uppercase tracking-[2px] mt-0.5" style={{ color: (THEMES[settings.theme] || THEMES.VOID).primary }}>Journey Insight</h3>
                </div>
                
                <div className="p-6 rounded-[32px] border border-white/15 bg-white/[0.05] shadow-2xl space-y-6">
                  <div className="flex flex-col gap-4 px-1">
                    <div>
                      <h4 className="text-[18px] text-white font-bold leading-tight" style={{ color: '#ffffff' }}>Ship's Inauguration</h4>
                      <p className="text-white text-[14px] mt-1 leading-snug font-medium" style={{ color: '#ffffff' }}>The exact moment you set sail on this voyage.</p>
                      
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                          <Calendar size={14} className="text-white/40" />
                          <span className="text-[13px] font-bold text-white/80">
                            {(() => {
                              const d = new Date(settings.startedAt);
                              if (isNaN(d.getTime())) return 'Invalid Date';
                              return d.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            })()}
                          </span>
                        </div>
                        
                        <div className="relative inline-block">
                          <input 
                            type="datetime-local"
                            value={(() => {
                              const d = new Date(settings.startedAt);
                              return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
                            })()}
                            onChange={(e) => {
                              if (e.target.value) {
                                const d = new Date(e.target.value);
                                if (!isNaN(d.getTime())) {
                                  setSettings(s => ({ ...s, startedAt: d.toISOString() }));
                                }
                              }
                            }}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 block"
                            id="voyage-date-picker"
                          />
                          <button 
                            type="button"
                            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/40 group-hover:bg-white/10 transition-colors relative z-0 w-full h-full"
                          >
                            Modify
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => setSettings(s => ({ ...s, startedAt: new Date().toISOString() }))}
                          className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

               {/* Data Management Section */}
              <section>
                <div className="flex items-center gap-2 mb-6 ml-2">
                  <Database size={18} style={{ color: (THEMES[settings.theme] || THEMES.VOID).primary }} />
                  <h3 className="text-[11px] font-black uppercase tracking-[2px] mt-0.5" style={{ color: (THEMES[settings.theme] || THEMES.VOID).primary }}>Data Management</h3>
                </div>
                
                <div className="p-6 rounded-[32px] border border-white/15 bg-white/[0.05] shadow-2xl space-y-4">
                  <button 
                    onClick={exportData}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 group"
                  >
                    <div className="flex items-center gap-3">
                      <Download size={18} className="text-emerald-400" />
                      <div className="text-left">
                        <span className="block text-[15px] font-bold text-white" style={{ color: '#ffffff' }}>Export Backup</span>
                        <span className="block text-[12px] text-white font-medium" style={{ color: '#ffffff' }}>Save your data to a JSON file.</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                  </button>
 
                  <label className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Upload size={18} className="text-blue-400" />
                      <div className="text-left">
                        <span className="block text-[15px] font-bold text-white" style={{ color: '#ffffff' }}>Import Backup</span>
                        <span className="block text-[12px] text-white font-medium" style={{ color: '#ffffff' }}>Restore from a previous backup file.</span>
                      </div>
                    </div>
                    <input type="file" accept=".json" onChange={importData} className="hidden" />
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                  </label>
 
                  <button 
                    onClick={() => {
                      setShowSettings(false);
                      setCurrentTutorialStep(0);
                      setSettings(s => ({ ...s, hasSeenTutorial: false }));
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Compass size={18} className="text-amber-400" />
                      <div className="text-left">
                        <span className="block text-[15px] font-bold text-white" style={{ color: '#ffffff' }}>Replay Tutorial</span>
                        <span className="block text-[12px] text-white font-medium" style={{ color: '#ffffff' }}>View the onboarding guide again.</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                  </button>

                  <button 
                    onClick={resetData}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 transition-all border border-red-500/20 group"
                  >
                    <div className="flex items-center gap-3">
                      <Skull size={18} className="text-red-500" />
                      <div className="text-left">
                        <span className="block text-[15px] font-bold text-red-500" style={{ color: '#ef4444' }}>Purge Memory</span>
                        <span className="block text-[12px] text-red-400 font-medium" style={{ color: '#f87171' }}>Delete all data permanently.</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-red-500/20 group-hover:text-red-500/60 transition-colors" />
                  </button>
                </div>
              </section>



            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMBARK Full-Screen Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] text-white overflow-y-auto no-scrollbar modal"
            style={{ backgroundColor: 'var(--bg-primary)', WebkitOverflowScrolling: 'touch' }}
          >
            <WatermarkBackground pureBlack={settings.pureBlack} />
            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between gap-4 bg-[#12121f] sticky top-0 z-20 border-b border-white/5">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 -ml-2 text-white hover:text-white transition-colors"
                >
                  <motion.svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </motion.svg>
                </button>
                <div className="flex items-center gap-2">
                  <Anchor size={20} className="text-white drop-shadow-md" />
                  <h2 className="text-lg font-bold tracking-tight text-white">New Quest</h2>
                </div>
              </div>
              <button
                onClick={addHabit}
                disabled={!newName.trim()}
                className="text-[13px] font-black uppercase tracking-[0.1em] px-4 py-1.5 rounded-full disabled:opacity-20 transition-all active:scale-95"
                style={{ 
                  backgroundColor: `${(THEMES[settings.theme] || THEMES.VOID).primary}CC`,
                  color: '#ffffff'
                }}
              >
                SET SAIL!
              </button>
            </div>

            {/* Form Content */}
            <div className="px-4 py-8 pb-40 max-w-lg mx-auto space-y-6">
              
              {/* Identity & Intent */}
              <section className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg">
                <h3 className="text-[10px] font-black uppercase tracking-[2px] mb-4 text-white/50 pl-1 flex items-center gap-2">
                  <Star size={12} /> Identity & Intent
                </h3>
                <div className="space-y-3">
                  <input 
                    type="text" 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onFocus={() => setActiveInput('name')}
                    onBlur={() => setActiveInput(null)}
                    placeholder="Quest Title (e.g., Morning Meditation)"
                    className="w-full bg-black/40 border-2 px-4 py-3 rounded-xl text-[15px] font-bold text-white placeholder:text-white/30 focus:outline-none transition-all"
                    style={{ 
                      borderColor: activeInput === 'name' ? newColor : 'rgba(255,255,255,0.05)',
                      boxShadow: activeInput === 'name' ? `0 0 12px ${newColor}20` : 'none'
                    }}
                  />
                  
                  <input 
                    type="text" 
                    value={newIntent}
                    onChange={(e) => setNewIntent(e.target.value)}
                    onFocus={() => setActiveInput('intent')}
                    onBlur={() => setActiveInput(null)}
                    placeholder="Why does this matter?"
                    className="w-full bg-black/40 border-2 px-4 py-3 rounded-xl text-[13px] font-medium text-white placeholder:text-white/30 placeholder:italic focus:outline-none transition-all"
                    style={{ 
                      borderColor: activeInput === 'intent' ? newColor : 'rgba(255,255,255,0.05)',
                      boxShadow: activeInput === 'intent' ? `0 0 12px ${newColor}20` : 'none'
                    }}
                  />

                  {/* Tags Input */}
                  <div className="pt-2">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newTags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                          #{tag}
                          <button onClick={() => setNewTags(prev => prev.filter(t => t !== tag))} className="text-white/40 hover:text-white">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <input 
                      type="text" 
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const val = newTagInput.trim().replace(/^#/, '');
                          if (val && !newTags.includes(val)) {
                            setNewTags(prev => [...prev, val]);
                          }
                          setNewTagInput('');
                        }
                      }}
                      onFocus={() => setActiveInput('tags')}
                      onBlur={() => {
                        setActiveInput(null);
                        const val = newTagInput.trim().replace(/^#/, '');
                        if (val && !newTags.includes(val)) {
                          setNewTags(prev => [...prev, val]);
                        }
                        setNewTagInput('');
                      }}
                      placeholder="Add tags (press Enter to add)"
                      className="w-full bg-black/40 border-2 px-4 py-3 rounded-xl text-[13px] font-medium text-white placeholder:text-white/30 focus:outline-none transition-all"
                      style={{ 
                        borderColor: activeInput === 'tags' ? newColor : 'rgba(255,255,255,0.05)',
                        boxShadow: activeInput === 'tags' ? `0 0 12px ${newColor}20` : 'none'
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Path & Folder */}
              <section className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg">
                <h3 className="text-[10px] font-black uppercase tracking-[2px] mb-4 text-white/50 pl-1 flex items-center gap-2">
                  <Folder size={12} /> Placement
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Path Category</h4>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                      {HABIT_CATEGORIES.map(cat => {
                        const isSelected = newCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setNewCategory(cat)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                              isSelected 
                                ? 'bg-white/20 text-white border-white/20 shadow-md' 
                                : 'bg-transparent text-white/40 border-white/10 hover:bg-white/10 hover:text-white/80'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {folders.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Assign Folder</h4>
                      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                        <button
                          onClick={() => setNewFolderId(null)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                            newFolderId === null 
                              ? 'bg-white/20 text-white border-white/20 shadow-md' 
                              : 'bg-transparent text-white/40 border-white/10 hover:bg-white/10 hover:text-white/80'
                          }`}
                        >
                          None
                        </button>
                        {folders.map(folder => {
                          const isSelected = newFolderId === folder.id;
                          return (
                            <button
                              key={folder.id}
                              onClick={() => setNewFolderId(folder.id)}
                              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border flex items-center gap-1.5 ${
                                isSelected 
                                  ? 'bg-white/20 text-white border-white/20 shadow-md' 
                                  : 'bg-transparent text-white/40 border-white/10 hover:bg-white/10 hover:text-white/80'
                              }`}
                            >
                              <Folder size={10} />
                              {folder.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Appearance */}
              <section className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg">
                <h3 className="text-[10px] font-black uppercase tracking-[2px] mb-4 text-white/50 pl-1 flex items-center gap-2">
                  <Wind size={12} /> Appearance
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Color Shade</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-2 snap-x no-scrollbar">
                      {ACCENT_COLORS.map(color => (
                        <div key={color} className="flex flex-col items-center shrink-0 snap-center p-1.5">
                          <button
                            onClick={() => setNewColor(color)}
                            className={`w-6 h-6 rounded-full shrink-0 transition-all duration-300 flex items-center justify-center relative ${
                              newColor === color 
                                ? 'shadow-lg shadow-black/40' 
                                : 'opacity-40 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                          >
                            {newColor === color && (
                              <div className="absolute -inset-[3px] rounded-full border-2 border-white ring-1 ring-black/20" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Ritual Icon</h4>
                    <div className="grid grid-cols-6 gap-2">
                      {(Object.keys(ICON_MAP) as Array<keyof typeof ICON_MAP>).map(iconKey => {
                        const Icon = ICON_MAP[iconKey];
                        const isSelected = newIcon === iconKey;
                        return (
                          <button
                            key={iconKey}
                            onClick={() => setNewIcon(iconKey)}
                            className={`aspect-square rounded-xl flex items-center justify-center transition-all border ${
                              isSelected 
                                ? 'scale-105 shadow-md bg-white/10' 
                                : 'border-transparent opacity-40 hover:opacity-80 bg-black/20'
                            }`}
                            style={{
                              borderColor: isSelected ? newColor : 'transparent',
                              color: isSelected ? newColor : '#ffffff',
                              boxShadow: isSelected ? `0 0 10px ${newColor}30` : undefined,
                              opacity: isSelected ? 1 : 0.4
                            }}
                          >
                            <Icon size={16} strokeWidth={isSelected ? 3 : 2} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Logistics */}
              <section className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg mb-8">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[2px] text-white/50 pl-1 flex items-center gap-2 m-0">
                    <Timer size={12} /> Reminder
                  </h3>
                  <ToggleSwitch 
                    checked={newReminderActive} 
                    onChange={(e) => setNewReminderActive(e.target.checked)} 
                    themeColor={(THEMES[settings.theme] || THEMES.VOID).primary} 
                  />
                </div>

                {newReminderActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 space-y-4"
                  >
                    <div>
                       <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Time</h4>
                       <input 
                         type="time" 
                         value={newReminderTime}
                         onChange={(e) => setNewReminderTime(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 px-4 py-2.5 rounded-xl text-[14px] font-bold text-white focus:outline-none focus:border-white/30 transition-all cursor-pointer"
                       />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Days</h4>
                      <div className="flex justify-between gap-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                          const isSelected = newReminderDays.includes(i);
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (isSelected) setNewReminderDays(newReminderDays.filter(d => d !== i));
                                else setNewReminderDays([...newReminderDays, i]);
                              }}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all border ${
                                isSelected ? 'bg-blue-500 border-blue-400 text-white shadow-md' : 'bg-black/40 border-white/10 text-white/40'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      <p className="hint-text text-[9px] text-white/30 mt-2 ml-1 italic">{newReminderDays.length === 0 ? 'Reminding daily' : `Reminding ${newReminderDays.length} day(s) a week`}</p>
                    </div>
                  </motion.div>
                )}
              </section>

              <button
                onClick={addHabit}
                disabled={!newName.trim()}
                className="w-full py-4 rounded-xl text-[14px] font-black uppercase tracking-[0.15em] transition-all active:scale-[0.98] disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-2 shadow-xl"
                style={{ 
                  backgroundColor: (THEMES[settings.theme] || THEMES.VOID).primary,
                  color: '#ffffff'
                }}
              >
                CREATE QUEST
              </button>

              <div className="h-12" /> {/* Bottom Padding */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial Overlay */}
      <AnimatePresence>
        {!settings.hasSeenTutorial && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-[32px] p-8 border border-white/10 bg-neutral-900 shadow-2xl relative overflow-hidden"
            >
              <div 
                className="absolute inset-0 opacity-20"
                style={{ 
                  background: `radial-gradient(circle at 50% 0%, ${(THEMES[settings.theme] || THEMES.VOID).primary}, transparent 70%)` 
                }} 
              />
              <div className="relative z-10">
                <div className="flex justify-center mb-6">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center border border-white/20 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${(THEMES[settings.theme] || THEMES.VOID).primary}40, transparent)` }}
                  >
                    {React.createElement(TUTORIAL_STEPS[currentTutorialStep].icon, { 
                      size: 32, 
                      style: { color: (THEMES[settings.theme] || THEMES.VOID).primary } 
                    })}
                  </div>
                </div>
                
                <div className="text-center mb-8">
                  <h2 className="text-[24px] font-black tracking-tight text-white mb-3">
                    {TUTORIAL_STEPS[currentTutorialStep].title}
                  </h2>
                  <p className="text-white/60 text-[14px] leading-relaxed font-medium">
                    {TUTORIAL_STEPS[currentTutorialStep].text}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 mt-8">
                  {/* Dots indicator */}
                  <div className="flex items-center gap-2">
                    {TUTORIAL_STEPS.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          idx === currentTutorialStep 
                            ? 'w-6 bg-amber-500' 
                            : 'w-2 bg-white/20'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      playSound('bell');
                      if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
                        setCurrentTutorialStep(prev => prev + 1);
                      } else {
                        setSettings(s => ({ ...s, hasSeenTutorial: true }));
                      }
                    }}
                    className="px-6 py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[12px] hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  >
                    {currentTutorialStep < TUTORIAL_STEPS.length - 1 ? 'Next' : 'Embark'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {habitToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-6"
            onClick={() => setHabitToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="p-6 rounded-2xl w-full max-w-sm bg-[#16162a] border border-[#2a2a45]"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-2">Delete Ritual?</h3>
              <p className="text-white/50 mb-6 font-light">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setHabitToDelete(null)}
                  className="flex-1 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-bold text-white/80"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setHabits(habits.filter(h => h.id !== habitToDelete.id));
                    setHabitToDelete(null);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors text-sm font-bold"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habit Details Modal */}
      <AnimatePresence>
        {selectedHabit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] text-white overflow-y-auto no-scrollbar modal"
            style={{ backgroundColor: 'var(--bg-primary)', WebkitOverflowScrolling: 'touch' }}
          >
            <WatermarkBackground pureBlack={settings.pureBlack} />

            {/* Header */}
            <div className="px-4 py-4 flex items-center justify-between gap-4 bg-[#12121f] sticky top-0 z-20 border-b border-white/5">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setSelectedHabitId(null);
                    setIsEditingDetails(false);
                  }}
                  className="p-2 -ml-2 text-white hover:text-white/80 transition-colors"
                >
                  <motion.svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </motion.svg>
                </button>
                <h2 className="text-xl font-bold tracking-wide text-white">
                  {isEditingDetails ? 'Adjust Ritual' : 'Ritual Details'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (isEditingDetails) {
                      saveHabitEdit();
                    } else {
                      setIsEditingDetails(true);
                    }
                  }}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 ${
                    isEditingDetails ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isEditingDetails ? 'Save Changes' : 'Edit Ritual'}
                </button>
                {isEditingDetails && (
                  <button
                    onClick={() => setIsEditingDetails(false)}
                    className="p-1.5 rounded-full bg-white/5 text-white/40 hover:text-white/80"
                  >
                    <motion.svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </motion.svg>
                  </button>
                )}
              </div>
            </div>

            <div className="px-4 py-8 pb-32 max-w-2xl mx-auto space-y-8">
              {(() => {
                if (!selectedHabit || !selectedHabitStats) return null;
                const habitColor = selectedHabit.color;
                const IconComponent = ICON_MAP[selectedHabit.icon] || Wind;
                const { cells, totalDone, streak, bestStreak, heatmapWeeks, weeklyData, chartData, overallCompletionRate } = selectedHabitStats;

                return (
                  <>
                    <div className="p-4 rounded-2xl space-y-4 shadow-lg bg-[#1e1e2e] border border-[#2a2a45]" style={{backgroundColor: 'rgba(255,255,255,0.05)'}}>
                      {isEditingDetails ? (
                        <div className="space-y-6">
                          <div className="space-y-3">
                             <div>
                               <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Ritual Title</h4>
                               <input 
                                 type="text" 
                                 value={editName}
                                 onChange={(e) => setEditName(e.target.value)}
                                 className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-[15px] font-bold text-white focus:outline-none focus:border-white/30 transition-all"
                               />
                             </div>
                             <div>
                               <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Ritual Intent</h4>
                               <input 
                                 type="text" 
                                 value={editIntent}
                                 onChange={(e) => setEditIntent(e.target.value)}
                                 placeholder="Why does this matter?"
                                 className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-[14px] font-medium text-white focus:outline-none focus:border-white/30 transition-all italic"
                               />
                             </div>
                             
                             {/* Tags Input (Edit) */}
                             <div>
                               <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Tags</h4>
                               <div className="flex flex-wrap gap-2 mb-2">
                                 {editTags.map(tag => (
                                   <span key={tag} className="px-2 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                                     #{tag}
                                     <button onClick={() => setEditTags(prev => prev.filter(t => t !== tag))} className="text-white/40 hover:text-white">
                                       <X size={10} />
                                     </button>
                                   </span>
                                 ))}
                               </div>
                               <input 
                                 type="text" 
                                 value={editTagInput}
                                 onChange={(e) => setEditTagInput(e.target.value)}
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter' || e.key === ',') {
                                     e.preventDefault();
                                     const val = editTagInput.trim().replace(/^#/, '');
                                     if (val && !editTags.includes(val)) {
                                       setEditTags(prev => [...prev, val]);
                                     }
                                     setEditTagInput('');
                                   }
                                 }}
                                 onBlur={() => {
                                   const val = editTagInput.trim().replace(/^#/, '');
                                   if (val && !editTags.includes(val)) {
                                     setEditTags(prev => [...prev, val]);
                                   }
                                   setEditTagInput('');
                                 }}
                                 placeholder="Add tags (press Enter to add)"
                                 className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-[13px] font-medium text-white focus:outline-none focus:border-white/30 transition-all"
                               />
                             </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Path Category</h4>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                              {HABIT_CATEGORIES.map(cat => {
                                const isSelected = editCategory === cat;
                                return (
                                  <button
                                    key={cat}
                                    onClick={() => setEditCategory(cat)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                                      isSelected 
                                        ? 'bg-white/20 text-white border-white/20 shadow-md' 
                                        : 'bg-transparent text-white/40 border-white/10 hover:bg-white/10 hover:text-white/80'
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {folders.length > 0 && (
                            <div>
                              <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Assigned Folder</h4>
                              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                                <button
                                  onClick={() => setEditFolderId(null)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                                    editFolderId === null 
                                      ? 'bg-white/20 text-white border-white/20 shadow-md' 
                                      : 'bg-transparent text-white/40 border-white/10 hover:bg-white/10 hover:text-white/80'
                                  }`}
                                >
                                  None
                                </button>
                                {folders.map(folder => {
                                  const isSelected = editFolderId === folder.id;
                                  return (
                                    <button
                                      key={folder.id}
                                      onClick={() => setEditFolderId(folder.id)}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border flex items-center gap-1.5 ${
                                        isSelected 
                                          ? 'bg-white/20 text-white border-white/20 shadow-md' 
                                          : 'bg-transparent text-white/40 border-white/10 hover:bg-white/10 hover:text-white/80'
                                      }`}
                                    >
                                      <Folder size={10} />
                                      {folder.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Visual Essence</h4>
                            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-2 snap-x no-scrollbar text-white">
                              {ACCENT_COLORS.map(color => (
                                <div key={color} className="shrink-0 snap-center p-1.5">
                                  <button
                                    key={color}
                                    onClick={() => setEditColor(color)}
                                    className={`w-6 h-6 rounded-full shrink-0 transition-all duration-300 flex items-center justify-center relative ${
                                      editColor === color 
                                        ? 'shadow-lg shadow-black/40' 
                                        : 'opacity-40 hover:opacity-100'
                                    }`}
                                    style={{ backgroundColor: color }}
                                    aria-label={`Select color ${color}`}
                                  >
                                    {editColor === color && (
                                      <div className="absolute -inset-[3px] rounded-full border-2 border-white ring-1 ring-black/20" />
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[10px] font-bold text-white/60 ml-1 mb-2 uppercase tracking-[1px]">Ritual Icon</h4>
                            <div className="grid grid-cols-6 gap-2">
                              {(Object.keys(ICON_MAP) as Array<keyof typeof ICON_MAP>).map(iconKey => {
                                const Icon = ICON_MAP[iconKey];
                                const isSelected = editIcon === iconKey;
                                return (
                                  <button
                                    key={iconKey}
                                    onClick={() => setEditIcon(iconKey)}
                                    className={`aspect-square rounded-xl flex items-center justify-center transition-all border ${
                                      isSelected ? 'border-white/40 bg-white/10 shadow-md' : 'border-transparent bg-black/20 opacity-40 hover:opacity-100'
                                    }`}
                                    style={{ color: isSelected ? editColor : '#ffffff' }}
                                  >
                                    <Icon size={16} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-white/5 space-y-2">
                             <button
                               onClick={saveHabitEdit}
                               className="w-full py-3 rounded-xl text-[14px] font-black uppercase tracking-[0.15em] transition-all active:scale-[0.98] shadow-xl"
                               style={{ backgroundColor: editColor, color: '#ffffff' }}
                             >
                               SAVE CHANGES
                             </button>
                             <button
                               onClick={() => setHabitToDelete(selectedHabit)}
                               className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all border border-red-500/20"
                             >
                               Abandon Ritual
                             </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-5">
                          <div className="p-4 rounded-2xl flex items-center justify-center border border-white/5" style={{ backgroundColor: `${habitColor}15`, color: habitColor }}>
                            <IconComponent size={36} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               {selectedHabit.category && (
                                   <span className="text-[9px] font-black uppercase tracking-wider text-theme-secondary opacity-50 px-2 py-0.5 rounded bg-white/5 font-sans">{selectedHabit.category}</span>
                               )}
                               {selectedHabit.folderId && folders.find(f => f.id === selectedHabit.folderId) && (
                                   <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 opacity-80 px-2 py-0.5 rounded bg-emerald-400/10 font-sans flex items-center gap-1">
                                     <Folder size={8} />
                                     {folders.find(f => f.id === selectedHabit.folderId)?.name}
                                   </span>
                               )}
                            </div>
                            <h3 className="text-2xl font-bold">{selectedHabit.name}</h3>
                            {selectedHabit.intent && <p className="text-white/60 text-sm mt-1 flex items-center gap-2 font-light italic"><Star size={14} className="text-yellow-500" /> {selectedHabit.intent}</p>}
                          </div>
                        </div>
                      )}
                    </div>

                    <DetailStats totalDone={totalDone} streak={streak} bestStreak={bestStreak} completionRate={overallCompletionRate} />

                    <VoyageMap heatmapWeeks={heatmapWeeks} habitColor={habitColor} />

                    {/* Reminder Settings */}
                    <div className="p-5 bg-[#1e1e2e] border border-[#2a2a45] rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Timer size={20} className={selectedHabit.reminder?.active ? 'text-blue-400' : 'text-white/30'} />
                          <h4 className="text-lg font-bold">Logistics</h4>
                        </div>
                        <ToggleSwitch 
                          checked={!!selectedHabit.reminder?.active} 
                          onChange={async (e) => {
                            const newActive = e.target.checked;
                            if (newActive) await requestNotificationPermission();
                            setHabits(prev => prev.map(h => h.id === selectedHabit.id ? {
                              ...h,
                              reminder: { ...(h.reminder || { time: '09:00' }), active: newActive }
                            } : h));
                          }} 
                          themeColor={(THEMES[settings.theme] || THEMES.VOID).primary} 
                        />
                      </div>
                      
                      {selectedHabit.reminder?.active && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-2">Reminder Time</p>
                            <input 
                              type="time" 
                              value={selectedHabit.reminder?.time || '09:00'}
                              onChange={(e) => {
                                const newTime = e.target.value;
                                setHabits(prev => prev.map(h => h.id === selectedHabit.id ? {
                                  ...h,
                                  reminder: { ...(h.reminder!), time: newTime }
                                } : h));
                              }}
                              className="w-full bg-white/[0.08] border border-white/10 px-4 py-2.5 rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                            />
                          </div>
                          
                          <div>
                            <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-2">Weekly Schedule</p>
                            <div className="flex justify-between gap-1">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                                const days = selectedHabit.reminder?.days || [];
                                const isSelected = days.includes(i);
                                return (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      const newDays = isSelected ? days.filter(d => d !== i) : [...days, i];
                                      setHabits(prev => prev.map(h => h.id === selectedHabit.id ? {
                                        ...h,
                                        reminder: { ...(h.reminder!), days: newDays }
                                      } : h));
                                    }}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all border ${
                                      isSelected ? 'bg-blue-500 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/30'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-white/20 mt-2 italic">{(!selectedHabit.reminder?.days || selectedHabit.reminder.days.length === 0) ? 'Every day of the week' : 'Selected days only'}</p>
                          </div>
                        </div>
                      )}
                      {!selectedHabit.reminder?.active && (
                        <p className="text-white/30 text-sm italic">Daily reminders are currently silent.</p>
                      )}
                    </div>

                    <div className="p-5 sm:p-6 rounded-2xl bg-[#1e1e2e] border border-[#2a2a45]">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[17px] font-bold text-white tracking-tight uppercase">Progress Visualization</h4>
                        <div className="px-2 py-1 bg-white/10 rounded-lg border border-white/20">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Completion Density</span>
                        </div>
                      </div>
                      
                      <div className="h-48 w-full mb-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={weeklyData}>
                            <defs>
                              <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={habitColor} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={habitColor} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              stroke="rgba(255,255,255,0.3)" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false}
                            />
                            <YAxis 
                              stroke="rgba(255,255,255,0.3)" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false}
                              tickFormatter={(val) => `${val}%`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(0,0,0,0.8)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '12px',
                                fontSize: '12px'
                              }}
                              itemStyle={{ color: habitColor }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="rate" 
                              stroke={habitColor} 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorRate)" 
                              animationDuration={1500}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="h-32 w-full">
                        <h5 className="text-[10px] font-bold text-white/30 uppercase tracking-[2px] mb-4">Daily Volume (Last 14 Days)</h5>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.status === 'done' ? habitColor : 'rgba(255,255,255,0.05)'} 
                                />
                              ))}
                            </Bar>
                            <XAxis 
                                dataKey="name" 
                                stroke="rgba(255,255,255,0.3)"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-black/90 p-2 border border-white/10 rounded-lg text-[10px]">
                                                <p className="font-bold">{data.name}</p>
                                                <p className={data.status === 'done' ? 'text-emerald-400' : 'text-white/40'}>
                                                    {data.status === 'done' ? 'Succeeded' : data.status === 'skip' ? 'Strategic Skip' : 'Not Attempted'}
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <CalendarCellGrid 
                      cells={cells} 
                      habitColor={habitColor} 
                      onToggle={(date, e) => toggleHabit(selectedHabit.id, date, e)} 
                    />
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
