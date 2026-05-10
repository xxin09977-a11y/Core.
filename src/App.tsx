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

const getWeekDays = Array.from({ length: 6 }, (_, i) => {
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

const THEMES: Record<string, string> = {
  VOID: '#6c63ff',
  AURORA: '#38bdf8',
  MATCHA: '#4ade80',
  CYBERPUNK: '#f0abfc',
  'MIDNIGHT OCEAN': '#0ea5e9',
  SAKURA: '#f472b6',
  EMBER: '#f97316',
  MONOCHROME: '#e2e8f0',
};

const QUOTES = [
  { text: "When do you think people die? When they are forgotten.", author: "Dr. Hiriluk" },
  { text: "I have no sympathy for criminals, but for my family, I do.", author: "Monkey D. Garp" },
  { text: "Scars on the back are a swordsman's shame.", author: "Roronoa Zoro" },
  { text: "Inherited Will, The Destiny of the Age, and The Dreams of the People.", author: "Gol D. Roger" },
  { text: "No matter how hard or impossible it is, never lose sight of your goal.", author: "Monkey D. Luffy" }
];

const THEME_SWATCHES: Record<string, string> = {
  VOID: 'linear-gradient(135deg, #0f0f14, #1a1a2e)',
  AURORA: 'linear-gradient(135deg, #0a0e1a, #0f172a)',
  MATCHA: 'linear-gradient(135deg, #0d1410, #0f1f14)',
  CYBERPUNK: 'linear-gradient(135deg, #0d0015, #1a0030)',
  'MIDNIGHT OCEAN': 'linear-gradient(135deg, #020818, #0c1a35)',
  SAKURA: 'linear-gradient(135deg, #160d12, #1e0f19)',
  EMBER: 'linear-gradient(135deg, #130a00, #1f1200)',
  MONOCHROME: 'linear-gradient(135deg, #0a0a0a, #111111)',
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

// Watermark Background Component
const WatermarkBackground = ({ pureBlack, theme }: { pureBlack?: boolean; theme: string }) => {
  const color = THEMES[theme] || '#3B82F6';
  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${pureBlack ? 'bg-black' : ''}`}>
      {!pureBlack && (
        <>
          <div 
            className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20"
            style={{ background: color }}
          />
          <div 
            className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full blur-[100px] opacity-15"
            style={{ background: color }}
          />
          <div 
            className="absolute -bottom-[5%] left-[20%] w-[25%] h-[25%] rounded-full blur-[90px] opacity-10"
            style={{ background: color }}
          />
          
          {/* Subtle noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
          />
        </>
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
  isQuickActionsOpen
}: { 
  habit: Habit; 
  idx: number; 
  onToggle: (id: string, date: string, e: any) => void;
  onEdit: () => void;
  onLongPress: (e: React.PointerEvent, h: Habit) => void;
  onLongPressCancel: () => void;
  isQuickActionsOpen: boolean;
}) => {
  const IconComponent = ICON_MAP[habit.icon] || Wind;
  const habitColor = habit.color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.05, 0.5) }}
      className="relative rounded-[16px] mb-2 group cursor-pointer flex glass-panel habit-card overflow-hidden"
      style={{ 
        '--extra-shadow': `inset 3px 0 0 ${habitColor}, -2px 0 12px ${habitColor}33`
      } as React.CSSProperties}
      onPointerDown={(e) => onLongPress(e, habit)}
      onPointerUp={onLongPressCancel}
      onPointerLeave={onLongPressCancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (!isQuickActionsOpen) {
          onEdit();
        }
      }}
    >
      <div className="flex flex-col flex-1 py-[10px] pr-[12px] pl-[10px]">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-[28px] h-[28px] rounded-lg flex items-center justify-center shrink-0" 
            style={{ backgroundColor: `${habitColor}26`, color: habitColor }}
          >
            <IconComponent size={14} strokeWidth={2.5} />
          </div>
          <h3 className="text-[13px] font-semibold text-white flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
            {habit.name}
          </h3>
          <div className="flex items-center gap-1.5">
            <div className="text-[10px] font-bold text-[#f97316] bg-[#f973161f] px-1.5 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1">
              <Flame size={10} />
              <span>{calculateStreak(habit)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-1 px-0.5 pb-0.5">
          {getWeekDays.map((dateStr) => {
            const status = habit.logs?.[dateStr] || 'empty';
            const isToday = dateStr === getTodayStr();
            const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'narrow' });
            const dateNum = new Date(dateStr).getDate();
            const isDone = status === 'done';
            const isSkip = status === 'skip';

            let dayCircleStyle: React.CSSProperties = {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.4)'
            };
            let dayContent: React.ReactNode = dateNum;

            if (isDone) {
              dayCircleStyle = {
                background: habitColor,
                border: 'none',
                color: 'white',
              };
              dayContent = <Check size={14} strokeWidth={4} />;
            } else if (isSkip) {
              dayCircleStyle = {
                background: 'rgba(248,113,113,0.15)',
                border: '1px solid rgba(248,113,113,0.3)',
                color: '#f87171'
              };
              dayContent = <Minus size={14} strokeWidth={4} />;
            } else if (isToday) {
              dayCircleStyle = {
                background: 'rgba(108,99,255,0.12)',
                border: '1.5px solid #6c63ff',
                color: 'rgba(255,255,255,0.6)'
              };
            }

            return (
              <div key={dateStr} className="flex-1 flex flex-col items-center gap-[2px] p-[4px_2px] rounded-lg min-w-0 transition-all cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(habit.id, dateStr, e);
                }}
              >
                <span className="text-[9px] font-medium uppercase text-white/30 leading-none">
                  {dayName}
                </span>
                <div
                  className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-200"
                  style={dayCircleStyle}
                >
                  {dayContent}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
});

const DetailStats = React.memo(({ totalDone, streak, bestStreak }: { totalDone: number; streak: number; bestStreak: number }) => (
  <div className="grid grid-cols-3 gap-3">
    <div className="p-4 border rounded-2xl shadow-xl backdrop-blur-md border-theme-border bg-theme-card">
      <div className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-1">Success</div>
      <div className="text-2xl font-black text-emerald-400">{totalDone}</div>
    </div>
    <div className="p-4 border rounded-2xl shadow-xl backdrop-blur-md border-theme-border bg-theme-card">
      <div className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-1">Streak</div>
      <div className="text-2xl font-black flex items-center gap-1.5">
        {streak} 
        <Flame className="w-5 h-5 text-orange-500" />
      </div>
    </div>
    <div className="p-4 border rounded-2xl shadow-xl backdrop-blur-md border-theme-border bg-theme-card">
      <div className="text-white/50 text-[10px] uppercase tracking-widest font-bold mb-1">Best</div>
      <div className="text-2xl font-black flex items-center gap-1.5">
        {bestStreak} 
        <Star className="w-5 h-5 text-yellow-500" />
      </div>
    </div>
  </div>
));

const VoyageMap = React.memo(({ heatmapWeeks, habitColor }: { heatmapWeeks: any[][]; habitColor: string }) => (
  <div className="p-5 sm:p-6 border rounded-2xl shadow-xl backdrop-blur-md border-theme-border bg-theme-card">
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
      
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
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
                              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm transition-all duration-300 ${
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
  <div className="p-5 sm:p-6 border rounded-2xl shadow-xl backdrop-blur-md border-theme-border bg-theme-card">
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
  <div className="p-5 sm:p-6 border rounded-2xl shadow-xl backdrop-blur-md border-theme-border bg-theme-card">
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
          <motion.button
            key={cell.id}
            whileTap={{ scale: 0.8 }}
            onClick={(e) => onToggle(cell.dateStr!, e)}
            className={`aspect-square rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-200 border ${
              isDone 
                ? 'shadow-[0_0_15px_rgba(45,212,191,0.15)]' 
                : 'border-white/10 bg-transparent'
            }`}
            style={{ 
              backgroundColor: isDone ? habitColor : isSkip ? 'rgba(255,255,255,0.05)' : 'transparent',
              borderColor: isDone ? habitColor : isSkip ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
              boxShadow: isDone ? `0 0 15px ${habitColor}30` : undefined,
            }}
          >
            {isDone && <Check className="text-black stroke-[3px] w-4 h-4 sm:w-5 sm:h-5" />}
            {isSkip && <Minus className="text-white/40 stroke-[3px] w-4 h-4 sm:w-5 sm:h-5" />}
          </motion.button>
        );
      })}
    </div>
  </div>
));

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
    glassBlur: number;
    glassIntensity: number;
    theme: keyof typeof THEMES;
    remindersEnabled: boolean;
  }>(() => {
    const defaultSettings = {
      pureBlack: false,
      glassBlur: 20,
      glassIntensity: 7,
      theme: 'VOID' as const,
      remindersEnabled: true
    };
    if (typeof window === 'undefined') return defaultSettings;
    const saved = localStorage.getItem('core_settings');
    if (!saved) return defaultSettings;
    try {
      return { ...defaultSettings, ...JSON.parse(saved) };
    } catch (e) {
      return defaultSettings;
    }
  });
  const [showSettings, setShowSettings] = useState(false);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartY = useRef<number>(0);

  // Embark Form State
  const [newName, setNewName] = useState('');
  const [newIntent, setNewIntent] = useState('');
  const [newCategory, setNewCategory] = useState(HABIT_CATEGORIES[0]);
  const [newFolderId, setNewFolderId] = useState<string | null>(null);
  const [newColor, setNewColor] = useState(ACCENT_COLORS[0]);
  const [newIcon, setNewIcon] = useState<keyof typeof ICON_MAP>('JollyRoger');
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
  const [editReminderActive, setEditReminderActive] = useState(false);
  const [editReminderTime, setEditReminderTime] = useState('09:00');
  const [editReminderDays, setEditReminderDays] = useState<number[]>([]);

  const [activeInput, setActiveInput] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<string | 'All'>('All');
  const [newFolderName, setNewFolderName] = useState('');
  const [sortBy, setSortBy] = useState<'Manual' | 'Streak' | 'Progress'>('Manual');

  const baseFilteredHabits = useMemo(() => {
    return (habits || []).filter(h => filterCategory === 'All' || h.category === filterCategory);
  }, [habits, filterCategory]);

  const sortedHabits = useMemo(() => {
    let sorted = [...baseFilteredHabits];
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
  }, [baseFilteredHabits, sortBy]);

  const groupedHabits = useMemo(() => {
    const habitsByFolder: Record<string, Habit[]> = {};
    const unassignedHabits: Habit[] = [];

    sortedHabits.forEach(h => {
      if (h.folderId && folders.find(f => f.id === h.folderId)) {
        if (!habitsByFolder[h.folderId]) habitsByFolder[h.folderId] = [];
        habitsByFolder[h.folderId].push(h);
      } else {
        unassignedHabits.push(h);
      }
    });
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
            name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
    
    // Apply styling system to document
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--glass-intensity', (settings.glassIntensity / 10).toString());
    
    // Fallback for direct body classes or properties if any
    if (settings.pureBlack) {
      document.body.style.backgroundColor = 'var(--tw-color-black)';
    } else {
      document.body.style.backgroundColor = 'var(--theme-bg)';
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

  // Reminder Monitor
  useEffect(() => {
    const checkReminders = () => {
      if (!settings.remindersEnabled) return;
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
    const permission = await Notification.requestPermission();
    return permission === "granted";
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

const playSound = (type: 'kaching' | 'bell') => {
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
    setHabits(prev => prev.map(h => h.id === selectedHabit.id ? {
      ...h,
      name: editName,
      intent: editIntent,
      category: editCategory,
      folderId: editFolderId,
      color: editColor,
      icon: editIcon,
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

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const getGlassStyle = () => {
    const glassColor = `rgba(255, 255, 255, ${0.05 + settings.glassBlur * 0.002})`;
    return {
      backdropFilter: `blur(${settings.glassBlur}px)`,
      WebkitBackdropFilter: `blur(${settings.glassBlur}px)`,
      backgroundColor: `rgba(255, 255, 255, ${0.01 + settings.glassBlur * 0.0025})`,
      borderTopColor: glassColor,
      borderRightColor: glassColor,
      borderBottomColor: glassColor,
      borderLeftColor: glassColor,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 Q 10 10 20 20 T 40 20' fill='none' stroke='rgba(255,255,255,0.03)' stroke-width='1'/%3E%3C/svg%3E")`
    };
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
      className="min-h-screen relative text-white font-sans selection:bg-white selection:text-black transition-colors duration-500 overflow-hidden bg-theme-bg"
      style={{ 
        backgroundColor: settings.pureBlack ? 'var(--tw-color-black)' : 'var(--theme-bg)',
        '--glass-intensity': settings.glassIntensity / 10,
        '--glass-blur': `${settings.glassBlur}px`
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
              className="fixed z-[120] p-1.5 rounded-2xl bg-neutral-900/90 border border-white/20 shadow-2xl backdrop-blur-xl min-w-[160px]"
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
      <WatermarkBackground pureBlack={settings.pureBlack} theme={settings.theme} />

      <div className="relative z-10 h-full overflow-y-auto w-full hide-scrollbar">
        <header className="flex items-center justify-between px-[16px] pt-[16px] pb-[8px] max-w-lg mx-auto sticky top-0 bg-black/40 backdrop-blur-lg z-[40] border-b border-white/5">
              <motion.h1 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xl font-black tracking-tighter text-white"
              >
                CORE.
              </motion.h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playSound('bell');
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-[6px] px-[14px] rounded-[10px] bg-[#6c63ff] text-white text-[12px] font-bold tracking-[0.5px] border-none h-[34px] transition-transform hover:scale-105 active:scale-95"
                >
                  ＋ EMBARK
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
              <span className="text-[10px] font-black text-white/60">
                {habits.filter(h => h.logs?.[getTodayStr()] === 'done').length}/{habits.length} quests complete
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${(habits.filter(h => h.logs?.[getTodayStr()] === 'done').length / Math.max(1, habits.length)) * 100}%` }}
                 className="h-full transition-all duration-700"
                 style={{ backgroundColor: THEMES[settings.theme] || '#3B82F6' }}
               />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2.5 mb-8">
            {[
              { label: 'Total Habits', value: habits.length },
              { label: 'Done Today', value: habits.filter(h => h.logs?.[getTodayStr()] === 'done').length },
              { label: 'Best Streak', value: Math.max(0, ...habits.map(h => calculateStreak(h)), 0) }
            ].map((stat, i) => (
              <div key={i} className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.05em] mb-1">{stat.label}</p>
                <p className="text-[20px] font-black text-white leading-none tracking-tight">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filter & Sort Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 mb-4"
          >
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 w-full sm:w-auto">
              {['All', ...HABIT_CATEGORIES].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                    filterCategory === cat 
                      ? 'bg-white text-black border-white shadow-lg shadow-white/10' 
                      : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/60'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>

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
                           <Folder size={16} style={{ color: THEMES[settings.theme] || '#3B82F6' }} />
                           <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-white/60">{folder.name}</h3>
                           <div className="h-px flex-1 bg-white/5" />
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{habitsInFolder.length} Quests</span>
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
                          />
                        ))}
                      </div>
                    </div>
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

      {/* Undo Action Toast */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: '-50%' }}
            animate={{ opacity: 1, y: -90, x: '-50%' }}
            exit={{ opacity: 0, y: 100, x: '-50%' }}
            className="fixed bottom-10 left-1/2 z-50 pointer-events-auto"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-neutral-900 border border-white/20 shadow-2xl backdrop-blur-xl">
              <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Action Recorded</span>
              <button 
                onClick={undoAction}
                className="px-3 py-1.5 rounded-lg bg-theme-accent text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-1.5"
                style={{ backgroundColor: THEMES[settings.theme] || '#3B82F6' }}
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
            className="fixed inset-0 z-[100] text-white overflow-y-auto no-scrollbar modal"
            style={{ backgroundColor: 'var(--bg-primary)', WebkitOverflowScrolling: 'touch' }}
          >
            <WatermarkBackground pureBlack={settings.pureBlack} theme={settings.theme} />
            {/* Header */}
            <div className="px-4 py-4 flex items-center gap-4 bg-black/20 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
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
                <div className="flex items-center gap-2 mb-6">
                  <Palette size={18} className="text-white/40" />
                  <h3 className="text-[11px] font-black uppercase tracking-[2px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Appearance</h3>
                </div>
                
                <div className="p-5 rounded-[28px] border border-white/10 bg-white/[0.03] space-y-8">
                  {/* Theme Palette */}
                  <div>
                    <div className="mb-4">
                       <h4 className="text-[17px] text-white font-medium leading-tight">Theme Palette</h4>
                       <p className="text-white/60 text-[14px] mt-1 leading-snug">Choose a global aesthetic theme.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                      {Object.entries(THEME_SWATCHES).map(([name, gradient]) => {
                        const isActive = settings.theme === name;
                        const accent = THEMES[name];
                        return (
                          <button
                            key={name}
                            onClick={() => setSettings(s => ({ ...s, theme: name as keyof typeof THEMES }))}
                            className={`relative h-[70px] rounded-[16px] overflow-hidden text-left focus:outline-none transition-all ${isActive ? 'border-2 border-white scale-105 z-10' : 'border-2 border-transparent scale-100 opacity-80 hover:opacity-100'}`}
                            style={{
                              background: gradient,
                              boxShadow: isActive ? `0 0 20px ${accent}60` : 'none'
                            }}
                          >
                            <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white tracking-widest uppercase">{name}</span>
                            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }}></div>
                            {isActive && (
                              <div className="absolute top-2 right-2 bg-white text-black rounded-full p-[2px]">
                                <Check size={8} strokeWidth={5} />
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
                    <div className="pr-4">
                      <h4 className="text-[17px] text-white font-medium leading-tight">True Noir Mode</h4>
                      <p className="text-white/60 text-[14px] mt-1 leading-snug">Use pure OLED black for backgrounds. Saves battery and increases contrast.</p>
                    </div>
                    <button
                      onClick={() => setSettings(s => ({ ...s, pureBlack: !s.pureBlack }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.pureBlack ? 'bg-blue-500' : 'bg-neutral-600'}`}
                      style={{ backgroundColor: settings.pureBlack ? (THEMES[settings.theme] || '#3B82F6') : undefined }}
                    >
                      <motion.span
                        className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200"
                        animate={{ x: settings.pureBlack ? 20 : 0 }}
                      />
                    </button>
                  </div>

                  <div className="h-px bg-white/5" />

                  {/* Glass Effect */}
                  <div>
                    <h4 className="text-[17px] text-white font-medium leading-tight">Vitreous Intensity</h4>
                    <p className="text-white/60 text-[14px] mt-1 leading-snug">Adjust the transparency and blur of glass panels.</p>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={settings.glassIntensity}
                      onChange={(e) => setSettings(s => ({ ...s, glassIntensity: parseInt(e.target.value) }))}
                      className="glass-slider mt-6"
                      style={{ 
                        background: `linear-gradient(90deg, ${THEMES[settings.theme]} ${settings.glassIntensity * 10}%, rgba(255,255,255,0.1) ${settings.glassIntensity * 10}%)`
                      }}
                    />
                    <div className="flex justify-between text-[10px] font-bold text-white/30 mt-3 tracking-widest uppercase">
                      <span>Spectral</span>
                      <span>Opaque</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Reminders Section */}
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Bell size={18} className="text-white/40" />
                  <h3 className="text-[11px] font-black uppercase tracking-[2px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Reminders</h3>
                </div>
                
                <div className="p-5 rounded-[28px] border border-white/10 bg-white/[0.03] space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="pr-4">
                      <h4 className="text-[17px] text-white font-medium leading-tight">Global Notifications</h4>
                      <p className="text-white/60 text-[14px] mt-1 leading-snug">Enable or disable all quest reminders globally.</p>
                    </div>
                    <button
                      onClick={() => setSettings(s => ({ ...s, remindersEnabled: !s.remindersEnabled }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${settings.remindersEnabled ? 'bg-blue-500' : 'bg-neutral-600'}`}
                      style={{ backgroundColor: settings.remindersEnabled ? (THEMES[settings.theme] || '#3B82F6') : undefined }}
                    >
                      <motion.span
                        className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200"
                        animate={{ x: settings.remindersEnabled ? 20 : 0 }}
                      />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 shrink-0">
                      <Info size={16} />
                    </div>
                    <p className="text-[13px] text-white/50 leading-snug">Individual quest reminders can still be tuned in the quest's editor.</p>
                  </div>
                </div>
              </section>

              {/* Data Management Section */}
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Database size={18} className="text-white/40" />
                  <h3 className="text-[11px] font-black uppercase tracking-[2px] mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>Data Management</h3>
                </div>
                
                <div className="p-5 rounded-[28px] border border-white/10 bg-white/[0.03] space-y-4">
                  <button 
                    onClick={exportData}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group"
                  >
                    <div className="flex items-center gap-3">
                      <Download size={18} className="text-emerald-400" />
                      <div className="text-left">
                        <span className="block text-[15px] font-medium text-white">Export Backup</span>
                        <span className="block text-[12px] text-white/40">Save your data to a JSON file.</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white/40 transition-colors" />
                  </button>

                  <label className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Upload size={18} className="text-blue-400" />
                      <div className="text-left">
                        <span className="block text-[15px] font-medium text-white">Import Backup</span>
                        <span className="block text-[12px] text-white/40">Restore from a previous backup file.</span>
                      </div>
                    </div>
                    <input type="file" accept=".json" onChange={importData} className="hidden" />
                    <ChevronRight size={16} className="text-white/20 group-hover:text-white/40 transition-colors" />
                  </label>

                  <button 
                    onClick={resetData}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 transition-all border border-red-500/10 group"
                  >
                    <div className="flex items-center gap-3">
                      <Skull size={18} className="text-red-500" />
                      <div className="text-left">
                        <span className="block text-[15px] font-medium text-red-500">Purge Memory</span>
                        <span className="block text-[12px] text-red-500/50">Delete all data permanently.</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-red-500/20 group-hover:text-red-500/40 transition-colors" />
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
            <WatermarkBackground pureBlack={settings.pureBlack} theme={settings.theme} />
            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between gap-4 bg-black/40 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
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
                  backgroundColor: `${THEMES[settings.theme] || '#3B82F6'}CC`,
                  color: '#ffffff'
                }}
              >
                SET SAIL!
              </button>
            </div>

            {/* Form Content */}
            <div className="px-4 py-6 pb-32 max-w-lg mx-auto space-y-6">
              
              {/* General Section */}
              <section className="modal-section">
                <h3 className="section-label text-[11px] font-black uppercase tracking-[1.5px] mb-3 ml-1" style={{ color: 'rgba(255,255,255,0.6)' }}>General</h3>
                
                <div className="p-4 rounded-[28px] border border-white/10 bg-white/[0.03] space-y-4">
                  <div>
                    <h4 className="section-label text-[11px] font-bold text-white/60 ml-2 mb-1.5 uppercase tracking-[1.5px]">Identity</h4>
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onFocus={() => setActiveInput('name')}
                      onBlur={() => setActiveInput(null)}
                      placeholder="E.g., Morning Meditation"
                      className="w-full bg-white/[0.08] border-2 px-4 py-3 rounded-[18px] text-[15px] font-medium text-white placeholder:text-white/40 focus:outline-none transition-all"
                      style={{ 
                        borderColor: activeInput === 'name' ? newColor : 'rgba(255,255,255,0.2)',
                        boxShadow: activeInput === 'name' ? `0 0 12px ${newColor}40` : 'none'
                      }}
                    />
                  </div>
                  
                  <div>
                    <h4 className="section-label text-[11px] font-bold text-white/60 ml-2 mb-1.5 uppercase tracking-[1.5px]">Intent</h4>
                    <input 
                      type="text" 
                      value={newIntent}
                      onChange={(e) => setNewIntent(e.target.value)}
                      onFocus={() => setActiveInput('intent')}
                      onBlur={() => setActiveInput(null)}
                      placeholder="Why does this matter?"
                      className="w-full bg-white/[0.08] border-2 px-4 py-3 rounded-[18px] text-[14px] font-medium text-white placeholder:text-white/40 placeholder:italic focus:outline-none transition-all"
                      style={{ 
                        borderColor: activeInput === 'intent' ? newColor : 'rgba(255,255,255,0.2)',
                        boxShadow: activeInput === 'intent' ? `0 0 12px ${newColor}40` : 'none'
                      }}
                    />
                  </div>

                  <div>
                    <h4 className="section-label text-[11px] font-bold text-white/60 ml-2 mb-2 uppercase tracking-[1.5px]">Path Category</h4>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                      {HABIT_CATEGORIES.map(cat => {
                        const isSelected = newCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setNewCategory(cat)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                              isSelected 
                                ? 'bg-white/20 text-white border-white/20 shadow-lg' 
                                : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/60'
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
                      <h4 className="section-label text-[11px] font-bold text-white/60 ml-2 mb-2 uppercase tracking-[1.5px]">Assign to Folder</h4>
                      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                        <button
                          onClick={() => setNewFolderId(null)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                            newFolderId === null 
                              ? 'bg-white/20 text-white border-white/20 shadow-lg' 
                              : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/60'
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
                                  ? 'bg-white/20 text-white border-white/20 shadow-lg' 
                                  : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/60'
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

              {/* Appearance Section */}
              <section className="modal-section">
                <h3 className="section-label text-[11px] font-black uppercase tracking-[1.5px] mb-3 ml-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Appearance</h3>
                
                <div className="p-4 rounded-[28px] border border-white/10 bg-white/[0.03] space-y-6">
                  {/* Color Selection */}
                  <div>
                    <h4 className="section-label text-[11px] font-bold text-white/60 ml-2 mb-3 uppercase tracking-[1.5px]">Color Shade</h4>
                    <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x no-scrollbar">
                      {ACCENT_COLORS.map(color => (
                        <div key={color} className="flex flex-col items-center gap-1.5 shrink-0 snap-center">
                          <button
                            onClick={() => setNewColor(color)}
                            className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition-all ${
                              newColor === color ? 'scale-110 ring-2 ring-offset-2 ring-offset-black' : 'opacity-60 hover:opacity-100'
                            }`}
                            style={{ 
                              backgroundColor: color,
                              borderColor: newColor === color ? color : 'transparent' 
                            }}
                          >
                            {newColor === color && <Check size={14} className="text-white drop-shadow-md" strokeWidth={4} />}
                          </button>
                          <span className="color-label text-[10px] uppercase font-bold tracking-wider text-white">{COLOR_LABELS[color]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Icons Selection */}
                  <div>
                    <h4 className="section-label text-[11px] font-bold text-white/60 ml-2 mb-3 uppercase tracking-[1.5px]">Ritual Icon</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {(Object.keys(ICON_MAP) as Array<keyof typeof ICON_MAP>).map(iconKey => {
                        const Icon = ICON_MAP[iconKey];
                        const isSelected = newIcon === iconKey;
                        return (
                          <button
                            key={iconKey}
                            onClick={() => setNewIcon(iconKey)}
                            className={`aspect-square rounded-[16px] flex items-center justify-center transition-all border ${
                              isSelected 
                                ? 'scale-105 shadow-lg' 
                                : 'border-transparent opacity-50 hover:opacity-80'
                            }`}
                            style={{
                              backgroundColor: isSelected ? `${newColor}20` : 'rgba(255,255,255,0.05)',
                              borderColor: isSelected ? newColor : 'transparent',
                              color: isSelected ? newColor : '#ffffff',
                              boxShadow: isSelected ? `0 0 12px ${newColor}40` : undefined,
                              opacity: isSelected ? 1 : 0.5
                            }}
                          >
                            <Icon size={20} strokeWidth={isSelected ? 3 : 2} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Logistics Section */}
              <section className="modal-section">
                <h3 className="section-label text-[11px] font-black uppercase tracking-[1.5px] mb-3 ml-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Logistics</h3>
                <div className="p-4 rounded-[28px] border border-white/10 bg-white/[0.03] space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${newReminderActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/40'}`}>
                        <Timer size={18} />
                      </div>
                      <div>
                        <h4 className="section-label text-[14px] font-bold text-white">Daily Reminder</h4>
                        <p className="hint-text text-[11px] text-white/50">Get notified when it's time.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNewReminderActive(!newReminderActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${newReminderActive ? 'bg-blue-500' : 'bg-white/10'}`}
                    >
                      <motion.span
                        className="inline-block h-5 w-5 transform rounded-full bg-white shadow"
                        animate={{ x: newReminderActive ? 20 : 0 }}
                      />
                    </button>
                  </div>

                  {newReminderActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-2 pb-2 space-y-4"
                    >
                      <input 
                        type="time" 
                        value={newReminderTime}
                        onChange={(e) => setNewReminderTime(e.target.value)}
                        className="w-full bg-white/[0.08] border-2 border-white/20 px-4 py-3 rounded-[18px] text-[15px] font-medium text-white focus:outline-none focus:border-blue-500 transition-all"
                      />

                      <div>
                        <p className="section-label text-[10px] uppercase font-bold text-white/40 mb-2 ml-1">Reminder Days</p>
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
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all border ${
                                  isSelected ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-white/30'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                        <p className="hint-text text-[9px] text-white/20 mt-2 ml-1 italic">{newReminderDays.length === 0 ? 'Reminding daily' : `Reminding ${newReminderDays.length} day(s) a week`}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </section>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {habitToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setHabitToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="p-6 border rounded-2xl w-full max-w-sm shadow-2xl backdrop-blur-xl"
              style={getGlassStyle()}
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
            <WatermarkBackground pureBlack={settings.pureBlack} theme={settings.theme} />

            {/* Header */}
            <div className="px-4 py-4 flex items-center justify-between gap-4 bg-black/20 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
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
                const { cells, totalDone, streak, bestStreak, heatmapWeeks, weeklyData, chartData } = selectedHabitStats;

                return (
                  <>
                    <div className="p-5 sm:p-6 border rounded-2xl shadow-xl backdrop-blur-md border-theme-border bg-theme-card">
                      {isEditingDetails ? (
                        <div className="space-y-6">
                          <div className="space-y-4">
                             <div>
                               <h4 className="section-label text-[11px] font-bold text-white/60 ml-2 mb-1.5 uppercase tracking-[1.5px]">Ritual Title</h4>
                               <input 
                                 type="text" 
                                 value={editName}
                                 onChange={(e) => setEditName(e.target.value)}
                                 className="w-full bg-white/[0.08] border-2 border-white/20 px-4 py-3 rounded-[18px] text-[15px] font-medium text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                               />
                             </div>
                             <div>
                               <h4 className="section-label text-[11px] font-bold text-white/60 ml-2 mb-1.5 uppercase tracking-[1.5px]">Ritual Intent</h4>
                               <input 
                                 type="text" 
                                 value={editIntent}
                                 onChange={(e) => setEditIntent(e.target.value)}
                                 placeholder="Why does this matter?"
                                 className="w-full bg-white/[0.08] border-2 border-white/20 px-4 py-3 rounded-[18px] text-[14px] font-medium text-white focus:outline-none focus:border-emerald-500/50 transition-all italic"
                               />
                             </div>
                          </div>

                          <div>
                            <h4 className="section-label text-[11px] font-bold text-white/60 ml-2 mb-2 uppercase tracking-[1.5px]">Path Category</h4>
                            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                              {HABIT_CATEGORIES.map(cat => {
                                const isSelected = editCategory === cat;
                                return (
                                  <button
                                    key={cat}
                                    onClick={() => setEditCategory(cat)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                                      isSelected 
                                        ? 'bg-white/20 text-white border-white/20 shadow-lg' 
                                        : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/60'
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
                              <h4 className="section-label text-[11px] font-bold text-white/60 ml-2 mb-2 uppercase tracking-[1.5px]">Assigned Folder</h4>
                              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                                <button
                                  onClick={() => setEditFolderId(null)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 border ${
                                    editFolderId === null 
                                      ? 'bg-white/20 text-white border-white/20 shadow-lg' 
                                      : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/60'
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
                                          ? 'bg-white/20 text-white border-white/20 shadow-lg' 
                                          : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white/60'
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
                            <h4 className="text-[11px] font-bold text-white/60 ml-2 mb-3 uppercase tracking-[1.5px]">Visual Essence</h4>
                            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x no-scrollbar">
                              {ACCENT_COLORS.map(color => (
                                <button
                                  key={color}
                                  onClick={() => setEditColor(color)}
                                  className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-all ${
                                    editColor === color ? 'scale-110 ring-2 ring-white/40' : 'opacity-60'
                                  }`}
                                  style={{ backgroundColor: color }}
                                >
                                  {editColor === color && <Check size={12} className="text-white" strokeWidth={4} />}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-[11px] font-bold text-white/60 ml-2 mb-3 uppercase tracking-[1.5px]">Ritual Icon</h4>
                            <div className="grid grid-cols-6 gap-2">
                              {(Object.keys(ICON_MAP) as Array<keyof typeof ICON_MAP>).map(iconKey => {
                                const Icon = ICON_MAP[iconKey];
                                const isSelected = editIcon === iconKey;
                                return (
                                  <button
                                    key={iconKey}
                                    onClick={() => setEditIcon(iconKey)}
                                    className={`aspect-square rounded-xl flex items-center justify-center transition-all border ${
                                      isSelected ? 'border-white/40 bg-white/10' : 'border-transparent bg-white/5 opacity-40 hover:opacity-100'
                                    }`}
                                    style={{ color: isSelected ? editColor : '#ffffff' }}
                                  >
                                    <Icon size={18} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-white/5">
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

                    <DetailStats totalDone={totalDone} streak={streak} bestStreak={bestStreak} />

                    <VoyageMap heatmapWeeks={heatmapWeeks} habitColor={habitColor} />

                    <WeeklyCompletionChart weeklyData={weeklyData} habitColor={habitColor} />

                    <div className="p-5 sm:p-6 border rounded-2xl shadow-xl backdrop-blur-md border-theme-border bg-theme-card">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[17px] font-bold uppercase tracking-tight">Streak History</h4>
                            <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Growth Curve</span>
                            </div>
                        </div>
                        <div className="h-40 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={(() => {
                                    const historicalStreaks = getStreakHistory(selectedHabit);
                                    // Take last 8 streaks for visualization
                                    const latest = historicalStreaks.slice(-8);
                                    return latest.map((s, i) => ({ name: `S${i+1}`, length: s }));
                                })()}>
                                    <XAxis dataKey="name" hide />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        labelStyle={{ display: 'none' }}
                                    />
                                    <Bar dataKey="length" radius={[6, 6, 0, 0]}>
                                        {(() => getStreakHistory(selectedHabit).slice(-8))().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === getStreakHistory(selectedHabit).slice(-8).length - 1 ? habitColor : `${habitColor}40`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-white/30 text-center mt-4">Showing historical completion spurts</p>
                    </div>

                    {/* Reminder Settings */}
                    <div className="p-5 glass-panel rounded-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Timer size={20} className={selectedHabit.reminder?.active ? 'text-blue-400' : 'text-white/30'} />
                          <h4 className="text-lg font-bold">Logistics</h4>
                        </div>
                        <button
                          onClick={async () => {
                            const newActive = !selectedHabit.reminder?.active;
                            if (newActive) await requestNotificationPermission();
                            setHabits(prev => prev.map(h => h.id === selectedHabit.id ? {
                              ...h,
                              reminder: { ...(h.reminder || { time: '09:00' }), active: newActive }
                            } : h));
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${selectedHabit.reminder?.active ? 'bg-blue-500' : 'bg-white/10'}`}
                        >
                          <motion.span
                            className="inline-block h-5 w-5 transform rounded-full bg-white shadow"
                            animate={{ x: selectedHabit.reminder?.active ? 20 : 0 }}
                          />
                        </button>
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

                    <div className="p-5 sm:p-6 border rounded-2xl shadow-xl backdrop-blur-md border-theme-border bg-theme-card">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[17px] font-medium leading-tight">Progress Visualization</h4>
                        <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Completion Density</span>
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
                                hide={true}
                            />
                            <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-black/80 backdrop-blur-md p-2 border border-white/10 rounded-lg text-[10px]">
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
