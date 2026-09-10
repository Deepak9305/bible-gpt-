import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, BookOpen, Bookmark, CalendarDays, Check, Clock3, Flame, Heart, LockKeyhole, MessageCircle, PenLine, Settings, Share2, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useProfile } from '../context/ProfileContext';
import { usePremium } from '../context/PremiumContext';
import PremiumModal from '../components/PremiumModal';
import { getInsights, getRecentInsightDays, INSIGHT_PAGE_ORDER, type InsightPage, type InsightsData } from '../services/insightsService';
import { shareInsightsCard } from '../services/insightsShareService';
import { getStats } from '../services/statsService';

const PAGE_META: Record<InsightPage, { label: string; description: string; icon: typeof Heart; color: string }> = {
  home: { label: 'Home', description: 'Daily encouragement', icon: Heart, color: 'text-rose-400' },
  chat: { label: 'Father AI', description: 'Conversations and guidance', icon: MessageCircle, color: 'text-sky-400' },
  library: { label: 'Bible reading', description: 'Time in Scripture', icon: BookOpen, color: 'text-emerald-400' },
  bookmarks: { label: 'Saved verses', description: 'Verses you kept close', icon: Bookmark, color: 'text-violet-400' },
  journal: { label: 'Prayer journal', description: 'Thoughts and prayers', icon: PenLine, color: 'text-amber-400' },
  settings: { label: 'Settings', description: 'Making Bible Nova yours', icon: Settings, color: 'text-slate-400' },
  insights: { label: 'Insights', description: 'Your reflection space', icon: BarChart3, color: 'text-cyan-400' },
};

const formatDuration = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return seconds > 0 ? '<1m' : '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const getEncouragement = (seconds: number, activeDays: number) => {
  if (seconds === 0) return 'Your next quiet moment can begin here.';
  if (activeDays >= 5) return 'You are making space for God, one faithful day at a time.';
  if (seconds < 300) return 'Even a few minutes can become a place of peace.';
  return 'Every return is meaningful. Keep walking at your own pace.';
};

