import { type ReactNode, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Filter,
  Globe2,
  GraduationCap,
  Headphones,
  Landmark,
  Languages,
  Loader2,
  Menu,
  Mic,
  Search,
  Sprout,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { VoiceDrawer } from "@/components/voice-drawer";
import {
  languages,
  translationLines,
  getUITranslations,
  getLocalizedScheme,
  type Language,
} from "@/data/jankalyan";
import { useSchemes } from "@/hooks/useSchemes";
import type { ApiScheme } from "@/lib/api";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Home() {
  const [languageName, setLanguageName] = useState("Hindi");
  const [compareName, setCompareName] = useState("Bengali");
  const [menuOpen, setMenuOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceSchemeId, setVoiceSchemeId] = useState<string | undefined>();
  const [voiceSchemeName, setVoiceSchemeName] = useState<string | undefined>();
  const [voiceAutoStart, setVoiceAutoStart] = useState(false);
  const [stateFilter, setStateFilter] = useState("All states");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [appliedSchemes, setAppliedSchemes] = useState<string[]>([]);

  const current = languages.find((item) => item.name === languageName) ?? languages[1];
  const comparison = languages.find((item) => item.name === compareName) ?? languages[2];
  const compareOptions = useMemo(() => languages.filter((item) => item.name !== current.name), [current.name]);

  const t = useMemo(() => getUITranslations(languageName), [languageName]);

  const topics = useMemo(
    () => [
      { title: t.topicFarming, sub: t.topicFarmingSub, count: `84 ${t.topicSchemesCount}`, icon: Sprout },
      { title: t.topicEducation, sub: t.topicEducationSub, count: `61 ${t.topicSchemesCount}`, icon: GraduationCap },
      { title: t.topicWork, sub: t.topicWorkSub, count: `92 ${t.topicSchemesCount}`, icon: BriefcaseBusiness },
      { title: t.topicHealth, sub: t.topicHealthSub, count: `47 ${t.topicSchemesCount}`, icon: CheckCircle2 },
    ],
    [t],
  );

  // --- Live API data via React Query ---
  const apiFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (stateFilter !== "All states") f.state = stateFilter;
    if (categoryFilter !== "All") f.category = categoryFilter;
    return f;
  }, [stateFilter, categoryFilter]);

  const { data: schemesData, isLoading, isError, error } = useSchemes(apiFilters);
  const filteredSchemes = schemesData?.schemes ?? [];

  useEffect(() => {
    if (compareName === languageName) setCompareName(compareOptions[0]?.name ?? "English");
  }, [compareName, compareOptions, languageName]);

  const openVoice = (scheme?: ApiScheme, autoStart = false) => {
    const localized = scheme ? getLocalizedScheme(scheme.id, languageName) : undefined;
    setVoiceSchemeId(scheme?.id);
    setVoiceSchemeName(localized?.name ?? scheme?.name);
    setVoiceAutoStart(autoStart);
    setVoiceOpen(true);
  };

  const chooseLanguage = (next: string) => {
    setLanguageName(next);
    setMenuOpen(false);
  };

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#fbf7ef] text-[#2b3530] selection:bg-[#f2c66d]">
      {/* Top Banner */}
      <div
        className="flex min-h-10 items-center justify-center gap-2 bg-[#263d35] px-4 py-2 text-center text-[11px] font-bold tracking-[.08em] text-[#f5d083]"
        data-testid="banner-language-message"
      >
        <Globe2 size={14} aria-hidden="true" />
        <span>{t.banner}</span>
        <ArrowRight size={13} aria-hidden="true" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#e6ddca] bg-[#fbf7ef]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-10">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 text-left"
            data-testid="button-brand-home"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#263d35] text-[#f5d083] shadow-[0_8px_18px_rgba(38,61,53,.16)]">
              <Landmark size={21} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-bold tracking-[-.03em] text-[#263d35]">JanKalyan</span>
              <span className="block text-[10px] font-bold uppercase tracking-[.18em] text-[#8a887c]">
                {t.brandSlogan}
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#637067] md:flex" aria-label="Primary navigation">
            <a href="#languages" className="transition hover:text-[#263d35]" data-testid="link-browse-languages">
              {t.navBrowseLanguages}
            </a>
            <a href="#schemes" className="transition hover:text-[#263d35]" data-testid="link-browse-schemes">
              {t.navBrowseSchemes}
            </a>
            <button type="button" onClick={() => openVoice(undefined, true)} className="transition hover:text-[#263d35]" data-testid="button-talk-header">
              {t.navTalkToUs}
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-[#ddd3bc] bg-[#fffaf0] px-3 py-2 text-xs font-bold text-[#637067] lg:flex">
              <Headphones size={14} className="text-[#b85c38]" aria-hidden="true" /> {t.voiceReady}
            </div>
            <label className="sr-only" htmlFor="header-language">
              {t.headerLanguageLabel}
            </label>
            <div className="relative hidden sm:block">
              <select
                id="header-language"
                value={languageName}
                onChange={(event) => chooseLanguage(event.target.value)}
                className="h-10 appearance-none rounded-xl border border-[#d8ceb8] bg-[#fffaf0] py-2 pl-3 pr-8 text-sm font-bold text-[#394b41] outline-none focus:border-[#b85c38]"
                data-testid="select-header-language"
              >
                {languages.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} · {item.native}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-3 text-[#7d8176]" aria-hidden="true" />
            </div>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((value) => !value)}
              className="rounded-xl p-2.5 text-[#263d35] hover:bg-[#f0e8d8] md:hidden"
              data-testid="button-mobile-menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-[#e6ddca] px-5 py-4 md:hidden">
            <div className="flex flex-col gap-4 text-sm font-bold">
              <label htmlFor="mobile-language" className="text-xs uppercase tracking-widest text-[#b85c38]">
                {t.headerLanguageLabel}
              </label>
              <select
                id="mobile-language"
                value={languageName}
                onChange={(event) => chooseLanguage(event.target.value)}
                className="rounded-xl border border-[#d8ceb8] bg-[#fffaf0] px-3 py-3"
                data-testid="select-mobile-language"
              >
                {languages.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} · {item.native}
                  </option>
                ))}
              </select>
              <a href="#languages" onClick={() => setMenuOpen(false)} data-testid="link-mobile-languages">
                {t.navBrowseLanguages}
              </a>
              <a href="#schemes" onClick={() => setMenuOpen(false)} data-testid="link-mobile-schemes">
                {t.navBrowseSchemes}
              </a>
              <button
                type="button"
                className="text-left"
                onClick={() => {
                  openVoice();
                  setMenuOpen(false);
                }}
                data-testid="button-mobile-talk"
              >
                {t.navTalkToUs}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[#d9c9a9] bg-[#f1dfbd]">
        <div className="pointer-events-none absolute -right-32 -top-36 h-[30rem] w-[30rem] rounded-full border-[54px] border-[#dfc48f] opacity-60" />
        <div className="pointer-events-none absolute -bottom-32 left-[38%] h-72 w-72 rounded-full border border-[#d1a971] opacity-40" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 md:py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-10">
          <div className="relative z-10 jr-rise">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cda86d] bg-[#f8e9cc] px-3 py-1.5 text-xs font-bold text-[#85502e]"
              data-testid="text-hero-kicker"
            >
              <Languages size={14} aria-hidden="true" /> {t.heroKicker}
            </div>
            <h1
              className="max-w-3xl text-[clamp(2.8rem,6vw,5.8rem)] font-semibold leading-[.95] tracking-[-.075em] text-[#263d35]"
              data-testid="heading-hero"
            >
              {t.heroHeadingLine1}
              <br />
              <span className="text-[#b85c38]">{t.heroHeadingLine2}</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#5a675e]" data-testid="text-hero-description">
              {t.heroDescription}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#languages"
                className="inline-flex items-center gap-2 rounded-xl bg-[#263d35] px-5 py-3.5 text-sm font-bold text-[#fff4d9] transition hover:-translate-y-0.5 hover:bg-[#36564a]"
                data-testid="link-choose-language"
              >
                {t.heroChooseLanguage} <ArrowRight size={16} aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={() => openVoice(undefined, true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#b9935d] bg-[#f7e7c5] px-5 py-3.5 text-sm font-bold text-[#71462d] transition hover:bg-[#f9edda]"
                data-testid="button-speak-instead"
              >
                <Mic size={16} aria-hidden="true" /> {t.heroSpeakInstead}
              </button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-2 text-xs font-bold text-[#68746c]">
              <span className="flex items-center gap-2">
                <Check size={15} className="text-[#b85c38]" aria-hidden="true" /> {t.heroTagLanguages}
              </span>
              <span className="flex items-center gap-2">
                <Check size={15} className="text-[#b85c38]" aria-hidden="true" /> {t.heroTagSources}
              </span>
              <span className="flex items-center gap-2">
                <Check size={15} className="text-[#b85c38]" aria-hidden="true" /> {t.heroTagVoice}
              </span>
            </div>
          </div>

          <div className="relative flex min-h-[370px] items-center justify-center">
            <div className="jr-breathe absolute h-72 w-72 rounded-full bg-[#e0b768] opacity-50 md:h-96 md:w-96" />
            <div className="relative w-full max-w-sm rotate-2 rounded-[2rem] border border-[#d3ba8b] bg-[#fffaf0] p-5 shadow-[0_22px_60px_rgba(111,74,35,.15)]">
              <div className="flex items-center justify-between border-b border-[#e9dec9] pb-4">
                <span className="text-xs font-bold uppercase tracking-[.17em] text-[#8d806b]">
                  {t.heroCardTodayIn} {current.name}
                </span>
                <Volume2 size={16} className="text-[#b85c38]" aria-hidden="true" />
              </div>
              <p className="mt-6 break-words text-[2.1rem] font-semibold leading-[1.12] tracking-[-.05em] text-[#263d35]" data-testid="text-current-greeting">
                {current.greeting}
              </p>
              <p className="mt-4 text-sm leading-6 text-[#6d776e]">
                {t.heroCardSamplePrompt}
              </p>
              <div className="mt-7 flex items-end gap-1.5 rounded-xl bg-[#f3e8d3] px-4 py-4" aria-label={listening ? "Listening audio animation active" : "Audio preview paused"}>
                {[18, 34, 25, 42, 20, 32, 45, 24, 38, 18, 31, 26, 42].map((height, index) => (
                  <span
                    key={index}
                    className={`jr-wave w-1.5 rounded-full bg-[#b85c38] ${listening ? "" : "opacity-55"}`}
                    style={{ height, animationDelay: `${index * 0.08}s`, animationPlayState: listening ? "running" : "paused" }}
                  />
                ))}
                <span className="ml-auto text-[10px] font-bold text-[#92775c]">0:18</span>
              </div>
              <button
                type="button"
                onClick={() => openVoice(undefined, true)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#263d35] py-3.5 text-sm font-bold text-[#fff8e9] transition hover:bg-[#36564a]"
                data-testid="button-hero-listening"
              >
                <Mic size={17} aria-hidden="true" />
                {t.heroCardTapToSpeak}
              </button>
              {listening && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#f8e9cc] px-3 py-2 text-xs font-bold text-[#85502e]" role="status" data-testid="status-listening">
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="jr-pulse-ring absolute inset-0 rounded-full bg-[#b85c38]" />
                      <span className="relative h-2 w-2 rounded-full bg-[#b85c38]" />
                    </span>
                    {t.heroCardListeningStatus}
                  </span>
                  <button type="button" onClick={() => setListening(false)} className="rounded-md p-1 hover:bg-[#f0d9ad]" aria-label="Stop listening" data-testid="button-stop-listening">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Languages Section */}
      <section id="languages" className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#b85c38]">{t.langSectionKicker}</p>
            <h2 className="text-3xl font-semibold tracking-[-.05em] text-[#263d35] md:text-5xl">{t.langSectionHeading}</h2>
            <p className="mt-3 max-w-xl text-[#6d776e]">{t.langSectionDescription}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#8b887d]">
            <Search size={16} aria-hidden="true" /> {languages.length} {t.langSectionAvailable}
          </div>
        </div>
        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {languages.map((item, index) => (
            <button
              type="button"
              key={item.name}
              onClick={() => chooseLanguage(item.name)}
              className={`jr-rise group relative min-w-0 overflow-hidden rounded-2xl border p-5 text-left transition hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(81,65,42,.1)] ${
                languageName === item.name ? "border-[#b85c38] ring-2 ring-[#e7bb7e]" : "border-[#e4dac7]"
              }`}
              style={{ backgroundColor: item.tint, animationDelay: `${index * 0.04}s` }}
              data-testid={`card-language-${item.name.toLowerCase()}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="break-words text-[2rem] font-semibold leading-tight tracking-[-.06em] text-[#263d35]">{item.native}</span>
                {languageName === item.name && (
                  <span className="shrink-0 rounded-full bg-[#b85c38] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {t.langCardSelected}
                  </span>
                )}
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                <span className="text-[#69736d]">{item.script}</span>
                <span style={{ color: item.accent }}>
                  {t.langCardExplore} {item.name} <ArrowRight className="ml-1 inline" size={13} aria-hidden="true" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Compare Section */}
      <section className="border-y border-[#e6ddca] bg-[#f6efe2]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-10">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#b85c38]">{t.compareKicker}</p>
            <h2 className="text-3xl font-semibold leading-tight tracking-[-.05em] text-[#263d35] md:text-4xl">
              {t.compareHeadingLine1}
              <br />
              {t.compareHeadingLine2}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#6d776e]">{t.compareDescription}</p>
          </div>
          <div className="rounded-[1.7rem] border border-[#ded1b9] bg-[#fffaf0] p-5 shadow-[0_10px_28px_rgba(81,65,42,.06)]">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#eadfce] pb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#8b887d]">{t.compareLabel}</span>
              <label htmlFor="compare-language" className="sr-only">
                Comparison language
              </label>
              <div className="relative ml-auto">
                <select
                  id="compare-language"
                  value={compareName}
                  onChange={(event) => setCompareName(event.target.value)}
                  className="h-10 appearance-none rounded-lg border border-[#d9cbb3] bg-[#f8f0e2] py-2 pl-3 pr-8 text-xs font-bold text-[#45534a] outline-none"
                  data-testid="select-comparison-language"
                >
                  {compareOptions.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name} · {item.native}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-3.5 text-[#7d8176]" aria-hidden="true" />
              </div>
            </div>
            <div className="grid gap-4 pt-5 sm:grid-cols-2">
              <div className="min-w-0 rounded-2xl p-4" style={{ backgroundColor: current.tint }} data-testid="panel-current-language">
                <p className="text-xs font-bold uppercase tracking-widest text-[#8d806b]">
                  {current.name} · {current.native}
                </p>
                <p className="mt-5 break-words text-2xl font-semibold leading-tight tracking-[-.05em] text-[#263d35]">
                  {translationLines[current.name]}
                </p>
                <p className="mt-4 text-xs leading-5 text-[#69736d]">{t.compareCard1Subtitle}</p>
              </div>
              <div className="min-w-0 rounded-2xl p-4" style={{ backgroundColor: comparison.tint }} data-testid="panel-comparison-language">
                <p className="text-xs font-bold uppercase tracking-widest text-[#8d806b]">
                  {comparison.name} · {comparison.native}
                </p>
                <p className="mt-5 break-words text-2xl font-semibold leading-tight tracking-[-.05em] text-[#263d35]">
                  {translationLines[comparison.name]}
                </p>
                <p className="mt-4 text-xs leading-5 text-[#69736d]">{t.compareCard2Subtitle}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#f3e9d7] px-4 py-3 text-xs font-bold text-[#6e715f]">
              <Sparkles size={15} className="text-[#b85c38]" aria-hidden="true" /> {t.compareTagline}
            </div>
          </div>
        </div>
      </section>

      {/* Schemes Section */}
      <section id="schemes" className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#b85c38]">{t.schemesKicker}</p>
            <h2 className="text-3xl font-semibold tracking-[-.05em] text-[#263d35] md:text-5xl">{t.schemesHeading}</h2>
            <p className="mt-3 max-w-xl text-[#6d776e]">{t.schemesDescription}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#8b887d]">
            <Filter size={16} aria-hidden="true" /> {isLoading ? "Loading…" : `${filteredSchemes.length} ${t.schemesMatchesCount}`}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[#e1d6c2] bg-[#f8f0e2] p-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-[#394b41]">
            <Filter size={16} className="text-[#b85c38]" aria-hidden="true" /> {t.narrowResults}
          </div>
          <label htmlFor="state-filter" className="sr-only">
            Filter by state
          </label>
          <select
            id="state-filter"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-[#d8ccb7] bg-[#fffaf0] px-3 py-2.5 text-sm font-bold text-[#45534a] outline-none"
            data-testid="select-state-filter"
          >
            <option value="All states">{t.allStates}</option>
            <option value="Rajasthan">Rajasthan (राजस्थान)</option>
            <option value="Maharashtra">Maharashtra (महाराष्ट्र)</option>
            <option value="Gujarat">Gujarat (ગુજરાત)</option>
            <option value="All India">All India (पूरे भारत में)</option>
          </select>
          <label htmlFor="category-filter" className="sr-only">
            Filter by user category
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-[#d8ccb7] bg-[#fffaf0] px-3 py-2.5 text-sm font-bold text-[#45534a] outline-none"
            data-testid="select-category-filter"
          >
            <option value="All">{t.allCategories}</option>
            <option value="Farmer">{t.catFarmer}</option>
            <option value="Student">{t.catStudent}</option>
            <option value="Small Landholder">{t.catSmallLandholder}</option>
            <option value="Woman Entrepreneur">{t.catWomanEntrepreneur}</option>
            <option value="Senior Citizen">{t.catSeniorCitizen}</option>
            <option value="Low Income">{t.catLowIncome}</option>
            <option value="MSME">{t.catMSME}</option>
          </select>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="mt-7 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cdbd9d] bg-[#fffaf0] px-6 py-14 text-center" role="status">
            <Loader2 size={32} className="animate-spin text-[#b85c38]" aria-hidden="true" />
            <p className="mt-4 text-sm font-bold text-[#263d35]">{t.loadingSchemes}</p>
            <p className="mt-1 text-xs text-[#69736d]">{t.loadingSchemesSub}</p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="mt-7 rounded-2xl border border-dashed border-[#e4a5a5] bg-[#fef5f5] px-6 py-14 text-center" role="alert">
            <X size={28} className="mx-auto text-[#b83838]" aria-hidden="true" />
            <h3 className="mt-4 text-xl font-bold text-[#263d35]">{t.errorSchemes}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#69736d]">{error?.message ?? "Something went wrong. Please try again."}</p>
          </div>
        )}

        {/* Results */}
        {!isLoading && !isError && filteredSchemes.length > 0 && (
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {filteredSchemes.map((scheme, index) => (
              <SchemeCard
                key={scheme.id}
                scheme={scheme}
                language={current}
                applied={appliedSchemes.includes(scheme.id)}
                onCheck={() => openVoice(scheme, true)}
                onApply={() => setAppliedSchemes((items) => (items.includes(scheme.id) ? items : [...items, scheme.id]))}
                delay={index * 0.06}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && filteredSchemes.length === 0 && (
          <div className="mt-7 rounded-2xl border border-dashed border-[#cdbd9d] bg-[#fffaf0] px-6 py-14 text-center" role="status" data-testid="status-empty-schemes">
            <Search size={28} className="mx-auto text-[#b85c38]" aria-hidden="true" />
            <h3 className="mt-4 text-xl font-bold text-[#263d35]">{t.emptySchemes}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#69736d]">{t.emptySchemesSub}</p>
            <button
              type="button"
              onClick={() => {
                setStateFilter("All states");
                setCategoryFilter("All");
              }}
              className="mt-5 rounded-xl bg-[#263d35] px-4 py-3 text-sm font-bold text-[#fff4d9]"
              data-testid="button-reset-filters"
            >
              {t.resetFilters}
            </button>
          </div>
        )}
      </section>

      {/* Topics / Needs Section */}
      <section className="border-t border-[#e6ddca] bg-[#f6efe2]">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10">
          <div className="mb-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#b85c38]">{t.topicsKicker}</p>
            <h2 className="text-3xl font-semibold tracking-[-.05em] text-[#263d35] md:text-4xl">{t.topicsHeading}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {topics.map((topic) => {
              const Icon = topic.icon;
              return (
                <button
                  type="button"
                  key={topic.title}
                  onClick={() => openVoice(undefined, true)}
                  className="group rounded-2xl border border-[#e4dac7] bg-[#fffaf0] p-5 text-left transition hover:-translate-y-1 hover:border-[#cba56d]"
                  data-testid={`button-topic-${topic.title.toLowerCase().replaceAll(" ", "-")}`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1dfbd] text-[#b85c38]">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <h3 className="mt-7 text-lg font-bold text-[#263d35]">{topic.title}</h3>
                  <p className="mt-1 text-sm text-[#8b887d]">{topic.sub}</p>
                  <p className="mt-5 text-xs font-bold text-[#b85c38]">
                    {topic.count} <ArrowRight className="ml-1 inline" size={13} aria-hidden="true" />
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e6ddca] bg-[#263d35] text-[#dbe2d5]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div>
            <p className="font-semibold text-[#fff4d9]">{t.footerSlogan}</p>
            <p className="mt-2 text-xs text-[#9eafa2]">{t.footerDisclaimer}</p>
          </div>
          <button
            type="button"
            onClick={() => openVoice(undefined, true)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-[#f5d083] px-4 py-3 text-sm font-bold text-[#263d35]"
            data-testid="button-talk-footer"
          >
            <Mic size={16} aria-hidden="true" /> {t.footerTalkButton}
          </button>
        </div>
      </footer>

      {voiceOpen ? (
        <VoiceDrawer
          language={current}
          schemeId={voiceSchemeId}
          schemeName={voiceSchemeName}
          autoStart={voiceAutoStart}
          onClose={() => {
            setVoiceOpen(false);
            setVoiceSchemeId(undefined);
            setVoiceSchemeName(undefined);
            setVoiceAutoStart(false);
          }}
        />
      ) : null}
    </main>
  );
}

type SchemeCardProps = {
  scheme: ApiScheme;
  language: Language;
  applied: boolean;
  onCheck: () => void;
  onApply: () => void;
  delay: number;
};

function SchemeCard({ scheme, language, applied, onCheck, onApply, delay }: SchemeCardProps) {
  const t = getUITranslations(language.name);
  const localized = getLocalizedScheme(scheme.id, language.name);

  const displayName = localized?.name || scheme.name;
  const displaySummary = localized?.summary || scheme.summary;
  const rawBenefits = localized?.benefits || scheme.benefits || {};
  const benefitsList = Object.entries(rawBenefits).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);

  return (
    <article
      className="jr-rise flex min-w-0 flex-col rounded-[1.5rem] border border-[#e4dac7] bg-[#fffaf0] p-5 shadow-[0_8px_24px_rgba(81,65,42,.045)]"
      style={{ animationDelay: `${delay}s` }}
      data-testid={`card-scheme-${scheme.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.15em] text-[#b85c38]">
            {(scheme.match_reasons ?? []).join(" · ") || t.schemeDefaultTag}
          </p>
          <h3 className="mt-2 break-words text-2xl font-bold tracking-[-.05em] text-[#263d35]">{displayName}</h3>
        </div>
        <span className="shrink-0 rounded-full bg-[#e2eedf] px-3 py-1.5 text-xs font-bold text-[#39705a]">
          {t.schemeMatch}: {Math.round((scheme.match_score ?? 0) * 100)}%
        </span>
      </div>
      <p className="mt-5 text-sm leading-6 text-[#5e6c62]">{displaySummary}</p>
      {benefitsList.length > 0 && (
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {benefitsList.slice(0, 3).map((benefit) => (
            <div key={benefit} className="rounded-xl bg-[#f4ecdd] p-3 text-xs font-bold leading-5 text-[#59685d]">
              <Check size={14} className="mb-2 text-[#b85c38]" aria-hidden="true" />
              {benefit}
            </div>
          ))}
        </div>
      )}
      {scheme.deadline && (
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#f8e9cc] px-3 py-2.5 text-xs font-bold text-[#85502e]">
          <CalendarClock size={15} aria-hidden="true" /> {t.schemeApplyBy} {scheme.deadline}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3 border-t border-[#eadfce] pt-5">
        <button
          type="button"
          onClick={onCheck}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#b9935d] bg-[#f7e7c5] px-3 py-3 text-sm font-bold text-[#71462d] transition hover:bg-[#f9edda] sm:flex-none"
          data-testid={`button-check-eligibility-${scheme.id}`}
        >
          <Mic size={16} aria-hidden="true" /> {t.schemeCheckEligibility}
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={applied}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition sm:flex-none ${
            applied ? "bg-[#e2eedf] text-[#39705a]" : "bg-[#263d35] text-[#fff4d9] hover:bg-[#36564a]"
          }`}
          data-testid={`button-apply-${scheme.id}`}
        >
          {applied ? (
            <>
              <CheckCircle2 size={16} aria-hidden="true" /> {t.schemeApplied}
            </>
          ) : (
            <>
              <ArrowRight size={16} aria-hidden="true" /> {t.schemeApplyNow}
            </>
          )}
        </button>
        {scheme.application_url && (
          <a
            href={scheme.application_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d8ceb8] bg-[#fffaf0] px-3 py-3 text-sm font-bold text-[#394b41] transition hover:bg-[#f8f0e2] sm:flex-none"
          >
            {t.schemeOfficialSite} <ArrowRight size={14} />
          </a>
        )}
      </div>
      <p className="mt-3 text-[11px] text-[#8b887d]">
        {t.schemeResponseIn} {language.name}.
      </p>
    </article>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;