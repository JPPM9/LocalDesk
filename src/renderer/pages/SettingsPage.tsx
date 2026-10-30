import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppInfo } from '../../shared/api';
import { PageHeader } from '../components/PageHeader';
import { AppearanceSettings } from '../components/settings/AppearanceSettings';
import { MailSettings } from '../components/settings/MailSettings';
import { McpSettings } from '../components/settings/McpSettings';
import { ObsidianSettings } from '../components/settings/ObsidianSettings';
import { ServerSettings } from '../components/settings/ServerSettings';
import { UpdateSection } from '../components/settings/UpdateSection';

/** Abschnitte in Reihenfolge – für die Sprungliste links. */
const SECTIONS = [
  { id: 'darstellung', titleKey: 'appearance.title' },
  { id: 'server', titleKey: 'servers.title' },
  { id: 'mcp', titleKey: 'mcp.title' },
  { id: 'obsidian', titleKey: 'obsidian.title' },
  { id: 'email', titleKey: 'mailSettings.title' },
  { id: 'ueber', titleKey: 'settings.about' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export function SettingsPage() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [active, setActive] = useState<SectionId>('darstellung');
  const refs = useRef(new Map<SectionId, HTMLElement>());

  useEffect(() => {
    window.api.getAppInfo().then(setInfo);
  }, []);

  // Welcher Abschnitt gerade oben im Bild ist, wird in der Sprungliste markiert.
  // Der Beobachter meldet nur Änderungen – deshalb merken wir uns alle sichtbaren
  // Abschnitte und markieren den obersten davon.
  useEffect(() => {
    const visible = new Set<SectionId>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id as SectionId;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const top = SECTIONS.find((s) => visible.has(s.id));
        if (top) setActive(top.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    refs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const jump = (id: SectionId) => {
    setActive(id);
    refs.current.get(id)?.scrollIntoView({
      // „Animationseffekte“ in Windows aus → springen statt gleiten.
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
  };

  const section = (id: SectionId, children: ReactNode) => (
    <div
      id={id}
      ref={(el) => {
        if (el) refs.current.set(id, el);
      }}
      className="scroll-mt-6"
    >
      {children}
    </div>
  );

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="flex gap-10 px-6 py-6">
        {/* Sprungliste: bleibt beim Scrollen stehen. */}
        <nav
          aria-label={t('settings.sections')}
          className="sticky top-6 hidden h-fit w-44 shrink-0 space-y-0.5 lg:block"
        >
          {SECTIONS.map(({ id, titleKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => jump(id)}
              aria-current={active === id ? 'true' : undefined}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-[13.5px] ${
                active === id
                  ? 'bg-accent-soft font-medium text-accent-text'
                  : 'text-muted hover:bg-surface-hover hover:text-text'
              }`}
            >
              {t(titleKey)}
            </button>
          ))}
        </nav>

        <div className="max-w-2xl min-w-0 flex-1 space-y-10 pb-[40vh]">
          {section('darstellung', <AppearanceSettings />)}
          {section('server', <ServerSettings />)}
          {section('mcp', <McpSettings />)}
          {section('obsidian', <ObsidianSettings />)}
          {section('email', <MailSettings />)}
          {section(
            'ueber',
            <section>
              <h2 className="mb-3 font-semibold">{t('settings.about')}</h2>
              {info ? (
                <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 rounded-xl border border-border bg-surface p-4 text-[13px] tabular-nums">
                  <dt className="text-muted">{t('settings.version')}</dt>
                  <dd>{info.version}</dd>
                  <dt className="text-muted">Electron</dt>
                  <dd>{info.electron}</dd>
                  <dt className="text-muted">Node</dt>
                  <dd>{info.node}</dd>
                  <dt className="text-muted">Chromium</dt>
                  <dd>{info.chrome}</dd>
                  <dt className="text-muted">{t('settings.dataPath')}</dt>
                  <dd className="font-mono text-xs break-all">
                    {info.dataPath}
                  </dd>
                </dl>
              ) : (
                <p className="text-muted">{t('settings.loading')}</p>
              )}
              {info && <UpdateSection version={info.version} />}
            </section>,
          )}
        </div>
      </div>
    </>
  );
}