export default function InsightsScreen() {
  const { theme } = useTheme();
  const { profile } = useProfile();
  const { isPremium } = usePremium();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const loadInsights = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    const data = await getInsights(profile.id);
    setInsights(data);
    setIsLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  useEffect(() => {
    const handleUpdate = () => void loadInsights();
    window.addEventListener('bible-nova-insights-updated', handleUpdate);
    return () => window.removeEventListener('bible-nova-insights-updated', handleUpdate);
  }, [loadInsights]);

  const recentDays = useMemo(() => insights ? getRecentInsightDays(insights, 7) : [], [insights]);
  const weeklySeconds = useMemo(() => recentDays.reduce((sum, day) => sum + day.totalSeconds, 0), [recentDays]);
  const activeDays = useMemo(() => recentDays.filter((day) => day.totalSeconds > 0).length, [recentDays]);
  const streak = getStats().streak;
  const weeklyPageTotals = useMemo(() => {
    if (!insights) return [];
    return INSIGHT_PAGE_ORDER
      .map((page) => ({ page, seconds: recentDays.reduce((sum, day) => sum + day.pages[page], 0) }))
      .filter((item) => item.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds);
  }, [insights, recentDays]);
  const maxDaySeconds = Math.max(1, ...recentDays.map((day) => day.totalSeconds));
  const maxPageSeconds = Math.max(1, ...weeklyPageTotals.map((item) => item.seconds));

  const handleShare = async () => {
    if (!insights || !isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }

    setIsSharing(true);
    setShareMessage(null);
    try {
      const result = await shareInsightsCard(insights);
      setShareMessage(result.method === 'downloaded' ? 'Your card was saved to your device.' : 'Your reflection card is ready to share.');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setShareMessage('The card could not be shared right now. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const pageList = isPremium ? weeklyPageTotals : INSIGHT_PAGE_ORDER.slice(0, 4).map((page, index) => ({
    page,
    seconds: Math.max(0, weeklyPageTotals[index]?.seconds || 0),
  }));

  return (
    <div className={`h-full overflow-y-auto pb-10 safe-area-top ${theme === 'dark' ? 'bg-[#07152f] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-4 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <Link
            to="/"
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${theme === 'dark' ? 'text-blue-200 hover:bg-white/10' : 'text-slate-600 hover:bg-white'}`}
          >
            <ArrowLeft size={18} />
            Home
          </Link>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-blue-200/70' : 'text-slate-400'}`}>
            <BarChart3 size={16} />
            Insights
          </div>
        </div>

        <section className="relative mb-5 overflow-hidden rounded-[30px] bg-gradient-to-br from-[#123875] via-[#182f68] to-[#482277] p-6 text-white shadow-2xl shadow-blue-950/20 sm:p-8">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute bottom-[-100px] left-[-50px] h-56 w-56 rounded-full bg-violet-400/20 blur-3xl" />
          <div className="relative">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">Your walk with God</p>
                <h1 className="mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl">Every quiet moment counts.</h1>
              </div>
              <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 sm:flex">
                <Sparkles size={28} className="text-cyan-200" />
              </div>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-blue-100/85 sm:text-base">
              {getEncouragement(weeklySeconds, activeDays)}
            </p>
            <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-sm font-medium text-blue-200">This week in Bible Nova</p>
                <p className="mt-1 text-5xl font-bold tracking-tight">{isLoading ? '—' : formatDuration(weeklySeconds)}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleShare()}
                className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-white/20 active:scale-[0.98]"
              >
                {isSharing ? <Loader2 size={18} className="animate-spin" /> : isPremium ? <Share2 size={18} /> : <LockKeyhole size={17} />}
                Share my week
              </button>
            </div>
          </div>
        </section>

        {shareMessage && (
          <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-medium ${theme === 'dark' ? 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-800'}`} role="status">
            {shareMessage}
          </div>
        )}

        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Active days', value: activeDays, icon: CalendarDays, color: 'text-cyan-400' },
            { label: 'Sessions', value: insights?.sessions || 0, icon: Clock3, color: 'text-violet-400' },
            { label: 'Streak', value: streak, icon: Flame, color: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-2xl border p-4 ${theme === 'dark' ? 'border-blue-200/10 bg-[#0c2248]' : 'border-slate-200 bg-white shadow-sm'}`}>
              <Icon size={19} className={`${color} mb-3`} />
              <p className="text-xl font-bold">{value}</p>
              <p className={`mt-1 text-[11px] font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-blue-100/55' : 'text-slate-400'}`}>{label}</p>
            </div>
          ))}
        </div>

        <section className={`mb-5 rounded-[26px] border p-5 sm:p-6 ${theme === 'dark' ? 'border-blue-200/10 bg-[#0b2044]' : 'border-slate-200 bg-white shadow-sm'}`}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-blue-200/65' : 'text-slate-400'}`}>A gentle rhythm</p>
              <h2 className="mt-1 text-xl font-bold">Your week at a glance</h2>
            </div>
            <div className={`flex items-center gap-1 text-xs font-semibold ${theme === 'dark' ? 'text-blue-200/60' : 'text-slate-400'}`}>
              <Check size={14} />
              No pressure
            </div>
          </div>
          <div className="flex h-44 items-end justify-between gap-2 sm:gap-4">
            {recentDays.map((day) => (
              <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-blue-100/60' : 'text-slate-400'}`}>{day.totalSeconds ? formatDuration(day.totalSeconds) : ''}</span>
                <div className={`flex h-28 w-full max-w-9 items-end overflow-hidden rounded-full ${theme === 'dark' ? 'bg-blue-950/80' : 'bg-slate-100'}`}>
                  <div
                    className="w-full rounded-full bg-gradient-to-t from-cyan-500 to-blue-400 transition-all duration-500"
                    style={{ height: `${day.totalSeconds ? Math.max(10, (day.totalSeconds / maxDaySeconds) * 100) : 5}%` }}
                  />
                </div>
                <span className={`text-[11px] font-bold ${theme === 'dark' ? 'text-blue-100/65' : 'text-slate-500'}`}>{day.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={`relative overflow-hidden rounded-[26px] border p-5 sm:p-6 ${theme === 'dark' ? 'border-blue-200/10 bg-[#0b2044]' : 'border-slate-200 bg-white shadow-sm'}`}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${theme === 'dark' ? 'text-blue-200/65' : 'text-slate-400'}`}>Your attention, lovingly noticed</p>
              <h2 className="mt-1 text-xl font-bold">Where your time went</h2>
            </div>
            {!isPremium && <span className="rounded-full bg-violet-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-400">Plus</span>}
          </div>

          <div className={!isPremium ? 'pointer-events-none select-none blur-[2px]' : ''} aria-hidden={!isPremium}>
            <div className="space-y-4">
              {pageList.map(({ page, seconds }) => {
                const meta = PAGE_META[page];
                const Icon = meta.icon;
                return (
                  <div key={page} className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                      <Icon size={19} className={meta.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{meta.label}</p>
                          <p className={`truncate text-xs ${theme === 'dark' ? 'text-blue-100/50' : 'text-slate-400'}`}>{meta.description}</p>
                        </div>
                        <span className={`shrink-0 text-xs font-bold ${theme === 'dark' ? 'text-blue-100/70' : 'text-slate-500'}`}>{formatDuration(seconds)}</span>
                      </div>
                      <div className={`h-2 overflow-hidden rounded-full ${theme === 'dark' ? 'bg-blue-950' : 'bg-slate-100'}`}>
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${seconds ? Math.max(4, (seconds / maxPageSeconds) * 100) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!isPremium && (
            <div className={`absolute inset-x-5 bottom-5 top-[92px] flex flex-col items-center justify-center rounded-2xl px-6 text-center backdrop-blur-[2px] ${theme === 'dark' ? 'bg-[#0b2044]/72' : 'bg-white/78'}`}>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-lg shadow-violet-500/20">
                <LockKeyhole size={20} />
              </div>
              <h3 className="text-sm font-bold">See the moments that shaped your week</h3>
              <p className={`mt-1 max-w-xs text-xs leading-relaxed ${theme === 'dark' ? 'text-blue-100/65' : 'text-slate-500'}`}>Unlock page-by-page time and a beautiful card to share your reflection.</p>
              <button type="button" onClick={() => setIsPremiumModalOpen(true)} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700">
                Unlock full insights
              </button>
            </div>
          )}
        </section>

        <p className={`px-4 pt-5 text-center text-xs leading-relaxed ${theme === 'dark' ? 'text-blue-100/45' : 'text-slate-400'}`}>
          Your time is measured privately on this device. It is a gentle reflection, never a score.
        </p>
      </div>

      <PremiumModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
    </div>
  );
}
