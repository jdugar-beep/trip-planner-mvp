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
  const [ideaEditor, setIdeaEditor] = useState(null);

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
        <MobileHero activeTrip={activeTrip} openTripEditor={() => setTripEditorOpen(true)} />
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
      {settingsOpen && <SettingsModal theme={theme} setTheme={setTheme} close={() => setSettingsOpen(false)} />}
      {tripEditorOpen && activeTrip && <TripEditor trip={activeTrip} save={(patch) => updateTrip(activeTrip.id, patch)} deleteTrip={() => deleteTrip(activeTrip.id)} close={() => setTripEditorOpen(false)} />}
      {ideaEditor && activeTrip && <IdeaEditor idea={ideaEditor} trip={activeTrip} mutateTrip={mutateActiveTrip} close={() => setIdeaEditor(null)} />}
    </div>
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
function MobileHero({ activeTrip, openTripEditor }) {
  return (
    <div className="mobileHero">
      <div><div className="eyebrow">Trip Studio</div><h1>{activeTrip?.name || "Plan your next trip"}</h1>{activeTrip && <p>{activeTrip.location || "Add location"} · {prettyDate(activeTrip.startDate)} – {prettyDate(activeTrip.endDate)}</p>}</div>
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
  const [form, setForm] = useState({ title: "", category: "breakfast", link: "", notes: "", date: "", time: "", period: "" });
  const dates = daysBetween(trip.startDate, trip.endDate);
  function addIdea() {
    if (!form.title.trim()) return;
    const idea = { id: uid(), ...form, votes: 0, scheduledDate: form.date || "", scheduledTime: form.time || (form.date && form.period ? PERIOD_TIMES[form.period] : "") };
    mutateTrip((t) => ({ ...t, ideas: [idea, ...t.ideas] }));
    setForm({ title: "", category: form.category, link: "", notes: "", date: "", time: "", period: "" });
  }
  function vote(id, delta) {
    mutateTrip((t) => ({ ...t, ideas: t.ideas.map((i) => i.id === id ? { ...i, votes: Math.max(0, (i.votes || 0) + delta) } : i) }));
  }
  return (
    <section className="pageStack">
      <div className="sectionHead"><div><h2>Planning Board</h2><p>Add options by category. Vote now, schedule later.</p></div></div>
      <div className="addCard">
        <div className="formGrid">
          <input placeholder="Add a place or plan" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_EMOJIS[c]} {CATEGORY_LABELS[c]}</option>)}</select>
          <input placeholder="Link optional" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <input placeholder="Notes optional" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <select value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}><option value="">Any date</option>{dates.map((d) => <option value={d} key={d}>{prettyDate(d)}</option>)}</select>
          <div className="split2"><select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value, time: "" })}><option value="">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select><input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value, period: "" })} /></div>
        </div>
        <button className="primaryBtn full" onClick={addIdea}><Plus size={17} /> Add to Board</button>
      </div>
      <div className="categoryStack">
        {CATEGORIES.map((cat) => {
          const items = trip.ideas.filter((i) => i.category === cat);
          return (
            <section className="categoryBlock" key={cat}>
              <div className="categoryTitle"><span>{CATEGORY_EMOJIS[cat]}</span><b>{CATEGORY_LABELS[cat]}</b><small>{items.length} ideas</small></div>
              {items.length === 0 ? <div className="softEmpty">No ideas yet</div> : items.map((idea) => <IdeaCard key={idea.id} idea={idea} vote={vote} edit={() => editIdea(idea)} />)}
            </section>
          );
        })}
      </div>
    </section>
  );
}
function IdeaCard({ idea, vote, edit }) {
  return <article className="ideaCard" onClick={edit}><div className="ideaMain"><b>{idea.title}</b><span>{idea.date ? prettyDate(idea.date) : "Flexible"} · {timeLabel(idea.time, idea.period)}</span>{idea.notes && <p>{idea.notes}</p>}</div><div className="voteBox" onClick={(e) => e.stopPropagation()}><button onClick={() => vote(idea.id, 1)}>＋</button><strong>{idea.votes || 0}</strong><button onClick={() => vote(idea.id, -1)}>−</button></div></article>;
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
  function addHotel() { mutateTrip((t) => ({ ...t, hotels: [...(t.hotels || []), { id: uid(), name: "", address: "", checkInDate: "", checkInTime: "", checkOutDate: "", checkOutTime: "", confirmation: "", notes: "" }] })); }
  function updateHotel(id, patch) { mutateTrip((t) => ({ ...t, hotels: t.hotels.map((h) => h.id === id ? { ...h, ...patch } : h) })); }
  function deleteHotel(id) { mutateTrip((t) => ({ ...t, hotels: t.hotels.filter((h) => h.id !== id) })); }
  function addTraveler() { const tr = { id: uid(), name: "New Traveler", flights: [] }; mutateTrip((t) => ({ ...t, travelers: [...(t.travelers || []), tr] })); setExpandedTraveler(tr.id); }
  function updateTraveler(id, patch) { mutateTrip((t) => ({ ...t, travelers: t.travelers.map((tr) => tr.id === id ? { ...tr, ...patch } : tr) })); }
  function deleteTraveler(id) { mutateTrip((t) => ({ ...t, travelers: t.travelers.filter((tr) => tr.id !== id) })); }
  function addFlight(travelerId) { updateTraveler(travelerId, { flights: [...((trip.travelers.find((tr) => tr.id === travelerId)?.flights) || []), { id: uid(), airline: "", flightNumber: "", from: "", to: "", departDate: "", departTime: "", arriveDate: "", arriveTime: "", confirmation: "", seat: "", notes: "" }] }); }
  function updateFlight(travelerId, flightId, patch) { const traveler = trip.travelers.find((tr) => tr.id === travelerId); updateTraveler(travelerId, { flights: traveler.flights.map((f) => f.id === flightId ? { ...f, ...patch } : f) }); }
  return <section className="pageStack"><div className="sectionHead"><div><h2>Logistics</h2><p>Hotels and flights, organized by what you need.</p></div></div><div className="segmented"><button className={tab === "hotels" ? "active" : ""} onClick={() => setTab("hotels")}><Hotel size={16} /> Hotels</button><button className={tab === "flights" ? "active" : ""} onClick={() => setTab("flights")}><Plane size={16} /> Flights</button></div>{tab === "hotels" ? <div className="logisticsStack"><button className="primaryBtn full" onClick={addHotel}><Plus size={17} /> Add Hotel</button>{(trip.hotels || []).map((h) => <HotelCard key={h.id} hotel={h} update={(p) => updateHotel(h.id, p)} del={() => deleteHotel(h.id)} />)}</div> : <div className="logisticsStack"><button className="primaryBtn full" onClick={addTraveler}><Plus size={17} /> Add Traveler</button>{(trip.travelers || []).map((tr) => <TravelerCard key={tr.id} traveler={tr} expanded={expandedTraveler === tr.id} setExpanded={() => setExpandedTraveler(expandedTraveler === tr.id ? null : tr.id)} update={(p) => updateTraveler(tr.id, p)} del={() => deleteTraveler(tr.id)} addFlight={() => addFlight(tr.id)} updateFlight={(flightId, p) => updateFlight(tr.id, flightId, p)} />)}</div>}</section>;
}
function HotelCard({ hotel, update, del }) { return <div className="logCard"><div className="cardTop"><input placeholder="Hotel name" value={hotel.name} onChange={(e) => update({ name: e.target.value })} /><button className="iconBtn danger" onClick={del}><Trash2 size={16} /></button></div><input placeholder="Address" value={hotel.address} onChange={(e) => update({ address: e.target.value })} /><div className="split2"><input type="date" value={hotel.checkInDate} onChange={(e) => update({ checkInDate: e.target.value })} /><input type="time" value={hotel.checkInTime} onChange={(e) => update({ checkInTime: e.target.value })} /></div><div className="split2"><input type="date" value={hotel.checkOutDate} onChange={(e) => update({ checkOutDate: e.target.value })} /><input type="time" value={hotel.checkOutTime} onChange={(e) => update({ checkOutTime: e.target.value })} /></div><input placeholder="Confirmation number" value={hotel.confirmation} onChange={(e) => update({ confirmation: e.target.value })} /><textarea placeholder="Notes" value={hotel.notes} onChange={(e) => update({ notes: e.target.value })} /></div>; }
function TravelerCard({ traveler, expanded, setExpanded, update, del, addFlight, updateFlight }) { return <div className="travelerCard"><div className="travelerSummary" onClick={setExpanded}><div><input onClick={(e) => e.stopPropagation()} value={traveler.name} onChange={(e) => update({ name: e.target.value })} /><small>{traveler.flights.length} flight{traveler.flights.length === 1 ? "" : "s"}</small></div><button className="ghostBtn small">{expanded ? "Close" : "Open"}</button></div>{expanded && <div className="flightDrawer"><button className="primaryBtn full" onClick={addFlight}><Plus size={16} /> Add Flight Leg</button>{traveler.flights.map((f) => <FlightLeg key={f.id} flight={f} update={(p) => updateFlight(f.id, p)} />)}<button className="textDanger" onClick={del}>Delete traveler</button></div>}</div>; }
function FlightLeg({ flight, update }) { return <div className="flightLeg"><div className="split2"><input placeholder="Airline" value={flight.airline} onChange={(e) => update({ airline: e.target.value })} /><input placeholder="Flight #" value={flight.flightNumber} onChange={(e) => update({ flightNumber: e.target.value })} /></div><div className="split2"><input placeholder="From" value={flight.from} onChange={(e) => update({ from: e.target.value })} /><input placeholder="To" value={flight.to} onChange={(e) => update({ to: e.target.value })} /></div><div className="split2"><input type="date" value={flight.departDate} onChange={(e) => update({ departDate: e.target.value })} /><input type="time" value={flight.departTime} onChange={(e) => update({ departTime: e.target.value })} /></div><div className="split2"><input placeholder="Conf #" value={flight.confirmation} onChange={(e) => update({ confirmation: e.target.value })} /><input placeholder="Seat" value={flight.seat} onChange={(e) => update({ seat: e.target.value })} /></div></div>; }

