import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, CalendarClock, HelpCircle, Loader2, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCreditAlerts } from '../../hooks/useCreditAlerts';
import { getCreditAlertClasses, getCreditAlertStatus } from '../../lib/creditAlerts';
import { formatCurrency, formatShortDate } from '../../lib/utils';
import { OrganizationSelector } from '../organizations/OrganizationSelector';
import { ThemeToggle } from '../ui/ThemeToggle';

function startTour() {
  localStorage.removeItem('rendix_tour_completed_v1');
  window.dispatchEvent(new CustomEvent('rendix:start-tour'));
}

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const getCreditAlertFingerprint = (credit: Parameters<typeof getCreditAlertStatus>[0] & { id: string }) => {
  const alert = getCreditAlertStatus(credit);
  return `${credit.id}:${credit.credit_due_date || 'missing'}:${alert?.level || 'none'}`;
};

const readSeenAlerts = (storageKey: string | null): string[] => {
  if (!storageKey) return [];

  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(stored) ? stored.filter(value => typeof value === 'string') : [];
  } catch {
    return [];
  }
};

export function Header({ title, subtitle }: HeaderProps) {
  const { user, activeOrganizationId } = useAuthStore();
  const { actionable, loading: loadingCredits, error: creditsError, refetch } = useCreditAlerts();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [seenAlertFingerprints, setSeenAlertFingerprints] = useState<string[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const notificationStorageKey = useMemo(() => {
    if (!user?.id || !activeOrganizationId) return null;
    return `rendix:credit-alerts-seen:${user.id}:${activeOrganizationId}`;
  }, [activeOrganizationId, user?.id]);

  const actionableFingerprints = useMemo(
    () => actionable.map(getCreditAlertFingerprint),
    [actionable],
  );

  const unreadCount = useMemo(() => {
    const seen = new Set(seenAlertFingerprints);
    return actionableFingerprints.filter(fingerprint => !seen.has(fingerprint)).length;
  }, [actionableFingerprints, seenAlertFingerprints]);

  useEffect(() => {
    setSeenAlertFingerprints(readSeenAlerts(notificationStorageKey));
    setNotificationsOpen(false);
  }, [notificationStorageKey]);

  useEffect(() => {
    if (!notificationsOpen || loadingCredits || creditsError || !notificationStorageKey) return;

    setSeenAlertFingerprints(actionableFingerprints);
    localStorage.setItem(notificationStorageKey, JSON.stringify(actionableFingerprints));
  }, [actionableFingerprints, creditsError, loadingCredits, notificationStorageKey, notificationsOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notificationsOpen]);

  const toggleNotifications = () => {
    const willOpen = !notificationsOpen;
    setNotificationsOpen(willOpen);
    if (willOpen) refetch();
  };

  const openCreditProject = (projectId: string) => {
    window.location.hash = `/projects/${projectId}`;
    setNotificationsOpen(false);
  };

  return (
    <header className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800/60 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Title section */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Organization Selector */}
          <OrganizationSelector />
          
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Help / Tour button */}
          <button
            onClick={startTour}
            title="Ver tutorial de la aplicación"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-800/50 transition-colors text-sm font-medium"
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Tutorial</span>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              aria-label={`Notificaciones de créditos${unreadCount ? `: ${unreadCount} nuevas` : ''}`}
              aria-expanded={notificationsOpen}
              className={`relative p-2 rounded-full transition-colors ${
                notificationsOpen
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-950">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-[min(24rem,calc(100vw-2rem))] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Créditos por vencer</p>
                    <p className="text-xs text-gray-400">{actionable.length} alertas activas · próximos 30 días</p>
                  </div>
                  {loadingCredits && <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />}
                </div>

                {creditsError ? (
                  <div className="p-4 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>No se pudieron cargar los créditos. Verifica que la migración esté aplicada.</span>
                  </div>
                ) : actionable.length === 0 && !loadingCredits ? (
                  <div className="px-5 py-8 text-center">
                    <CalendarClock className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Todo al día</p>
                    <p className="text-xs text-gray-400 mt-1">No hay créditos próximos a vencer.</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                    {actionable.map(credit => {
                      const alert = getCreditAlertStatus(credit);
                      if (!alert) return null;

                      return (
                        <button
                          key={credit.id}
                          type="button"
                          onClick={() => openCreditProject(credit.project_id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${getCreditAlertClasses(alert.level)}`}>
                              {alert.level === 'overdue' || alert.level === 'missing'
                                ? <AlertTriangle className="h-4 w-4" />
                                : <CalendarClock className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{credit.description}</p>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap tabular-nums">
                                  {formatCurrency(credit.amount)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                {credit.projects?.custom_id ? `${credit.projects.custom_id} · ` : ''}{credit.projects?.name || credit.supplier || 'Crédito'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium ${getCreditAlertClasses(alert.level)}`}>
                                  {alert.label}
                                </span>
                                {credit.credit_due_date && (
                                  <span className="text-[11px] text-gray-400">{formatShortDate(credit.credit_due_date)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Usuario</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
