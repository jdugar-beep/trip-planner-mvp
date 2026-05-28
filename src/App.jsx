import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Plus,
  Sparkles,
  Plane,
  Hotel,
  MapPin,
  Clock,
  Link as LinkIcon,
  Trash2,
  Edit3,
  CheckCircle2,
  Users,
  Bell,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  ListTodo,
  ClipboardList,
  X,
  Sun,
  Moon,
  Search,
  Vote,
  Wand2,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const CATEGORIES = ["breakfast", "lunch", "dinner", "activity", "drinks", "sightseeing", "exploring"];
const CATEGORY_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  activity: "Activity",
  drinks: "Drinks",
  sightseeing: "Sightseeing",
  exploring: "Exploring",
};
const CATEGORY_EMOJIS = {
  breakfast: "🥐",
  lunch: "🥗",
  dinner: "🍝",
  activity: "🎟️",
  drinks: "🍸",
  sightseeing: "🏛️",
  exploring: "🚶",
};
const CATEGORY_DESCRIPTIONS = {
  breakfast: "Restaurants, cafes, pastries",
  lunch: "Casual meals and midday plans",
  dinner: "Reservations and dinner ideas",
  activity: "Activities or experiences",
  drinks: "Bars, lounges, and cocktails",
  sightseeing: "Must-see spots",
  exploring: "Neighborhoods and wandering",
};
const PERIOD_TIMES = { morning: "09:30", afternoon: "14:00", evening: "19:00" };
const uid = () => Math.random().toString(36).slice(2, 10);
const todayIso = () => new Date().toISOString().slice(0, 10);