function MobileBottomNav({ page, setPage, addTrip }) { const item = (id, label, Icon) => <button className={page === id ? "active" : ""} onClick={() => setPage(id)}><Icon size={19} /><span>{label}</span></button>; return <nav className="mobileNav">{item("planning", "Planning", ListTodo)}{item("logistics", "Logistics", ClipboardList)}<button className="addRound" onClick={addTrip}><Plus size={28} /></button>{item("itinerary", "Itinerary", CalendarRange)}{item("calendar", "Calendar", CalendarDays)}</nav>; }

function TripEditor({ trip, save, deleteTrip, close }) { const [draft, setDraft] = useState({ name: trip.name, location: trip.location, startDate: trip.startDate, endDate: trip.endDate }); return <Modal close={close}><h2>Edit Trip</h2><input placeholder="Trip name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /><input placeholder="Location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /><div className="split2"><input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /><input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></div><button className="primaryBtn full" onClick={() => { save(draft); close(); }}>Save Trip</button><button className="textDanger" onClick={() => { deleteTrip(); close(); }}>Delete Trip</button></Modal>; }
function IdeaEditor({ idea, trip, mutateTrip, close }) { const [draft, setDraft] = useState(idea); const dates = daysBetween(trip.startDate, trip.endDate); function save() { mutateTrip((t) => ({ ...t, ideas: t.ideas.map((i) => i.id === idea.id ? { ...draft, scheduledDate: draft.scheduledDate || draft.date, scheduledTime: draft.scheduledTime || draft.time || PERIOD_TIMES[draft.period] || "" } : i) })); close(); } function del() { mutateTrip((t) => ({ ...t, ideas: t.ideas.filter((i) => i.id !== idea.id) })); close(); } return <Modal close={close}><h2>Edit Plan</h2><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select><input placeholder="Link" value={draft.link || ""} onChange={(e) => setDraft({ ...draft, link: e.target.value })} /><textarea placeholder="Notes" value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /><select value={draft.scheduledDate || draft.date || ""} onChange={(e) => setDraft({ ...draft, scheduledDate: e.target.value, date: e.target.value })}><option value="">Unscheduled</option>{dates.map((d) => <option key={d} value={d}>{prettyDate(d)}</option>)}</select><div className="split2"><select value={draft.period || ""} onChange={(e) => setDraft({ ...draft, period: e.target.value, scheduledTime: PERIOD_TIMES[e.target.value] || "", time: "" })}><option value="">Flexible</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select><input type="time" value={draft.scheduledTime || draft.time || ""} onChange={(e) => setDraft({ ...draft, scheduledTime: e.target.value, time: e.target.value, period: "" })} /></div><button className="primaryBtn full" onClick={save}>Save Plan</button><button className="textDanger" onClick={del}>Delete Plan</button></Modal>; }
function SettingsModal({ theme, setTheme, close }) { return <Modal close={close}><h2>Settings</h2><div className="segmented"><button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}><Sun size={16} /> Light</button><button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}><Moon size={16} /> Dark</button></div><div className="profileBox"><User /><div><b>Profile</b><p>Your public profile, followers, saved trips, and groups will live here later.</p></div></div></Modal>; }
function Modal({ children, close }) { return <div className="modalBackdrop" onMouseDown={close}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><button className="closeBtn" onClick={close}><X /></button>{children}</div></div>; }
function defaultTimeForCategory(category) { return category === "breakfast" ? "09:30" : category === "lunch" ? "12:30" : category === "dinner" ? "19:30" : category === "drinks" ? "21:00" : "14:00"; }

const css = `
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer}.app{min-height:100vh;color:var(--text);background:radial-gradient(circle at top left,var(--glow),transparent 38%),linear-gradient(135deg,var(--bg1),var(--bg2));padding-bottom:108px}.dark{--bg1:#09111f;--bg2:#18243a;--panel:rgba(255,255,255,.08);--panel2:rgba(255,255,255,.12);--text:#f8fafc;--muted:#a8b3c7;--line:rgba(255,255,255,.14);--input:rgba(255,255,255,.1);--glow:rgba(249,115,22,.28);--chip:rgba(255,255,255,.1)}.light{--bg1:#f9efe6;--bg2:#eaf3ff;--panel:rgba(255,255,255,.74);--panel2:#fff;--text:#172033;--muted:#607089;--line:rgba(27,37,59,.12);--input:rgba(255,255,255,.82);--glow:rgba(249,115,22,.18);--chip:#f2f5fa}.shell{width:min(1120px,100%);margin:0 auto;padding:18px}.desktopTop{display:none}.mobileHero{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:14px 2px 10px}.eyebrow{color:#fb923c;text-transform:uppercase;font-weight:900;font-size:11px;letter-spacing:.14em}.mobileHero h1{font-size:30px;line-height:1;margin:4px 0 7px}.mobileHero p{margin:0;color:var(--muted);font-size:13px}.controlStrip{position:sticky;top:8px;z-index:5;display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;margin:8px 0 18px;padding:10px;border:1px solid var(--line);background:color-mix(in srgb,var(--panel2) 78%,transparent);backdrop-filter:blur(18px);border-radius:22px;box-shadow:0 12px 35px rgba(0,0,0,.14)}.tripMini{min-width:0}.tripMini span{display:block;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tripMini small{display:block;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.primaryBtn,.orangeBtn{border:0;border-radius:999px;background:linear-gradient(135deg,#fb923c,#f97316);color:#fff;font-weight:900;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 14px;box-shadow:0 12px 24px rgba(249,115,22,.24)}.ghostBtn,.iconBtn{border:1px solid var(--line);background:var(--chip);color:var(--text);border-radius:999px;padding:10px 12px;display:inline-flex;align-items:center;justify-content:center;gap:7px}.small{font-size:12px;padding:8px 10px}.big{font-size:16px;padding:14px 18px}.full{width:100%}.pageStack{display:flex;flex-direction:column;gap:16px}.sectionHead h2{font-size:24px;margin:0 0 5px}.sectionHead p{margin:0;color:var(--muted);font-size:14px}.addCard,.categoryBlock,.logCard,.travelerCard,.dayTimeline,.empty,.emptyMini{border:1px solid var(--line);background:var(--panel);border-radius:28px;padding:16px;box-shadow:0 18px 45px rgba(0,0,0,.13);backdrop-filter:blur(18px)}.formGrid{display:grid;gap:10px;margin-bottom:12px}input,select,textarea{width:100%;border:1px solid var(--line);background:var(--input);color:var(--text);border-radius:17px;padding:12px 13px;outline:none}textarea{min-height:84px;resize:vertical}.split2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.categoryStack{display:flex;flex-direction:column;gap:18px}.categoryTitle{display:flex;align-items:center;gap:9px;margin-bottom:12px}.categoryTitle span{font-size:21px}.categoryTitle b{font-size:18px}.categoryTitle small{margin-left:auto;color:var(--muted);font-weight:800}.softEmpty{border:1px dashed var(--line);border-radius:20px;padding:18px;text-align:center;color:var(--muted)}.ideaCard{border:1px solid var(--line);background:var(--panel2);border-radius:22px;padding:13px;display:flex;gap:12px;align-items:center;margin-top:10px;text-align:left;color:var(--text);width:100%}.ideaMain{flex:1;min-width:0}.ideaMain b{display:block;font-size:15px}.ideaMain span,.ideaMain p{display:block;color:var(--muted);font-size:12px;margin:4px 0 0}.voteBox{display:grid;grid-template-columns:28px;justify-items:center;gap:3px}.voteBox button{border:0;background:var(--chip);color:var(--text);width:28px;height:25px;border-radius:10px}.dayHeader{display:flex;justify-content:space-between;align-items:end;margin-bottom:13px}.dayHeader span{font-size:18px;font-weight:950}.dayHeader small{color:var(--muted)}.timelineItem{width:100%;display:grid;grid-template-columns:74px 1fr;gap:10px;border:0;background:transparent;color:var(--text);text-align:left;padding:0;margin:0 0 12px}.timeRail{display:flex;flex-direction:column;align-items:flex-end;gap:8px;color:#fb923c;font-size:12px;font-weight:900;padding-top:10px}.timeRail i{width:2px;flex:1;min-height:58px;background:linear-gradient(#fb923c,transparent);border-radius:999px}.timelineCard{background:var(--panel2);border:1px solid var(--line);border-radius:24px;padding:14px}.pill{display:inline-flex;background:var(--chip);border-radius:999px;padding:5px 9px;color:var(--muted);font-size:11px;font-weight:900}.timelineCard h3{margin:9px 0 5px;font-size:17px}.timelineCard p{margin:0;color:var(--muted);font-size:13px;line-height:1.35}.metaLine{display:flex;gap:11px;margin-top:11px;color:var(--muted);font-size:12px}.metaLine span{display:flex;align-items:center;gap:4px}.calendarTop{display:flex;align-items:center;justify-content:space-between}.calendarTop h2{margin:0}.realCalendar{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}.weekday{font-size:11px;color:var(--muted);text-align:center;font-weight:900}.calCell{min-height:82px;border:1px solid var(--line);background:var(--panel);border-radius:15px;padding:7px;overflow:hidden}.calCell>span{font-size:12px;color:var(--muted);font-weight:900}.calCell.muted{opacity:.42}.tripBar{width:100%;border:0;background:linear-gradient(135deg,#fb923c,#ec4899);color:white;border-radius:999px;padding:4px 6px;font-size:10px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.segmented{display:grid;grid-template-columns:1fr 1fr;background:var(--chip);padding:5px;border-radius:999px;gap:5px}.segmented button{border:0;border-radius:999px;background:transparent;color:var(--muted);font-weight:900;padding:10px;display:flex;align-items:center;justify-content:center;gap:7px}.segmented button.active{background:var(--panel2);color:var(--text);box-shadow:0 8px 20px rgba(0,0,0,.1)}.logisticsStack{display:flex;flex-direction:column;gap:13px}.cardTop{display:grid;grid-template-columns:1fr auto;gap:8px}.danger{color:#fb7185}.travelerSummary{display:flex;justify-content:space-between;align-items:center;gap:10px}.travelerSummary input{border:0;background:transparent;padding:0;font-weight:950;font-size:18px}.travelerSummary small{color:var(--muted)}.flightDrawer{margin-top:14px;display:grid;gap:12px}.flightLeg{border:1px solid var(--line);background:var(--panel2);border-radius:22px;padding:12px;display:grid;gap:10px}.textDanger{border:0;background:transparent;color:#fb7185;font-weight:900;padding:10px}.empty{text-align:center;padding:42px 20px}.emptyIcon{font-size:44px}.empty h2{font-size:28px;margin:9px 0}.empty p{color:var(--muted);max-width:430px;margin:0 auto 20px}.emptyMini{text-align:center;color:var(--muted)}.mobileNav{position:fixed;left:12px;right:12px;bottom:14px;z-index:30;height:76px;display:grid;grid-template-columns:1fr 1fr 70px 1fr 1fr;align-items:center;gap:6px;padding:8px;border:1px solid var(--line);background:color-mix(in srgb,var(--panel2) 86%,transparent);backdrop-filter:blur(22px);border-radius:28px;box-shadow:0 18px 50px rgba(0,0,0,.25)}.mobileNav button{border:0;background:transparent;color:var(--muted);display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-weight:900}.mobileNav button.active{color:var(--text)}.mobileNav .addRound{width:58px;height:58px;border-radius:22px;background:linear-gradient(135deg,#fb923c,#f97316);color:white;justify-self:center;box-shadow:0 12px 25px rgba(249,115,22,.33)}.modalBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:end center;z-index:60;padding:14px}.modal{width:min(560px,100%);max-height:86vh;overflow:auto;background:var(--bg1);border:1px solid var(--line);border-radius:30px;padding:20px;display:grid;gap:12px;color:var(--text);box-shadow:0 30px 80px rgba(0,0,0,.35)}.closeBtn{justify-self:end;border:0;background:var(--chip);color:var(--text);border-radius:999px;width:36px;height:36px}.modal h2{margin:0}.profileBox{display:flex;gap:12px;border:1px solid var(--line);border-radius:22px;padding:14px;background:var(--panel)}.profileBox p{margin:4px 0 0;color:var(--muted)}
@media (min-width: 820px){.app{padding-bottom:40px}.desktopTop{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:12px;padding:14px 22px;background:color-mix(in srgb,var(--panel2) 80%,transparent);backdrop-filter:blur(22px);border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:10px;margin-right:auto}.brand small{display:block;color:var(--muted);font-size:11px}.logo{width:38px;height:38px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,#fb923c,#ec4899)}.tripSelect{width:190px}.desktopNav{display:flex;gap:6px;background:var(--chip);border-radius:999px;padding:5px}.desktopNav button{border:0;border-radius:999px;background:transparent;color:var(--muted);font-weight:900;padding:9px 12px}.desktopNav button.active{background:var(--panel2);color:var(--text)}.mobileHero,.mobileNav{display:none}.shell{padding:28px}.controlStrip{top:80px}.categoryStack{display:grid;grid-template-columns:repeat(2,1fr);align-items:start}.formGrid{grid-template-columns:1.3fr .8fr 1fr 1fr}.pageStack{gap:20px}.realCalendar{gap:8px}.calCell{min-height:122px;border-radius:20px}.timelineItem{grid-template-columns:110px 1fr}.timelineCard h3{font-size:20px}.logisticsStack{display:grid;grid-template-columns:repeat(2,1fr);align-items:start}.modalBackdrop{place-items:center}}
@media (max-width: 430px){.shell{padding:14px}.controlStrip{grid-template-columns:1fr auto;}.controlStrip .primaryBtn{grid-column:1/-1}.ghostBtn{padding:9px 10px}.split2{grid-template-columns:1fr}.calCell{min-height:70px;padding:5px;border-radius:12px}.tripBar{font-size:9px}.mobileHero h1{font-size:27px}}
`;