function addDays(date, days) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysBetween(start, end) {
  if (!start || !end) return [];
  const out = [];
  let d = start;
  while (d <= end) {
    out.push(d);
    d = addDays(d, 1);
    if (out.length > 370) break;
  }
  return out;
}
function prettyDate(iso, opts = {}) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, opts.month ? opts : { weekday: "short", month: "short", day: "numeric" });
}
function timeLabel(t, period) {
  if (t) return new Date(`2026-01-01T${t}`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (period) return period[0].toUpperCase() + period.slice(1);
  return "Flexible";
}
function defaultTrip() {
  const start = todayIso();
  return {
    id: uid(),
    name: "New Trip",
    location: "",
    startDate: start,
    endDate: addDays(start, 3),
    ideas: [],
    hotels: [],
    travelers: [],
  };
}

export default function App() {
  const [trips, setTrips] = useLocalStorage("trip-planner-mobile-beta-trips", []);
  const [activeTripId, setActiveTripId] = useLocalStorage("trip-planner-mobile-beta-active", null);
  const [page, setPage] = useState("planning");
  const [theme, setTheme] = useLocalStorage("trip-planner-mobile-beta-theme", "dark");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tripEditorOpen, setTripEditorOpen] = useState(false);
  const [tripSwitcherOpen, setTripSwitcherOpen] = useState(false);
  const [ideaEditor, setIdeaEditor] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session || null);
      setAuthLoading(false);
      if (data.session?.user) ensureProfile(data.session.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (nextSession?.user) ensureProfile(nextSession.user);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  async function ensureProfile(user) {
    if (!user?.id) return;
    const fallbackName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Traveler";
    const fallbackUsername = (user.email?.split("@")[0] || `user_${user.id.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_]/g, "_");
    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fallbackName,
      username: fallbackUsername,
    }, { onConflict: "id" });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
  }

  useEffect(() => {
    if (trips.length && !trips.some((t) => t.id === activeTripId)) setActiveTripId(trips[0].id);
  }, [trips, activeTripId, setActiveTripId]);

  const activeTrip = trips.find((t) => t.id === activeTripId) || null;

  function updateTrip(id, patch) {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function mutateActiveTrip(fn) {
    if (!activeTrip) return;
    setTrips((prev) => prev.map((t) => (t.id === activeTrip.id ? fn(t) : t)));
  }
  function addTrip() {
    const t = defaultTrip();
    setTrips((prev) => [...prev, t]);
    setActiveTripId(t.id);
    setPage("planning");
    setTripEditorOpen(true);
  }
  function deleteTrip(id) {
    setTrips((prev) => prev.filter((t) => t.id !== id));
    if (activeTripId === id) setActiveTripId(trips.find((t) => t.id !== id)?.id || null);
  }
  function autoBuild() {
    mutateActiveTrip((trip) => {
      const dates = daysBetween(trip.startDate, trip.endDate);
      if (!dates.length) return trip;
      const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
      const sorted = [...trip.ideas].sort((a, b) => (b.votes || 0) - (a.votes || 0));
      const scheduled = sorted.map((idea, i) => {
        if (idea.date) return { ...idea, scheduledDate: idea.date, scheduledTime: idea.time || PERIOD_TIMES[idea.period] || "12:00" };
        const catIndex = byCategory[idea.category] || 0;
        byCategory[idea.category] = catIndex + 1;
        const assignedDate = dates[catIndex % dates.length] || dates[i % dates.length];
        return { ...idea, scheduledDate: assignedDate, scheduledTime: idea.time || PERIOD_TIMES[idea.period] || defaultTimeForCategory(idea.category) };
      });
      return { ...trip, ideas: scheduled };
    });
    setPage("itinerary");
  }

  if (authLoading) {
    return (
      <div className={`app ${theme}`}>
        <style>{css}</style>
        <div className="authShell"><div className="authCard"><div className="authLogo">✈️</div><h1>Loading Trip Studio…</h1></div></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={`app ${theme}`}>
        <style>{css}</style>
        <AuthPage />
      </div>
    );
  }

  return (
    <div className={`app ${theme}`}>
      <style>{css}</style>
      <DesktopTopBar
        trips={trips}
        activeTrip={activeTrip}
        activeTripId={activeTripId}
        setActiveTripId={setActiveTripId}
        page={page}
        setPage={setPage}
        addTrip={addTrip}
        openSettings={() => setSettingsOpen(true)}
      />
      <main className="shell">
        <MobileHero activeTrip={activeTrip} trips={trips} openTripSwitcher={() => setTripSwitcherOpen(true)} openTripEditor={() => setTripEditorOpen(true)} />
        {!activeTrip ? (
          <EmptyState addTrip={addTrip} />
        ) : (
          <>
            <TripControlStrip activeTrip={activeTrip} openTripEditor={() => setTripEditorOpen(true)} autoBuild={autoBuild} />
            {page === "planning" && <PlanningPage trip={activeTrip} mutateTrip={mutateActiveTrip} editIdea={setIdeaEditor} />}
            {page === "logistics" && <LogisticsPage trip={activeTrip} mutateTrip={mutateActiveTrip} />}
            {page === "itinerary" && <ItineraryPage trip={activeTrip} editIdea={setIdeaEditor} />}
            {page === "calendar" && <CalendarPage trips={trips} setActiveTripId={setActiveTripId} setPage={setPage} />}
          </>
        )}
      </main>
      <MobileBottomNav page={page} setPage={setPage} addTrip={addTrip} />
      {settingsOpen && <SettingsModal theme={theme} setTheme={setTheme} user={session?.user} signOut={signOut} close={() => setSettingsOpen(false)} />}
      {tripEditorOpen && activeTrip && <TripEditor trip={activeTrip} save={(patch) => updateTrip(activeTrip.id, patch)} deleteTrip={() => deleteTrip(activeTrip.id)} close={() => setTripEditorOpen(false)} />}
      {tripSwitcherOpen && <TripSwitcher trips={trips} activeTripId={activeTripId} selectTrip={(id) => { setActiveTripId(id); setTripSwitcherOpen(false); setPage("planning"); }} addTrip={() => { setTripSwitcherOpen(false); addTrip(); }} close={() => setTripSwitcherOpen(false)} />}
      {ideaEditor && activeTrip && <IdeaEditor idea={ideaEditor} trip={activeTrip} mutateTrip={mutateActiveTrip} close={() => setIdeaEditor(null)} />}
    </div>
  );
}


function AuthPage() {
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setWorking(true);
    try {
      if (mode === "signUp") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || email.split("@")[0] } },
        });
        if (error) throw error;
        setMessage("Account created. Check your email to confirm, then sign in.");
        setMode("signIn");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setMessage(err.message || "Something went wrong.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="authShell">
      <section className="authCard">
        <div className="authLogo">✈️</div>
        <div className="eyebrow">Trip Studio</div>
        <h1>{mode === "signUp" ? "Create your account" : "Welcome back"}</h1>
        <p>Save trips to your account now. Next, we’ll connect shared trips, groups, voting, and collaboration.</p>
        <form className="authForm" onSubmit={handleSubmit}>
          {mode === "signUp" && <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {message && <div className="authMessage">{message}</div>}
          <button className="primaryBtn full" disabled={working}>{working ? "Working…" : mode === "signUp" ? "Create Account" : "Log In"}</button>
        </form>
        <button className="authSwitch" onClick={() => { setMessage(""); setMode(mode === "signUp" ? "signIn" : "signUp"); }}>
          {mode === "signUp" ? "Already have an account? Log in" : "New here? Create an account"}
        </button>
      </section>
    </main>
  );
}

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

function DesktopTopBar({ trips, activeTripId, setActiveTripId, page, setPage, addTrip, openSettings }) {
  return (
    <header className="desktopTop">
      <div className="brand"><span className="logo">✈️</span><div><b>Trip Studio</b><small>collaborative travel planning</small></div></div>
      <select value={activeTripId || ""} onChange={(e) => setActiveTripId(e.target.value)} className="tripSelect">
        <option value="" disabled>Select trip</option>
        {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <button className="iconBtn"><Bell size={18} /></button>
      <nav className="desktopNav">
        <button className={page === "planning" ? "active" : ""} onClick={() => setPage("planning")}>Planning</button>
        <button className={page === "logistics" ? "active" : ""} onClick={() => setPage("logistics")}>Logistics</button>
        <button className={page === "itinerary" ? "active" : ""} onClick={() => setPage("itinerary")}>Itinerary</button>
        <button className={page === "calendar" ? "active" : ""} onClick={() => setPage("calendar")}>Calendar</button>
      </nav>
      <button className="orangeBtn" onClick={addTrip}><Plus size={17} /> Add Trip</button>
      <button className="iconBtn" onClick={openSettings}><Settings size={18} /></button>
    </header>
  );
}
function MobileHero({ activeTrip, trips, openTripSwitcher, openTripEditor }) {
  return (
    <div className="mobileHero">
      <div className="mobileHeroCopy">
        <div className="eyebrow">Trip Studio</div>
        <button className="mobileTripTitle" onClick={openTripSwitcher} type="button">
          <span>{activeTrip?.name || "Plan your next trip"}</span>
          {trips.length > 0 && <em>⌄</em>}
        </button>
        {activeTrip && <p>{activeTrip.location || "Add location"} · {prettyDate(activeTrip.startDate)} – {prettyDate(activeTrip.endDate)}</p>}
      </div>
      {activeTrip && <button className="ghostBtn small" onClick={openTripEditor}>Edit</button>}
    </div>
  );
}
function TripControlStrip({ activeTrip, openTripEditor, autoBuild }) {
  return (
    <section className="controlStrip">
      <div className="tripMini"><span>{activeTrip.name}</span><small>{activeTrip.location || "No location yet"} · {prettyDate(activeTrip.startDate, { month: "short", day: "numeric" })}–{prettyDate(activeTrip.endDate, { month: "short", day: "numeric" })}</small></div>
      <button className="ghostBtn" onClick={openTripEditor}><Edit3 size={15} /> Edit</button>
      <button className="primaryBtn" onClick={autoBuild}><Wand2 size={16} /> Auto Build</button>
    </section>
  );
}
function EmptyState({ addTrip }) {
  return <section className="empty"><div className="emptyIcon">🌍</div><h2>Create your first trip</h2><p>Add dates, collect ideas, vote with friends, then turn everything into a clean itinerary.</p><button className="primaryBtn big" onClick={addTrip}><Plus /> Add Trip</button></section>;
}

function PlanningPage({ trip, mutateTrip, editIdea }) {
  const [quickAdd, setQuickAdd] = useState(null);
  const [form, setForm] = useState({ title: "", category: "breakfast", link: "", notes: "", date: "", time: "", period: "" });
  const dates = daysBetween(trip.startDate, trip.endDate);
  function openAdd(category) {
    setForm({ title: "", category, link: "", notes: "", date: "", time: "", period: "" });
    setQuickAdd(category);
  }
  function addIdea() {
    if (!form.title.trim()) return;
    const idea = {
      id: uid(),
      ...form,
      votes: 0,
      scheduledDate: form.date || "",
      scheduledTime: form.time || (form.date && form.period ? PERIOD_TIMES[form.period] : ""),
    };
    mutateTrip((t) => ({ ...t, ideas: [idea, ...t.ideas] }));
    setQuickAdd(null);
    setForm({ title: "", category: form.category, link: "", notes: "", date: "", time: "", period: "" });
  }
  function vote(id, delta) {
    mutateTrip((t) => ({ ...t, ideas: t.ideas.map((i) => i.id === id ? { ...i, votes: Math.max(0, (i.votes || 0) + delta) } : i) }));
  }
  return (
    <section className="pageStack planningMobilePolish">
      <div className="sectionHead appSectionHead">
        <div>
          <h2>Planning Board</h2>
          <p>Add ideas, vote, then turn the winners into an itinerary.</p>
        </div>
      </div>

      <div className="plannerTip">
        <div className="tipBulb">💡</div>
        <div><b>Start with categories</b><p>Add a few options to each bucket. Dates and times are optional until you are ready.</p></div>
      </div>

      <div className="categoryStack categoryCardsOnly">
        {CATEGORIES.map((cat) => {
          const items = trip.ideas.filter((i) => i.category === cat);
          const top = [...items].sort((a,b)=>(b.votes||0)-(a.votes||0))[0];
          return (
            <section className="planningCategoryCard" key={cat}>
              <button className="categoryAddRow" onClick={() => openAdd(cat)}>
                <div className="categoryIconBubble">{CATEGORY_EMOJIS[cat]}</div>
                <div className="categoryCopy">
                  <b>{CATEGORY_LABELS[cat]}</b>
                  <span>{CATEGORY_DESCRIPTIONS[cat]}</span>
                </div>
                <div className="categoryCount">{items.length}</div>
                <div className="plusBubble"><Plus size={19} /></div>
              </button>
              {items.length > 0 && (
                <div className="compactIdeaList">
                  {top && <div className="topPick"><span>Top pick</span><b>{top.title}</b><small>{top.votes || 0} vote{(top.votes || 0) === 1 ? "" : "s"}</small></div>}
                  {items.map((idea) => <IdeaCard key={idea.id} idea={idea} vote={vote} edit={() => editIdea(idea)} />)}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {quickAdd && (
        <Modal close={() => setQuickAdd(null)}>
          <div className="sheetKicker">Add to {CATEGORY_LABELS[quickAdd]}</div>
          <h2>{CATEGORY_EMOJIS[quickAdd]} New idea</h2>
          <input autoFocus placeholder="Place or plan name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="Link optional" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <textarea placeholder="Notes optional" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="fieldLabel">Optional schedule preference</div>
          <select value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}>
            <option value="">Any date</option>{dates.map((d) => <option value={d} key={d}>{prettyDate(d)}</option>)}
          </select>
          <div className="split2">
            <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value, time: "" })}>
              <option value="">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option>
            </select>
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value, period: "" })} />
          </div>
          <button className="primaryBtn full" onClick={addIdea}><Plus size={17} /> Add to Board</button>
        </Modal>
      )}
    </section>
  );
}
function IdeaCard({ idea, vote, edit }) {
  return <article className="ideaCard" onClick={edit}><div className="ideaMain"><b>{idea.title}</b><span>{idea.date ? prettyDate(idea.date) : "Flexible"} · {timeLabel(idea.time, idea.period)}</span>{idea.notes && <p>{idea.notes}</p>}</div><div className="votePill" onClick={(e) => e.stopPropagation()}><button onClick={() => vote(idea.id, -1)}>−</button><strong>{idea.votes || 0}</strong><button onClick={() => vote(idea.id, 1)}>＋</button></div></article>;
}

function ItineraryPage({ trip, editIdea }) {
  const dates = daysBetween(trip.startDate, trip.endDate);
  const scheduled = trip.ideas.filter((i) => i.scheduledDate).sort((a, b) => `${a.scheduledDate} ${a.scheduledTime || "99:99"}`.localeCompare(`${b.scheduledDate} ${b.scheduledTime || "99:99"}`));
  return <section className="pageStack"><div className="sectionHead"><div><h2>Itinerary</h2><p>A clean timeline for everything scheduled.</p></div></div>{scheduled.length === 0 && <div className="emptyMini">Nothing scheduled yet. Add fixed dates or hit Auto Build.</div>}{dates.map((d) => { const items = scheduled.filter((i) => i.scheduledDate === d); if (!items.length) return null; return <section className="dayTimeline" key={d}><div className="dayHeader"><span>{prettyDate(d, { weekday: "long", month: "short", day: "numeric" })}</span><small>{items.length} plans</small></div>{items.map((item) => <button className="timelineItem" key={item.id} onClick={() => editIdea(item)}><div className="timeRail"><span>{timeLabel(item.scheduledTime, item.period)}</span><i /></div><div className="timelineCard"><div className="pill">{CATEGORY_EMOJIS[item.category]} {CATEGORY_LABELS[item.category]}</div><h3>{item.title}</h3><p>{item.notes || item.link || "Tap to add notes, link, or change time."}</p><div className="metaLine"><span><Vote size={13} /> {item.votes || 0} votes</span>{item.link && <span><LinkIcon size={13} /> Link saved</span>}</div></div></button>)}</section>; })}</section>;
}

function CalendarPage({ trips, setActiveTripId, setPage }) {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const cells = [];
  for (let i = 0; i < 42; i++) cells.push(new Date(year, month, 1 - startOffset + i));
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return <section className="pageStack"><div className="calendarTop"><button className="iconBtn" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft /></button><h2>{monthLabel}</h2><button className="iconBtn" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight /></button></div><div className="realCalendar"><div className="weekday">Sun</div><div className="weekday">Mon</div><div className="weekday">Tue</div><div className="weekday">Wed</div><div className="weekday">Thu</div><div className="weekday">Fri</div><div className="weekday">Sat</div>{cells.map((date) => { const iso = date.toISOString().slice(0, 10); const dayTrips = trips.filter((t) => t.startDate <= iso && t.endDate >= iso); return <div key={iso} className={`calCell ${date.getMonth() !== month ? "muted" : ""}`}><span>{date.getDate()}</span>{dayTrips.slice(0, 2).map((t) => <button key={t.id} className="tripBar" onClick={() => { setActiveTripId(t.id); setPage("itinerary"); }}>{t.name}</button>)}</div>; })}</div></section>;
}

function LogisticsPage({ trip, mutateTrip }) {
  const [tab, setTab] = useState("hotels");
  const [expandedTraveler, setExpandedTraveler] = useState(null);
  const [expandedHotel, setExpandedHotel] = useState(null);
  function addHotel() {
    const hotel = { id: uid(), name: "", address: "", checkInDate: "", checkInTime: "", checkOutDate: "", checkOutTime: "", confirmation: "", notes: "" };
    mutateTrip((t) => ({ ...t, hotels: [...(t.hotels || []), hotel] }));
    setExpandedHotel(hotel.id);
  }
  function updateHotel(id, patch) { mutateTrip((t) => ({ ...t, hotels: (t.hotels || []).map((h) => h.id === id ? { ...h, ...patch } : h) })); }
  function deleteHotel(id) { mutateTrip((t) => ({ ...t, hotels: (t.hotels || []).filter((h) => h.id !== id) })); }
  function addTraveler() {
    const tr = { id: uid(), name: "New Traveler", flights: [] };
    mutateTrip((t) => ({ ...t, travelers: [...(t.travelers || []), tr] }));
    setExpandedTraveler(tr.id);
  }
  function updateTraveler(id, patch) { mutateTrip((t) => ({ ...t, travelers: (t.travelers || []).map((tr) => tr.id === id ? { ...tr, ...patch } : tr) })); }
  function deleteTraveler(id) { mutateTrip((t) => ({ ...t, travelers: (t.travelers || []).filter((tr) => tr.id !== id) })); }
  function addFlight(travelerId) {
    const traveler = (trip.travelers || []).find((tr) => tr.id === travelerId);
    updateTraveler(travelerId, { flights: [...((traveler?.flights) || []), { id: uid(), airline: "", flightNumber: "", from: "", to: "", departDate: "", departTime: "", arriveDate: "", arriveTime: "", confirmation: "", seat: "", notes: "" }] });
  }
  function updateFlight(travelerId, flightId, patch) {
    const traveler = (trip.travelers || []).find((tr) => tr.id === travelerId);
    updateTraveler(travelerId, { flights: (traveler?.flights || []).map((f) => f.id === flightId ? { ...f, ...patch } : f) });
  }
  function deleteFlight(travelerId, flightId) {
    const traveler = (trip.travelers || []).find((tr) => tr.id === travelerId);
    updateTraveler(travelerId, { flights: (traveler?.flights || []).filter((f) => f.id !== flightId) });
  }
  return <section className="pageStack logisticsPolish">
    <div className="sectionHead appSectionHead"><div><h2>Logistics</h2><p>Manage bookings and travel details.</p></div></div>
    <div className="segmented fancySegmented"><button className={tab === "hotels" ? "active" : ""} onClick={() => setTab("hotels")}><Hotel size={16} /> Hotels</button><button className={tab === "flights" ? "active" : ""} onClick={() => setTab("flights")}><Plane size={16} /> Flights</button></div>
    {tab === "hotels" ? (
      <div className="logisticsStack polishedLogisticsStack">
        {(trip.hotels || []).length === 0 ? <LogisticsEmpty icon={<Hotel />} title="No hotels added yet" text="Add your hotel details to keep everything in one place." action="Add Hotel" onAction={addHotel} /> : <button className="primaryBtn full" onClick={addHotel}><Plus size={17} /> Add Hotel</button>}
        {(trip.hotels || []).map((h) => <HotelCard key={h.id} hotel={h} expanded={expandedHotel === h.id} toggle={() => setExpandedHotel(expandedHotel === h.id ? null : h.id)} update={(p) => updateHotel(h.id, p)} del={() => deleteHotel(h.id)} />)}
        <div className="helperCard"><b>What to add</b><p>Hotel name, check-in/out, address, confirmation number, and notes.</p></div>
      </div>
    ) : (
      <div className="logisticsStack polishedLogisticsStack">
        {(trip.travelers || []).length === 0 ? <LogisticsEmpty icon={<Plane />} title="No travelers added yet" text="Add each traveler, then add one or more flight legs under their card." action="Add Traveler" onAction={addTraveler} /> : <button className="primaryBtn full" onClick={addTraveler}><Plus size={17} /> Add Traveler</button>}
        {(trip.travelers || []).map((tr) => <TravelerCard key={tr.id} traveler={tr} expanded={expandedTraveler === tr.id} setExpanded={() => setExpandedTraveler(expandedTraveler === tr.id ? null : tr.id)} update={(p) => updateTraveler(tr.id, p)} del={() => deleteTraveler(tr.id)} addFlight={() => addFlight(tr.id)} updateFlight={(flightId, p) => updateFlight(tr.id, flightId, p)} deleteFlight={(flightId) => deleteFlight(tr.id, flightId)} />)}
      </div>
    )}
  </section>;
}
function LogisticsEmpty({ icon, title, text, action, onAction }) {
  return <div className="logisticsEmpty"><div className="emptyCircle">{icon}</div><h3>{title}</h3><p>{text}</p><button className="primaryBtn full" onClick={onAction}><Plus size={17} /> {action}</button></div>;
}
function HotelCard({ hotel, expanded, toggle, update, del }) {
  const range = hotel.checkInDate || hotel.checkOutDate ? `${hotel.checkInDate ? prettyDate(hotel.checkInDate, { month: "short", day: "numeric" }) : "Check-in"} – ${hotel.checkOutDate ? prettyDate(hotel.checkOutDate, { month: "short", day: "numeric" }) : "Check-out"}` : "Add dates";
  return <div className="logSummaryCard hotelSummaryCard">
    <button className="summaryButton" onClick={toggle}>
      <div className="summaryIcon"><Hotel size={18} /></div>
      <div><b>{hotel.name || "Hotel details"}</b><span>{range}</span>{hotel.address && <small>{hotel.address}</small>}</div>
      <span className="summaryChevron">{expanded ? "Close" : "Edit"}</span>
    </button>
    {expanded && <div className="summaryDrawer">
      <input placeholder="Hotel name" value={hotel.name} onChange={(e) => update({ name: e.target.value })} />
      <input placeholder="Address" value={hotel.address} onChange={(e) => update({ address: e.target.value })} />
      <div className="fieldLabel">Check-in</div><div className="split2"><input type="date" value={hotel.checkInDate} onChange={(e) => update({ checkInDate: e.target.value })} /><input type="time" value={hotel.checkInTime} onChange={(e) => update({ checkInTime: e.target.value })} /></div>
      <div className="fieldLabel">Check-out</div><div className="split2"><input type="date" value={hotel.checkOutDate} onChange={(e) => update({ checkOutDate: e.target.value })} /><input type="time" value={hotel.checkOutTime} onChange={(e) => update({ checkOutTime: e.target.value })} /></div>
      <input placeholder="Confirmation number" value={hotel.confirmation} onChange={(e) => update({ confirmation: e.target.value })} />
      <textarea placeholder="Notes" value={hotel.notes} onChange={(e) => update({ notes: e.target.value })} />
      <button className="textDanger" onClick={del}>Delete hotel</button>
    </div>}
  </div>;
}
function TravelerCard({ traveler, expanded, setExpanded, update, del, addFlight, updateFlight, deleteFlight }) {
  const firstFlight = traveler.flights?.[0];
  const route = firstFlight?.from || firstFlight?.to ? `${firstFlight.from || "?"} → ${firstFlight.to || "?"}` : "Add flight route";
  return <div className="logSummaryCard travelerCard">
    <button className="summaryButton" onClick={setExpanded}>
      <div className="summaryIcon"><Plane size={18} /></div>
      <div><b>{traveler.name || "Traveler"}</b><span>{traveler.flights.length} flight{traveler.flights.length === 1 ? "" : "s"}</span><small>{route}</small></div>
      <span className="summaryChevron">{expanded ? "Close" : "Open"}</span>
    </button>
    {expanded && <div className="summaryDrawer">
      <input value={traveler.name} onChange={(e) => update({ name: e.target.value })} />
      <button className="primaryBtn full" onClick={addFlight}><Plus size={16} /> Add Flight Leg</button>
      {traveler.flights.length === 0 && <div className="softEmpty">No flight legs yet</div>}
      {traveler.flights.map((f, idx) => <FlightLeg key={f.id} index={idx + 1} flight={f} update={(p) => updateFlight(f.id, p)} del={() => deleteFlight(f.id)} />)}
      <button className="textDanger" onClick={del}>Delete traveler</button>
    </div>}
  </div>;
}
function FlightLeg({ flight, index, update, del }) {
  return <div className="flightLeg"><div className="flightLegHeader"><b>Flight leg {index}</b><button className="iconBtn danger" onClick={del}><Trash2 size={15} /></button></div><div className="split2"><input placeholder="Airline" value={flight.airline} onChange={(e) => update({ airline: e.target.value })} /><input placeholder="Flight #" value={flight.flightNumber} onChange={(e) => update({ flightNumber: e.target.value })} /></div><div className="split2"><input placeholder="From" value={flight.from} onChange={(e) => update({ from: e.target.value })} /><input placeholder="To" value={flight.to} onChange={(e) => update({ to: e.target.value })} /></div><div className="fieldLabel">Departure</div><div className="split2"><input type="date" value={flight.departDate} onChange={(e) => update({ departDate: e.target.value })} /><input type="time" value={flight.departTime} onChange={(e) => update({ departTime: e.target.value })} /></div><div className="fieldLabel">Arrival</div><div className="split2"><input type="date" value={flight.arriveDate} onChange={(e) => update({ arriveDate: e.target.value })} /><input type="time" value={flight.arriveTime} onChange={(e) => update({ arriveTime: e.target.value })} /></div><div className="split2"><input placeholder="Conf #" value={flight.confirmation} onChange={(e) => update({ confirmation: e.target.value })} /><input placeholder="Seat" value={flight.seat} onChange={(e) => update({ seat: e.target.value })} /></div><textarea placeholder="Notes" value={flight.notes || ""} onChange={(e) => update({ notes: e.target.value })} /></div>;
}

function MobileBottomNav({ page, setPage, addTrip }) { const item = (id, label, Icon) => <button className={page === id ? "active" : ""} onClick={() => setPage(id)}><Icon size={19} /><span>{label}</span></button>; return <nav className="mobileNav">{item("planning", "Planning", ListTodo)}{item("logistics", "Logistics", ClipboardList)}<button className="addRound" onClick={addTrip}><Plus size={28} /></button>{item("itinerary", "Itinerary", CalendarRange)}{item("calendar", "Calendar", CalendarDays)}</nav>; }

function TripSwitcher({ trips, activeTripId, selectTrip, addTrip, close }) {
  return (
    <Modal close={close}>
      <div className="sheetKicker">Trip Studio</div>
      <h2>Switch trip</h2>
      <div className="tripSwitchList">
        {trips.length === 0 && <div className="softEmpty">No trips yet</div>}
        {trips.map((trip) => (
          <button key={trip.id} className={`tripSwitchItem ${trip.id === activeTripId ? "active" : ""}`} onClick={() => selectTrip(trip.id)} type="button">
            <div>
              <b>{trip.name}</b>
              <span>{trip.location || "No location yet"} · {prettyDate(trip.startDate)} – {prettyDate(trip.endDate)}</span>
            </div>
            <strong>{trip.id === activeTripId ? "Selected" : "Open"}</strong>
          </button>
        ))}
      </div>
      <button className="primaryBtn full" onClick={addTrip}><Plus size={17} /> Add New Trip</button>
    </Modal>
  );
}

function TripEditor({ trip, save, deleteTrip, close }) { const [draft, setDraft] = useState({ name: trip.name, location: trip.location, startDate: trip.startDate, endDate: trip.endDate }); return <Modal close={close}><h2>Edit Trip</h2><input placeholder="Trip name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><input placeholder="Location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /><div className="split2"><input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /><input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></div><button className="primaryBtn full" onClick={() => { save(draft); close(); }}>Save Trip</button><button className="textDanger" onClick={() => { deleteTrip(); close(); }}>Delete Trip</button></Modal>; }
function IdeaEditor({ idea, trip, mutateTrip, close }) { const [draft, setDraft] = useState(idea); const dates = daysBetween(trip.startDate, trip.endDate); function save() { mutateTrip((t) => ({ ...t, ideas: t.ideas.map((i) => i.id === idea.id ? { ...draft, scheduledDate: draft.scheduledDate || draft.date, scheduledTime: draft.scheduledTime || draft.time || PERIOD_TIMES[draft.period] || "" } : i) })); close(); } function del() { mutateTrip((t) => ({ ...t, ideas: t.ideas.filter((i) => i.id !== idea.id) })); close(); } return <Modal close={close}><h2>Edit Plan</h2><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select><input placeholder="Link" value={draft.link || ""} onChange={(e) => setDraft({ ...draft, link: e.target.value })} /><textarea placeholder="Notes" value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /><select value={draft.scheduledDate || draft.date || ""} onChange={(e) => setDraft({ ...draft, scheduledDate: e.target.value, date: e.target.value })}><option value="">Unscheduled</option>{dates.map((d) => <option key={d} value={d}>{prettyDate(d)}</option>)}</select><div className="split2"><select value={draft.period || ""} onChange={(e) => setDraft({ ...draft, period: e.target.value, scheduledTime: PERIOD_TIMES[e.target.value] || "", time: "" })}><option value="">Flexible</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select><input type="time" value={draft.scheduledTime || draft.time || ""} onChange={(e) => setDraft({ ...draft, scheduledTime: e.target.value, time: e.target.value, period: "" })} /></div><button className="primaryBtn full" onClick={save}>Save Plan</button><button className="textDanger" onClick={del}>Delete Plan</button></Modal>; }
function SettingsModal({ theme, setTheme, user, signOut, close }) {
  return <Modal close={close}><h2>Settings</h2><div className="segmented"><button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}><Sun size={16} /> Light</button><button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}><Moon size={16} /> Dark</button></div><div className="profileBox"><User /><div><b>Profile</b><p>{user?.email || "Signed in"}</p><small>Your full public profile, followers, saved trips, and groups will live here later.</small></div></div><button className="ghostBtn full" onClick={signOut}>Sign Out</button></Modal>;
}
function Modal({ children, close }) { return <div className="modalBackdrop" onMouseDown={close}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="closeBtn" onClick={close}><X /></button>{children}</div></div>; }
function defaultTimeForCategory(category) { return category === "breakfast" ? "09:30" : category === "lunch" ? "12:30" : category === "dinner" ? "19:30" : category === "drinks" ? "21:00" : "14:00"; }

const css = `
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer}.app{min-height:100vh;color:var(--text);background:radial-gradient(circle at top left,var(--glow),transparent 38%),linear-gradient(135deg,var(--bg1),var(--bg2));padding-bottom:112px}.dark{--bg1:#050b17;--bg2:#142034;--panel:rgba(255,255,255,.075);--panel2:rgba(255,255,255,.105);--text:#f8fafc;--muted:#aeb8ca;--line:rgba(255,255,255,.13);--input:rgba(255,255,255,.095);--glow:rgba(249,115,22,.24);--chip:rgba(255,255,255,.09);--shadow:rgba(0,0,0,.22)}.light{--bg1:#fff7ed;--bg2:#eaf3ff;--panel:rgba(255,255,255,.76);--panel2:#fff;--text:#172033;--muted:#607089;--line:rgba(27,37,59,.12);--input:rgba(255,255,255,.82);--glow:rgba(249,115,22,.18);--chip:#f2f5fa;--shadow:rgba(25,34,50,.11)}.shell{width:min(1120px,100%);margin:0 auto;padding:18px}.desktopTop{display:none}.mobileHero{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:14px 2px 8px}.mobileHeroCopy{min-width:0;flex:1}.mobileTripTitle{border:0;background:transparent;color:var(--text);padding:0;margin:5px 0 8px;display:flex;align-items:center;gap:8px;max-width:100%;text-align:left}.mobileTripTitle span{font-size:31px;line-height:1;letter-spacing:-.03em;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mobileTripTitle em{font-style:normal;color:#fb923c;font-size:22px;line-height:1;transform:translateY(-1px)}.eyebrow{color:#fb923c;text-transform:uppercase;font-weight:950;font-size:11px;letter-spacing:.16em}.mobileHero h1{font-size:31px;line-height:1;margin:5px 0 8px;letter-spacing:-.03em}.mobileHero p{margin:0;color:var(--muted);font-size:13px}.controlStrip{position:sticky;top:8px;z-index:5;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin:8px 0 18px;padding:14px;border:1px solid var(--line);background:color-mix(in srgb,var(--panel2) 76%,transparent);backdrop-filter:blur(20px);border-radius:26px;box-shadow:0 18px 45px var(--shadow)}.tripMini{min-width:0}.tripMini span{display:block;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tripMini small{display:block;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.controlStrip .primaryBtn{grid-column:1/-1}.primaryBtn,.orangeBtn{border:0;border-radius:999px;background:linear-gradient(135deg,#ff9d3d,#ff6b12);color:#fff;font-weight:950;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 15px;box-shadow:0 14px 28px rgba(249,115,22,.26)}.ghostBtn,.iconBtn{border:1px solid var(--line);background:var(--chip);color:var(--text);border-radius:999px;padding:10px 12px;display:inline-flex;align-items:center;justify-content:center;gap:7px}.small{font-size:12px;padding:8px 10px}.big{font-size:16px;padding:14px 18px}.full{width:100%}.pageStack{display:flex;flex-direction:column;gap:16px}.appSectionHead h2,.sectionHead h2{font-size:28px;letter-spacing:-.035em;margin:0 0 6px}.appSectionHead p,.sectionHead p{margin:0;color:var(--muted);font-size:15px;line-height:1.35}.addCard,.categoryBlock,.logCard,.travelerCard,.dayTimeline,.empty,.emptyMini,.planningCategoryCard,.logSummaryCard,.helperCard{border:1px solid var(--line);background:var(--panel);border-radius:26px;box-shadow:0 18px 45px var(--shadow);backdrop-filter:blur(18px)}input,select,textarea{width:100%;max-width:100%;min-width:0;border:1px solid var(--line);background:var(--input);color:var(--text);border-radius:18px;padding:13px 14px;outline:none;display:block;box-sizing:border-box}input[type="date"],input[type="time"]{width:100%;max-width:100%;min-width:0;-webkit-appearance:none;appearance:none}textarea{min-height:92px;resize:vertical}.split2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;width:100%;max-width:100%;min-width:0;overflow:hidden}.fieldLabel{font-size:12px;font-weight:950;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin:2px 0 -5px}.plannerTip{display:flex;gap:12px;align-items:flex-start;border:1px solid rgba(251,146,60,.22);background:linear-gradient(135deg,rgba(251,146,60,.14),rgba(255,255,255,.055));border-radius:24px;padding:15px}.tipBulb{font-size:26px}.plannerTip b{display:block}.plannerTip p{margin:4px 0 0;color:var(--muted);font-size:13px;line-height:1.35}.categoryStack{display:flex;flex-direction:column;gap:14px}.planningCategoryCard{padding:0;overflow:hidden}.categoryAddRow{width:100%;border:0;background:transparent;color:var(--text);padding:15px;display:grid;grid-template-columns:44px 1fr auto 44px;gap:12px;align-items:center;text-align:left}.categoryIconBubble,.summaryIcon,.emptyCircle{width:44px;height:44px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(255,255,255,.13),rgba(255,255,255,.06));border:1px solid var(--line);font-size:22px}.categoryCopy b{display:block;font-size:18px;letter-spacing:-.02em}.categoryCopy span{display:block;color:var(--muted);font-size:12px;margin-top:3px}.categoryCount{min-width:27px;height:27px;border-radius:999px;display:grid;place-items:center;background:var(--chip);color:var(--muted);font-weight:950;font-size:12px}.plusBubble{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.12);border:1px solid var(--line);color:var(--text)}.compactIdeaList{border-top:1px solid var(--line);padding:12px 12px 14px}.topPick{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:10px 12px;margin-bottom:8px;border-radius:17px;background:linear-gradient(135deg,rgba(251,146,60,.14),rgba(255,255,255,.06))}.topPick span{font-size:10px;color:#fb923c;text-transform:uppercase;font-weight:950;letter-spacing:.08em}.topPick b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.topPick small{font-size:11px;color:var(--muted)}.ideaCard{border:1px solid var(--line);background:var(--panel2);border-radius:20px;padding:12px;display:flex;gap:12px;align-items:center;margin-top:8px;text-align:left;color:var(--text);width:100%}.ideaMain{flex:1;min-width:0}.ideaMain b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ideaMain span,.ideaMain p{display:block;color:var(--muted);font-size:12px;margin:4px 0 0}.votePill{display:grid;grid-template-columns:26px 24px 26px;align-items:center;background:var(--chip);border-radius:999px;padding:4px}.votePill button{border:0;background:transparent;color:var(--text);font-weight:950}.votePill strong{text-align:center;font-size:12px}.sheetKicker{color:#fb923c;text-transform:uppercase;font-weight:950;letter-spacing:.12em;font-size:11px}.dayHeader{display:flex;justify-content:space-between;align-items:end;margin-bottom:13px}.dayHeader span{font-size:18px;font-weight:950}.dayHeader small{color:var(--muted)}.timelineItem{width:100%;display:grid;grid-template-columns:74px 1fr;gap:10px;border:0;background:transparent;color:var(--text);text-align:left;padding:0;margin:0 0 12px}.timeRail{display:flex;flex-direction:column;align-items:flex-end;gap:8px;color:#fb923c;font-size:12px;font-weight:900;padding-top:10px}.timeRail i{width:2px;flex:1;min-height:58px;background:linear-gradient(#fb923c,transparent);border-radius:999px}.timelineCard{background:var(--panel2);border:1px solid var(--line);border-radius:24px;padding:14px}.pill{display:inline-flex;background:var(--chip);border-radius:999px;padding:5px 9px;color:var(--muted);font-size:11px;font-weight:900}.timelineCard h3{margin:9px 0 5px;font-size:17px}.timelineCard p{margin:0;color:var(--muted);font-size:13px;line-height:1.35}.metaLine{display:flex;gap:11px;margin-top:11px;color:var(--muted);font-size:12px}.metaLine span{display:flex;align-items:center;gap:4px}.calendarTop{display:flex;align-items:center;justify-content:space-between}.calendarTop h2{margin:0}.realCalendar{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}.weekday{font-size:11px;color:var(--muted);text-align:center;font-weight:900}.calCell{min-height:78px;border:1px solid var(--line);background:var(--panel);border-radius:15px;padding:7px;overflow:hidden}.calCell>span{font-size:12px;color:var(--muted);font-weight:900}.calCell.muted{opacity:.42}.tripBar{width:100%;border:0;background:linear-gradient(135deg,#fb923c,#ec4899);color:white;border-radius:999px;padding:4px 6px;font-size:10px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.segmented{display:grid;grid-template-columns:1fr 1fr;background:var(--chip);padding:5px;border-radius:999px;gap:5px}.segmented button{border:0;border-radius:999px;background:transparent;color:var(--muted);font-weight:950;padding:11px;display:flex;align-items:center;justify-content:center;gap:7px}.segmented button.active{background:linear-gradient(135deg,rgba(251,146,60,.28),rgba(255,255,255,.08));color:var(--text);box-shadow:0 8px 20px rgba(0,0,0,.1)}.fancySegmented{margin-top:-2px}.logisticsStack,.polishedLogisticsStack{display:flex;flex-direction:column;gap:14px}.logisticsEmpty{text-align:center;border:1px dashed var(--line);background:linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.035));border-radius:26px;padding:28px 24px;display:grid;justify-items:center;gap:10px}.logisticsEmpty h3{margin:4px 0 0;font-size:20px}.logisticsEmpty p{margin:0 0 9px;color:var(--muted);line-height:1.35}.logisticsEmpty .emptyCircle{width:62px;height:62px;border-radius:50%;font-size:24px;color:var(--muted)}.logSummaryCard{overflow:hidden}.summaryButton{width:100%;border:0;background:transparent;color:var(--text);display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:12px;text-align:left;padding:14px}.summaryButton b{display:block;font-size:17px}.summaryButton span,.summaryButton small{display:block;color:var(--muted);font-size:12px;margin-top:3px}.summaryChevron{border:1px solid var(--line);border-radius:999px;padding:7px 10px!important;font-weight:950;color:var(--text)!important;background:var(--chip)}.summaryDrawer{border-top:1px solid var(--line);padding:14px;display:grid;gap:10px;width:100%;max-width:100%;min-width:0;overflow:hidden}.helperCard{padding:18px}.helperCard b{font-size:16px}.helperCard p{color:var(--muted);margin:6px 0 0;font-size:13px;line-height:1.4}.flightLeg{border:1px solid var(--line);background:var(--panel2);border-radius:22px;padding:12px;display:grid;gap:10px}.flightLegHeader{display:flex;justify-content:space-between;align-items:center}.danger{color:#fb7185}.textDanger{border:0;background:transparent;color:#fb7185;font-weight:900;padding:10px}.softEmpty{border:1px dashed var(--line);border-radius:20px;padding:18px;text-align:center;color:var(--muted)}.empty{text-align:center;padding:42px 20px}.emptyIcon{font-size:44px}.empty h2{font-size:28px;margin:9px 0}.empty p{color:var(--muted);max-width:430px;margin:0 auto 20px}.emptyMini{text-align:center;color:var(--muted);padding:18px}.mobileNav{position:fixed;left:12px;right:12px;bottom:14px;z-index:30;height:76px;display:grid;grid-template-columns:1fr 1fr 70px 1fr 1fr;align-items:center;gap:6px;padding:8px;border:1px solid var(--line);background:color-mix(in srgb,var(--panel2) 86%,transparent);backdrop-filter:blur(22px);border-radius:28px;box-shadow:0 18px 50px rgba(0,0,0,.25)}.mobileNav button{border:0;background:transparent;color:var(--muted);display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-weight:900}.mobileNav button.active{color:#fb923c}.mobileNav .addRound{width:58px;height:58px;border-radius:22px;background:linear-gradient(135deg,#fb923c,#f97316);color:white;justify-self:center;align-self:center;display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;line-height:0!important;box-shadow:0 12px 25px rgba(249,115,22,.33)}.mobileNav .addRound svg{display:block;transform:translateY(1px);margin:0}.tripSwitchList{display:grid;gap:10px}.tripSwitchItem{width:100%;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:22px;padding:14px;display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;text-align:left}.tripSwitchItem.active{border-color:rgba(251,146,60,.5);background:linear-gradient(135deg,rgba(251,146,60,.18),rgba(255,255,255,.06))}.tripSwitchItem b{display:block;font-size:16px}.tripSwitchItem span{display:block;color:var(--muted);font-size:12px;margin-top:4px}.tripSwitchItem strong{font-size:11px;color:#fb923c;text-transform:uppercase;letter-spacing:.08em}.modalBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:end center;z-index:60;padding:14px}.modal{width:min(560px,100%);max-height:86vh;overflow:auto;background:linear-gradient(145deg,var(--bg1),var(--bg2));border:1px solid var(--line);border-radius:30px;padding:20px;display:grid;gap:12px;color:var(--text);box-shadow:0 30px 80px rgba(0,0,0,.35)}.closeBtn{justify-self:end;border:0;background:var(--chip);color:var(--text);border-radius:999px;width:36px;height:36px}.modal h2{margin:0}.profileBox{display:flex;gap:12px;border:1px solid var(--line);border-radius:22px;padding:14px;background:var(--panel)}.profileBox p{margin:4px 0 0;color:var(--muted)}

.authShell{min-height:100vh;display:grid;place-items:center;padding:24px}.authCard{width:min(430px,100%);border:1px solid var(--line);background:var(--panel);border-radius:34px;padding:26px;box-shadow:0 28px 80px rgba(0,0,0,.34);backdrop-filter:blur(22px);text-align:left}.authLogo{width:58px;height:58px;border-radius:22px;background:linear-gradient(135deg,#fb923c,#ec4899);display:grid;place-items:center;font-size:28px;margin-bottom:18px;box-shadow:0 18px 34px rgba(249,115,22,.28)}.authCard h1{font-size:34px;line-height:1;margin:6px 0 10px}.authCard p{color:var(--muted);line-height:1.45;margin:0 0 20px}.authForm{display:grid;gap:12px}.authMessage{border:1px solid var(--line);background:var(--chip);border-radius:18px;padding:12px;color:var(--muted);font-size:13px}.authSwitch{width:100%;border:0;background:transparent;color:#fb923c;font-weight:900;margin-top:14px;padding:10px}.primaryBtn:disabled{opacity:.65;cursor:not-allowed}.profileBox small{display:block;margin-top:4px;color:var(--muted);line-height:1.35}

@media (min-width: 820px){.app{padding-bottom:40px}.desktopTop{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:12px;padding:14px 22px;background:color-mix(in srgb,var(--panel2) 80%,transparent);backdrop-filter:blur(22px);border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:10px;margin-right:auto}.brand small{display:block;color:var(--muted);font-size:11px}.logo{width:38px;height:38px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,#fb923c,#ec4899)}.tripSelect{width:190px}.desktopNav{display:flex;gap:6px;background:var(--chip);border-radius:999px;padding:5px}.desktopNav button{border:0;border-radius:999px;background:transparent;color:var(--muted);font-weight:900;padding:9px 12px}.desktopNav button.active{background:var(--panel2);color:var(--text)}.mobileHero,.mobileNav{display:none}.shell{padding:28px}.controlStrip{top:80px;grid-template-columns:1fr auto auto}.controlStrip .primaryBtn{grid-column:auto}.categoryStack{display:grid;grid-template-columns:repeat(2,1fr);align-items:start}.pageStack{gap:20px}.realCalendar{gap:8px}.calCell{min-height:122px;border-radius:20px}.timelineItem{grid-template-columns:110px 1fr}.timelineCard h3{font-size:20px}.logisticsStack{display:grid;grid-template-columns:repeat(2,1fr);align-items:start}.modalBackdrop{place-items:center}}
@media (max-width: 430px){.shell{padding:14px}.mobileTripTitle span{font-size:27px}.split2{grid-template-columns:minmax(0,1fr);width:100%;max-width:100%;overflow:hidden}.calCell{min-height:70px;padding:5px;border-radius:12px}.tripBar{font-size:9px}.categoryAddRow{grid-template-columns:40px 1fr auto 40px;padding:14px 13px}.categoryIconBubble{width:40px;height:40px}.plusBubble{width:38px;height:38px}.summaryButton{grid-template-columns:40px 1fr auto}.summaryChevron{font-size:11px;padding:7px 8px!important}}
`;
