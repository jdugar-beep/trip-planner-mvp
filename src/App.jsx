import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Plus,
  Sparkles,
  Clock,
  Link as LinkIcon,
  MapPin,
  Wand2,
  X,
  Edit3,
  Trash2,
  CheckCircle2,
  LayoutGrid,
  ListTodo,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Plane,
  Hotel,
  Users,
  Briefcase,
  Settings,
  UserCircle,
  Sun,
  Moon,
} from "lucide-react";

const CATEGORIES = [
  { key: "breakfast", label: "Breakfast", emoji: "🥐", accent: "#F59E0B", defaultTime: "09:30" },
  { key: "lunch", label: "Lunch", emoji: "🥗", accent: "#10B981", defaultTime: "13:00" },
  { key: "dinner", label: "Dinner", emoji: "🍝", accent: "#EF4444", defaultTime: "20:00" },
  { key: "activity", label: "Activity", emoji: "🎟️", accent: "#8B5CF6", defaultTime: "15:00" },
  { key: "drinks", label: "Drinks", emoji: "🍸", accent: "#EC4899", defaultTime: "21:30" },
  { key: "sightseeing", label: "Sightseeing", emoji: "🏛️", accent: "#3B82F6", defaultTime: "11:00" },
  { key: "exploring", label: "Exploring", emoji: "🚶", accent: "#14B8A6", defaultTime: "17:00" },
];

const STORAGE_KEY = "its-a-trip-multitrip-v1";
const SETTINGS_KEY = "its-a-trip-settings-v1";

const TIME_OF_DAY_OPTIONS = [
  { key: "", label: "No time preference", fallback: "" },
  { key: "morning", label: "Morning", fallback: "09:30" },
  { key: "afternoon", label: "Afternoon", fallback: "14:00" },
  { key: "evening", label: "Evening", fallback: "19:30" },
];

function getTimeOfDayLabel(key) {
  return TIME_OF_DAY_OPTIONS.find((option) => option.key === key)?.label || "";
}

function resolveScheduleTime(idea, category) {
  if (idea.time) return idea.time;
  const bucket = TIME_OF_DAY_OPTIONS.find((option) => option.key === idea.timeOfDay);
  return bucket?.fallback || category.defaultTime;
}

function uid() {
  return crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date((dateString || todayISO()) + "T12:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function weekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(12, 0, 0, 0);
  return d;
}

function formatDateLabel(dateString, opts = {}) {
  if (!dateString) return "Unscheduled";
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString(undefined, opts.short ? { month: "short", day: "numeric" } : { weekday: "short", month: "short", day: "numeric" });
}

function getDateRange(start, end) {
  if (!start || !end) return [];
  const dates = [];
  const cursor = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  if (cursor > last) return [];
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function getCategory(categoryKey) {
  return CATEGORIES.find((cat) => cat.key === categoryKey) || CATEGORIES[0];
}

function makeBlankTrip() {
  const start = todayISO();
  return {
    id: uid(),
    name: "New Trip",
    location: "",
    startDate: start,
    endDate: addDays(start, 3),
    ideas: [],
    hotels: [],
    flights: [],
    createdAt: new Date().toISOString(),
  };
}

export default function App() {
  const [trips, setTrips] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [activeTripId, setActiveTripId] = useState(() => trips[0]?.id || "");
  const [page, setPage] = useState("board");
  const [activeCategory, setActiveCategory] = useState("all");
  const [editingIdea, setEditingIdea] = useState(null);
  const [showTripEditor, setShowTripEditor] = useState(false);
  const [calendarMode, setCalendarMode] = useState("month");
  const [calendarCursor, setCalendarCursor] = useState(() => new Date(todayISO() + "T12:00:00"));
  const [newIdea, setNewIdea] = useState({ title: "", category: "breakfast", link: "", notes: "", date: "", time: "", timeOfDay: "" });
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}").theme || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    if (trips.length && !trips.some((trip) => trip.id === activeTripId)) setActiveTripId(trips[0].id);
  }, [trips, activeTripId]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme }));
  }, [theme]);

  const activeTrip = trips.find((trip) => trip.id === activeTripId) || null;
  const tripDates = useMemo(() => getDateRange(activeTrip?.startDate, activeTrip?.endDate), [activeTrip]);
  const ideas = activeTrip?.ideas || [];
  const hotels = activeTrip?.hotels || [];
  const flights = activeTrip?.flights || [];
  const scheduledIdeas = ideas.filter((idea) => idea.date).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const unscheduledIdeas = ideas.filter((idea) => !idea.date);
  const filteredIdeas = ideas.filter((idea) => activeCategory === "all" || idea.category === activeCategory);

  const allScheduledItems = useMemo(() => {
    return trips.flatMap((trip) =>
      (trip.ideas || [])
        .filter((idea) => idea.date)
        .map((idea) => ({ ...idea, tripId: trip.id, tripName: trip.name, tripLocation: trip.location }))
    );
  }, [trips]);

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = ideas.filter((idea) => idea.category === cat.key).length;
    return acc;
  }, {});

  function addTrip() {
    const trip = makeBlankTrip();
    setTrips((current) => [trip, ...current]);
    setActiveTripId(trip.id);
    setPage("board");
    setShowTripEditor(true);
  }

  function updateTrip(updates) {
    if (!activeTrip) return;
    setTrips((current) => current.map((trip) => (trip.id === activeTrip.id ? { ...trip, ...updates } : trip)));
  }

  function deleteTrip() {
    if (!activeTrip) return;
    setTrips((current) => current.filter((trip) => trip.id !== activeTrip.id));
    setShowTripEditor(false);
    setEditingIdea(null);
  }

  function addIdea(event) {
    event.preventDefault();
    if (!activeTrip || !newIdea.title.trim()) return;
    const idea = {
      id: uid(),
      title: newIdea.title.trim(),
      category: newIdea.category,
      link: newIdea.link.trim(),
      notes: newIdea.notes.trim(),
      votes: 0,
      date: newIdea.date || "",
      time: newIdea.time || "",
      timeOfDay: newIdea.timeOfDay || "",
    };
    updateTrip({ ideas: [idea, ...ideas] });
    setNewIdea({ title: "", category: newIdea.category, link: "", notes: "", date: "", time: "", timeOfDay: "" });
  }

  function updateIdea(id, updates) {
    const updatedIdeas = ideas.map((idea) => (idea.id === id ? { ...idea, ...updates } : idea));
    updateTrip({ ideas: updatedIdeas });
    setEditingIdea((current) => (current?.id === id ? { ...current, ...updates } : current));
  }

  function deleteIdea(id) {
    updateTrip({ ideas: ideas.filter((idea) => idea.id !== id) });
    setEditingIdea(null);
  }

  function autoBuildItinerary() {
    if (!activeTrip || !tripDates.length) return;
    const assignments = new Map();
    CATEGORIES.forEach((cat) => {
      const categoryIdeas = ideas
        .filter((idea) => idea.category === cat.key)
        .sort((a, b) => b.votes - a.votes);

      // Fixed-date ideas keep the date/time the user entered on the planning board.
      categoryIdeas
        .filter((idea) => idea.date)
        .forEach((idea) => assignments.set(idea.id, { date: idea.date, time: resolveScheduleTime(idea, cat), timeOfDay: idea.timeOfDay || "" }));

      // Flexible ideas fill the remaining trip days by vote count.
      const takenDates = new Set(categoryIdeas.filter((idea) => idea.date).map((idea) => idea.date));
      const openDates = tripDates.filter((date) => !takenDates.has(date));
      categoryIdeas
        .filter((idea) => !idea.date)
        .slice(0, openDates.length)
        .forEach((idea, index) => assignments.set(idea.id, { date: openDates[index % openDates.length], time: resolveScheduleTime(idea, cat), timeOfDay: idea.timeOfDay || "" }));
    });
    updateTrip({ ideas: ideas.map((idea) => (assignments.has(idea.id) ? { ...idea, ...assignments.get(idea.id) } : idea)) });
    setPage("itinerary");
  }

  function addHotel(hotel) {
    if (!activeTrip || !hotel.name.trim()) return;
    updateTrip({ hotels: [{ id: uid(), ...hotel, name: hotel.name.trim() }, ...hotels] });
  }

  function updateHotel(id, updates) {
    updateTrip({ hotels: hotels.map((hotel) => (hotel.id === id ? { ...hotel, ...updates } : hotel)) });
  }

  function deleteHotel(id) {
    updateTrip({ hotels: hotels.filter((hotel) => hotel.id !== id) });
  }

  function addFlight(flight) {
    if (!activeTrip || !flight.person.trim()) return;
    updateTrip({ flights: [{ id: uid(), ...flight, person: flight.person.trim() }, ...flights] });
  }

  function updateFlight(id, updates) {
    updateTrip({ flights: flights.map((flight) => (flight.id === id ? { ...flight, ...updates } : flight)) });
  }

  function deleteFlight(id) {
    updateTrip({ flights: flights.filter((flight) => flight.id !== id) });
  }

  return (
    <div className={`app-shell ${theme === "light" ? "light-mode" : "dark-mode"}`}>
      <style>{styles}</style>
      <header className="hero">
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <nav className="topbar">
          <div className="brand-mark"><Plane size={24} /></div>
          <div>
            <p className="eyebrow">Collaborative trip planner</p>
            <h1>It’s a Trip</h1>
          </div>
          <div className="top-actions">
            <button className="ghost-button" onClick={addTrip}><Plus size={16} /> Add trip</button>
            {activeTrip && <button className="ghost-button" onClick={() => setShowTripEditor(true)}><Edit3 size={16} /> Edit trip</button>}
            <button className="ghost-button" onClick={() => setShowSettings(true)}><Settings size={16} /> Settings</button>
          </div>
        </nav>

        <section className="hero-content">
          <div>
            <p className="pill"><Sparkles size={14} /> Ideas become itineraries</p>
            <h2>{activeTrip ? activeTrip.name : "Plan a trip from scratch."}</h2>
            <p className="hero-subtitle">
              Create multiple trips, add links and ideas by category, vote on options, then schedule each card into a clean day-by-day itinerary.
            </p>
            <div className="hero-meta">
              <span><MapPin size={16} /> {activeTrip?.location || "No location yet"}</span>
              <span><CalendarDays size={16} /> {activeTrip ? `${formatDateLabel(activeTrip.startDate)} – ${formatDateLabel(activeTrip.endDate)}` : "Add dates"}</span>
              <span><LayoutGrid size={16} /> {trips.length} trip{trips.length === 1 ? "" : "s"}</span>
            </div>
          </div>
          <div className="hero-card">
            <p>Current trip</p>
            {trips.length ? (
              <select className="trip-select" value={activeTripId} onChange={(e) => setActiveTripId(e.target.value)}>
                {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
              </select>
            ) : (
              <button className="primary-button full" onClick={addTrip}><Plus size={17} /> Create your first trip</button>
            )}
            <div className="stat-grid">
              <div><strong>{ideas.length}</strong><span>Ideas</span></div>
              <div><strong>{scheduledIdeas.length}</strong><span>Scheduled</span></div>
              <div><strong>{tripDates.length}</strong><span>Days</span></div>
            </div>
            <button className="primary-button full" onClick={autoBuildItinerary} disabled={!activeTrip || !tripDates.length || !ideas.length}>
              <Wand2 size={17} /> Auto-build draft
            </button>
          </div>
        </section>
      </header>

      <main className="workspace">
        <div className="page-tabs">
          <button className={page === "board" ? "tab active" : "tab"} onClick={() => setPage("board")}><ListTodo size={16} /> Planning board</button>
          <button className={page === "itinerary" ? "tab active" : "tab"} onClick={() => setPage("itinerary")}><CalendarDays size={16} /> Your itinerary</button>
          <button className={page === "logistics" ? "tab active" : "tab"} onClick={() => setPage("logistics")}><Hotel size={16} /> Logistics</button>
          <button className={page === "calendar" ? "tab active" : "tab"} onClick={() => setPage("calendar")}><CalendarRange size={16} /> All trips calendar</button>
        </div>

        {!activeTrip && page !== "calendar" ? (
          <EmptyCreateTrip onAddTrip={addTrip} />
        ) : page === "board" ? (
          <PlanningBoard
            ideas={filteredIdeas}
            totalIdeas={ideas.length}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            categoryCounts={categoryCounts}
            newIdea={newIdea}
            setNewIdea={setNewIdea}
            addIdea={addIdea}
            setEditingIdea={setEditingIdea}
            updateIdea={updateIdea}
            tripDates={tripDates}
          />
        ) : page === "itinerary" ? (
          <ItineraryPage tripDates={tripDates} scheduledIdeas={scheduledIdeas} unscheduledIdeas={unscheduledIdeas} setEditingIdea={setEditingIdea} />
        ) : page === "logistics" ? (
          <LogisticsPage hotels={hotels} flights={flights} addHotel={addHotel} updateHotel={updateHotel} deleteHotel={deleteHotel} addFlight={addFlight} updateFlight={updateFlight} deleteFlight={deleteFlight} />
        ) : (
          <CalendarPage
            trips={trips}
            allScheduledItems={allScheduledItems}
            calendarMode={calendarMode}
            setCalendarMode={setCalendarMode}
            calendarCursor={calendarCursor}
            setCalendarCursor={setCalendarCursor}
            setActiveTripId={setActiveTripId}
            setPage={setPage}
          />
        )}
      </main>

      {showTripEditor && activeTrip && (
        <div className="modal-backdrop" onClick={() => setShowTripEditor(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowTripEditor(false)}><X size={18} /></button>
            <p className="eyebrow">Trip setup</p>
            <h3>{activeTrip.name === "New Trip" ? "Create trip" : "Edit trip"}</h3>
            <label>Trip name<input value={activeTrip.name} onChange={(e) => updateTrip({ name: e.target.value })} /></label>
            <label>Location<input value={activeTrip.location} onChange={(e) => updateTrip({ location: e.target.value })} placeholder="City, country, region..." /></label>
            <div className="two-col">
              <label>Start date<input type="date" value={activeTrip.startDate} onChange={(e) => updateTrip({ startDate: e.target.value })} /></label>
              <label>End date<input type="date" value={activeTrip.endDate} onChange={(e) => updateTrip({ endDate: e.target.value })} /></label>
            </div>
            <div className="modal-actions">
              <button className="danger-button" onClick={deleteTrip}><Trash2 size={16} /> Delete trip</button>
              <button className="primary-button" onClick={() => setShowTripEditor(false)}><CheckCircle2 size={17} /> Save trip</button>
            </div>
          </div>
        </div>
      )}



      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowSettings(false)}><X size={18} /></button>
            <p className="eyebrow">App settings</p>
            <h3>Settings</h3>
            <div className="settings-section">
              <strong>Appearance</strong>
              <p>Choose how the planner looks while you build trips.</p>
              <div className="theme-toggle">
                <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}><Sun size={16} /> Light</button>
                <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}><Moon size={16} /> Dark</button>
              </div>
            </div>
            <button className="profile-row" onClick={() => { setShowProfile(true); setShowSettings(false); }}>
              <UserCircle size={22} />
              <span><strong>Profile</strong><em>View your full profile — coming next</em></span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="modal-backdrop" onClick={() => setShowProfile(false)}>
          <div className="modal profile-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowProfile(false)}><X size={18} /></button>
            <div className="profile-avatar"><UserCircle size={42} /></div>
            <p className="eyebrow">Profile</p>
            <h3>Your profile</h3>
            <p className="profile-copy">This is the future home for your name, photo, saved trips, travel style, followers, shared itineraries, and preferences.</p>
            <div className="profile-preview-grid">
              <div><strong>{trips.length}</strong><span>Trips</span></div>
              <div><strong>{allScheduledItems.length}</strong><span>Scheduled plans</span></div>
              <div><strong>{theme}</strong><span>Theme</span></div>
            </div>
            <button className="primary-button full" onClick={() => setShowProfile(false)}><CheckCircle2 size={17} /> Close</button>
          </div>
        </div>
      )}

      {editingIdea && activeTrip && (
        <div className="modal-backdrop" onClick={() => setEditingIdea(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setEditingIdea(null)}><X size={18} /></button>
            <p className="eyebrow">Click-to-schedule</p>
            <h3>{editingIdea.title}</h3>
            <label>Title<input value={editingIdea.title} onChange={(e) => updateIdea(editingIdea.id, { title: e.target.value })} /></label>
            <div className="two-col">
              <label>Category<select value={editingIdea.category} onChange={(e) => updateIdea(editingIdea.id, { category: e.target.value })}>{CATEGORIES.map((cat) => <option key={cat.key} value={cat.key}>{cat.emoji} {cat.label}</option>)}</select></label>
              <label>Votes<input type="number" value={editingIdea.votes} onChange={(e) => updateIdea(editingIdea.id, { votes: Number(e.target.value) })} /></label>
            </div>
            <div className="two-col">
              <label>Date<select value={editingIdea.date} onChange={(e) => updateIdea(editingIdea.id, { date: e.target.value })}><option value="">Not scheduled yet</option>{tripDates.map((date) => <option key={date} value={date}>{formatDateLabel(date)}</option>)}</select></label>
              <label>Exact time<input type="time" value={editingIdea.time} onChange={(e) => updateIdea(editingIdea.id, { time: e.target.value })} /></label>
            </div>
            <label>Time of day
              <select value={editingIdea.timeOfDay || ""} onChange={(e) => updateIdea(editingIdea.id, { timeOfDay: e.target.value })}>
                {TIME_OF_DAY_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </label>
            <label>Link<input value={editingIdea.link} onChange={(e) => updateIdea(editingIdea.id, { link: e.target.value })} placeholder="Paste Google Maps, TikTok, restaurant link..." /></label>
            <label>Notes<textarea value={editingIdea.notes} onChange={(e) => updateIdea(editingIdea.id, { notes: e.target.value })} /></label>
            <div className="modal-actions">
              <button className="danger-button" onClick={() => deleteIdea(editingIdea.id)}><Trash2 size={16} /> Delete</button>
              <button className="primary-button" onClick={() => setEditingIdea(null)}><CheckCircle2 size={17} /> Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyCreateTrip({ onAddTrip }) {
  return (
    <section className="empty-start">
      <div className="empty-icon"><Plane size={34} /></div>
      <p className="eyebrow">Blank slate</p>
      <h3>Create a brand new trip</h3>
      <p>No dummy data. Start with dates, then add breakfast, lunch, dinner, activities, drinks, sightseeing, and exploring ideas.</p>
      <button className="primary-button" onClick={onAddTrip}><Plus size={17} /> Add trip</button>
    </section>
  );
}

function PlanningBoard({ ideas, totalIdeas, activeCategory, setActiveCategory, categoryCounts, newIdea, setNewIdea, addIdea, setEditingIdea, updateIdea, tripDates }) {
  return (
    <section className="panel board-page">
      <div className="section-heading">
        <div><p className="eyebrow">Add and vote</p><h3>Planning board</h3></div>
        <span className="mini-count">{totalIdeas} total ideas</span>
      </div>
      <form className="add-form" onSubmit={addIdea}>
        <input value={newIdea.title} onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })} placeholder="Spot name, restaurant, activity..." />
        <select value={newIdea.category} onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}>
          {CATEGORIES.map((cat) => <option key={cat.key} value={cat.key}>{cat.emoji} {cat.label}</option>)}
        </select>
        <input value={newIdea.link} onChange={(e) => setNewIdea({ ...newIdea, link: e.target.value })} placeholder="Optional link" />
        <div className="date-time-row">
          <select value={newIdea.date} onChange={(e) => setNewIdea({ ...newIdea, date: e.target.value })}>
            <option value="">Optional date</option>
            {tripDates.map((date) => <option key={date} value={date}>{formatDateLabel(date)}</option>)}
          </select>
          <input type="time" value={newIdea.time} onChange={(e) => setNewIdea({ ...newIdea, time: e.target.value })} />
          <select value={newIdea.timeOfDay} onChange={(e) => setNewIdea({ ...newIdea, timeOfDay: e.target.value })}>
            {TIME_OF_DAY_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </div>
        <textarea value={newIdea.notes} onChange={(e) => setNewIdea({ ...newIdea, notes: e.target.value })} placeholder="Notes, reservation details, why people should vote for it..." />
        <button className="primary-button" type="submit"><Plus size={17} /> Add to trip</button>
      </form>

      <div className="category-cloud">
        <button className={activeCategory === "all" ? "category-chip active" : "category-chip"} onClick={() => setActiveCategory("all")}>All <span>{totalIdeas}</span></button>
        {CATEGORIES.map((cat) => (
          <button key={cat.key} className={activeCategory === cat.key ? "category-chip active" : "category-chip"} onClick={() => setActiveCategory(cat.key)}>
            {cat.emoji} {cat.label} <span>{categoryCounts[cat.key] || 0}</span>
          </button>
        ))}
      </div>

      {ideas.length ? <div className="idea-grid">{ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} onEdit={() => setEditingIdea(idea)} onVote={() => updateIdea(idea.id, { votes: idea.votes + 1 })} />)}</div> : <div className="empty-state">No ideas here yet. Add your first spot above.</div>}
    </section>
  );
}

function ItineraryPage({ tripDates, scheduledIdeas, unscheduledIdeas, setEditingIdea }) {
  return (
    <section className="panel itinerary-page">
      <div className="section-heading">
        <div><p className="eyebrow">Scheduled plan</p><h3>Your itinerary</h3></div>
        <span className="mini-count">{unscheduledIdeas.length} unscheduled</span>
      </div>
      {!tripDates.length ? <div className="empty-state">Add trip start and end dates to build an itinerary.</div> : (
        <div className="days-stack">
          {tripDates.map((date) => {
            const dayItems = scheduledIdeas.filter((idea) => idea.date === date);
            return (
              <article className="day-card" key={date}>
                <div className="day-header">
                  <div><p>{new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" })}</p><h4>{formatDateLabel(date)}</h4></div>
                  <span>{dayItems.length} plans</span>
                </div>
                {dayItems.length === 0 ? <button className="empty-day">No plans yet. Click a card on the planning board to assign it here.</button> : <div className="timeline">{dayItems.map((idea) => <TimelineItem key={idea.id} idea={idea} onEdit={() => setEditingIdea(idea)} />)}</div>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}


function LogisticsPage({ hotels, flights, addHotel, updateHotel, deleteHotel, addFlight, updateFlight, deleteFlight }) {
  const [hotelDraft, setHotelDraft] = useState({ name: "", address: "", checkInDate: "", checkInTime: "", checkOutDate: "", checkOutTime: "", confirmation: "", notes: "" });
  const [flightDraft, setFlightDraft] = useState({ person: "", direction: "There", airline: "", flightNumber: "", from: "", to: "", date: "", departTime: "", arriveTime: "", confirmation: "", notes: "" });

  function submitHotel(e) {
    e.preventDefault();
    addHotel(hotelDraft);
    setHotelDraft({ name: "", address: "", checkInDate: "", checkInTime: "", checkOutDate: "", checkOutTime: "", confirmation: "", notes: "" });
  }

  function submitFlight(e) {
    e.preventDefault();
    addFlight(flightDraft);
    setFlightDraft({ person: "", direction: "There", airline: "", flightNumber: "", from: "", to: "", date: "", departTime: "", arriveTime: "", confirmation: "", notes: "" });
  }

  return (
    <section className="panel logistics-page">
      <div className="section-heading">
        <div><p className="eyebrow">Hotels and flights</p><h3>Logistics</h3></div>
        <span className="mini-count">{hotels.length} hotel{hotels.length === 1 ? "" : "s"} • {flights.length} flight{flights.length === 1 ? "" : "s"}</span>
      </div>

      <div className="logistics-grid">
        <form className="logistics-form" onSubmit={submitHotel}>
          <div className="form-title"><Hotel size={18} /><strong>Add hotel</strong></div>
          <input value={hotelDraft.name} onChange={(e) => setHotelDraft({ ...hotelDraft, name: e.target.value })} placeholder="Hotel / Airbnb name" />
          <input value={hotelDraft.address} onChange={(e) => setHotelDraft({ ...hotelDraft, address: e.target.value })} placeholder="Address" />
          <div className="two-col">
            <input type="date" value={hotelDraft.checkInDate} onChange={(e) => setHotelDraft({ ...hotelDraft, checkInDate: e.target.value })} />
            <input type="time" value={hotelDraft.checkInTime} onChange={(e) => setHotelDraft({ ...hotelDraft, checkInTime: e.target.value })} />
          </div>
          <div className="two-col">
            <input type="date" value={hotelDraft.checkOutDate} onChange={(e) => setHotelDraft({ ...hotelDraft, checkOutDate: e.target.value })} />
            <input type="time" value={hotelDraft.checkOutTime} onChange={(e) => setHotelDraft({ ...hotelDraft, checkOutTime: e.target.value })} />
          </div>
          <input value={hotelDraft.confirmation} onChange={(e) => setHotelDraft({ ...hotelDraft, confirmation: e.target.value })} placeholder="Confirmation number / booking link" />
          <textarea value={hotelDraft.notes} onChange={(e) => setHotelDraft({ ...hotelDraft, notes: e.target.value })} placeholder="Notes: bag drop, room type, who booked it..." />
          <button className="primary-button" type="submit"><Plus size={17} /> Add hotel</button>
        </form>

        <form className="logistics-form" onSubmit={submitFlight}>
          <div className="form-title"><Plane size={18} /><strong>Add flight</strong></div>
          <input value={flightDraft.person} onChange={(e) => setFlightDraft({ ...flightDraft, person: e.target.value })} placeholder="Traveler name" />
          <select value={flightDraft.direction} onChange={(e) => setFlightDraft({ ...flightDraft, direction: e.target.value })}>
            <option>There</option><option>Back</option><option>Connection</option><option>Other</option>
          </select>
          <div className="two-col">
            <input value={flightDraft.airline} onChange={(e) => setFlightDraft({ ...flightDraft, airline: e.target.value })} placeholder="Airline" />
            <input value={flightDraft.flightNumber} onChange={(e) => setFlightDraft({ ...flightDraft, flightNumber: e.target.value })} placeholder="Flight #" />
          </div>
          <div className="two-col">
            <input value={flightDraft.from} onChange={(e) => setFlightDraft({ ...flightDraft, from: e.target.value })} placeholder="From" />
            <input value={flightDraft.to} onChange={(e) => setFlightDraft({ ...flightDraft, to: e.target.value })} placeholder="To" />
          </div>
          <div className="three-col">
            <input type="date" value={flightDraft.date} onChange={(e) => setFlightDraft({ ...flightDraft, date: e.target.value })} />
            <input type="time" value={flightDraft.departTime} onChange={(e) => setFlightDraft({ ...flightDraft, departTime: e.target.value })} />
            <input type="time" value={flightDraft.arriveTime} onChange={(e) => setFlightDraft({ ...flightDraft, arriveTime: e.target.value })} />
          </div>
          <input value={flightDraft.confirmation} onChange={(e) => setFlightDraft({ ...flightDraft, confirmation: e.target.value })} placeholder="Confirmation number / booking link" />
          <textarea value={flightDraft.notes} onChange={(e) => setFlightDraft({ ...flightDraft, notes: e.target.value })} placeholder="Seat, terminal, baggage, who is on this flight..." />
          <button className="primary-button" type="submit"><Plus size={17} /> Add flight</button>
        </form>
      </div>

      <div className="saved-logistics">
        <div className="logistics-list">
          <h4><Hotel size={18} /> Hotel details</h4>
          {hotels.length ? hotels.map((hotel) => (
            <article className="logistics-card" key={hotel.id}>
              <input value={hotel.name} onChange={(e) => updateHotel(hotel.id, { name: e.target.value })} />
              <input value={hotel.address} onChange={(e) => updateHotel(hotel.id, { address: e.target.value })} placeholder="Address" />
              <div className="two-col"><label>Check-in<input type="date" value={hotel.checkInDate} onChange={(e) => updateHotel(hotel.id, { checkInDate: e.target.value })} /></label><label>Time<input type="time" value={hotel.checkInTime} onChange={(e) => updateHotel(hotel.id, { checkInTime: e.target.value })} /></label></div>
              <div className="two-col"><label>Check-out<input type="date" value={hotel.checkOutDate} onChange={(e) => updateHotel(hotel.id, { checkOutDate: e.target.value })} /></label><label>Time<input type="time" value={hotel.checkOutTime} onChange={(e) => updateHotel(hotel.id, { checkOutTime: e.target.value })} /></label></div>
              <input value={hotel.confirmation} onChange={(e) => updateHotel(hotel.id, { confirmation: e.target.value })} placeholder="Confirmation / link" />
              <textarea value={hotel.notes} onChange={(e) => updateHotel(hotel.id, { notes: e.target.value })} placeholder="Notes" />
              <button className="danger-button" onClick={() => deleteHotel(hotel.id)} type="button"><Trash2 size={16} /> Delete hotel</button>
            </article>
          )) : <div className="empty-state">No hotel details yet.</div>}
        </div>

        <div className="logistics-list">
          <h4><Users size={18} /> Flight details by person</h4>
          {flights.length ? flights.map((flight) => (
            <article className="logistics-card" key={flight.id}>
              <div className="two-col"><input value={flight.person} onChange={(e) => updateFlight(flight.id, { person: e.target.value })} placeholder="Traveler" /><select value={flight.direction} onChange={(e) => updateFlight(flight.id, { direction: e.target.value })}><option>There</option><option>Back</option><option>Connection</option><option>Other</option></select></div>
              <div className="two-col"><input value={flight.airline} onChange={(e) => updateFlight(flight.id, { airline: e.target.value })} placeholder="Airline" /><input value={flight.flightNumber} onChange={(e) => updateFlight(flight.id, { flightNumber: e.target.value })} placeholder="Flight #" /></div>
              <div className="two-col"><input value={flight.from} onChange={(e) => updateFlight(flight.id, { from: e.target.value })} placeholder="From" /><input value={flight.to} onChange={(e) => updateFlight(flight.id, { to: e.target.value })} placeholder="To" /></div>
              <div className="three-col"><input type="date" value={flight.date} onChange={(e) => updateFlight(flight.id, { date: e.target.value })} /><input type="time" value={flight.departTime} onChange={(e) => updateFlight(flight.id, { departTime: e.target.value })} /><input type="time" value={flight.arriveTime} onChange={(e) => updateFlight(flight.id, { arriveTime: e.target.value })} /></div>
              <input value={flight.confirmation} onChange={(e) => updateFlight(flight.id, { confirmation: e.target.value })} placeholder="Confirmation / link" />
              <textarea value={flight.notes} onChange={(e) => updateFlight(flight.id, { notes: e.target.value })} placeholder="Notes" />
              <button className="danger-button" onClick={() => deleteFlight(flight.id)} type="button"><Trash2 size={16} /> Delete flight</button>
            </article>
          )) : <div className="empty-state">No flights yet. Add each person's outbound and return flight one at a time.</div>}
        </div>
      </div>
    </section>
  );
}

function CalendarPage({ trips, allScheduledItems, calendarMode, setCalendarMode, calendarCursor, setCalendarCursor, setActiveTripId, setPage }) {
  function moveCalendar(direction) {
    const d = new Date(calendarCursor);
    if (calendarMode === "month") d.setMonth(d.getMonth() + direction);
    if (calendarMode === "week") d.setDate(d.getDate() + direction * 7);
    if (calendarMode === "year") d.setFullYear(d.getFullYear() + direction);
    setCalendarCursor(d);
  }

  return (
    <section className="panel calendar-page">
      <div className="section-heading calendar-heading">
        <div><p className="eyebrow">Across every trip</p><h3>Calendar</h3></div>
        <div className="calendar-controls">
          <button className="icon-button" onClick={() => moveCalendar(-1)}><ChevronLeft size={18} /></button>
          <strong>{calendarTitle(calendarCursor, calendarMode)}</strong>
          <button className="icon-button" onClick={() => moveCalendar(1)}><ChevronRight size={18} /></button>
          <div className="mode-toggle">
            {['week', 'month', 'year'].map((mode) => <button key={mode} className={calendarMode === mode ? "active" : ""} onClick={() => setCalendarMode(mode)}>{mode}</button>)}
          </div>
        </div>
      </div>
      {!trips.length ? <div className="empty-state">Create trips and schedule cards to see everything here.</div> : calendarMode === "year" ? <YearCalendar cursor={calendarCursor} items={allScheduledItems} setActiveTripId={setActiveTripId} setPage={setPage} /> : <GridCalendar mode={calendarMode} cursor={calendarCursor} items={allScheduledItems} setActiveTripId={setActiveTripId} setPage={setPage} />}
    </section>
  );
}

function calendarTitle(cursor, mode) {
  if (mode === "year") return String(cursor.getFullYear());
  if (mode === "week") {
    const start = weekStart(cursor);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }
  return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function GridCalendar({ mode, cursor, items, setActiveTripId, setPage }) {
  const days = [];
  if (mode === "week") {
    const start = weekStart(cursor);
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  } else {
    const start = monthStart(cursor);
    const gridStart = weekStart(start);
    for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); days.push(d); }
  }
  return (
    <div className={mode === "week" ? "calendar-grid week" : "calendar-grid"}>
      {days.map((day) => {
        const iso = day.toISOString().slice(0, 10);
        const dayItems = items.filter((item) => item.date === iso).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
        const muted = mode === "month" && day.getMonth() !== cursor.getMonth();
        return <CalendarCell key={iso} iso={iso} date={day} muted={muted} items={dayItems} setActiveTripId={setActiveTripId} setPage={setPage} />;
      })}
    </div>
  );
}

function YearCalendar({ cursor, items, setActiveTripId, setPage }) {
  const months = Array.from({ length: 12 }, (_, month) => new Date(cursor.getFullYear(), month, 1));
  return (
    <div className="year-grid">
      {months.map((monthDate) => {
        const monthItems = items.filter((item) => {
          const d = new Date(item.date + "T12:00:00");
          return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth();
        });
        return (
          <article className="month-card" key={monthDate.toISOString()}>
            <h4>{monthDate.toLocaleDateString(undefined, { month: "long" })}</h4>
            <p>{monthItems.length} scheduled plan{monthItems.length === 1 ? "" : "s"}</p>
            <div className="month-items">
              {monthItems.slice(0, 4).map((item) => <MiniCalendarItem key={item.id} item={item} setActiveTripId={setActiveTripId} setPage={setPage} />)}
              {monthItems.length > 4 && <span className="more-pill">+{monthItems.length - 4} more</span>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CalendarCell({ iso, date, muted, items, setActiveTripId, setPage }) {
  return (
    <article className={muted ? "calendar-cell muted" : "calendar-cell"}>
      <div className="cell-date"><span>{date.toLocaleDateString(undefined, { weekday: "short" })}</span><strong>{date.getDate()}</strong></div>
      <div className="cell-items">
        {items.slice(0, 4).map((item) => <MiniCalendarItem key={item.id + iso} item={item} setActiveTripId={setActiveTripId} setPage={setPage} />)}
        {items.length > 4 && <span className="more-pill">+{items.length - 4} more</span>}
      </div>
    </article>
  );
}

function MiniCalendarItem({ item, setActiveTripId, setPage }) {
  const category = getCategory(item.category);
  return (
    <button className="mini-calendar-item" style={{ "--accent": category.accent }} onClick={() => { setActiveTripId(item.tripId); setPage("itinerary"); }}>
      <span>{item.time || "Any"}</span> {category.emoji} {item.title}<em>{item.tripName}</em>
    </button>
  );
}

function IdeaCard({ idea, onEdit, onVote }) {
  const category = getCategory(idea.category);
  return (
    <article className="idea-card" style={{ "--accent": category.accent }} onClick={onEdit}>
      <div className="idea-topline">
        <span className="category-badge">{category.emoji} {category.label}</span>
        <button className="vote-button" onClick={(e) => { e.stopPropagation(); onVote(); }}>♡ {idea.votes}</button>
      </div>
      <h4>{idea.title}</h4>
      {idea.notes && <p>{idea.notes}</p>}
      <div className="card-footer">
        {idea.date ? <span><CalendarDays size={14} /> {formatDateLabel(idea.date, { short: true })} {idea.time ? `• ${idea.time}` : idea.timeOfDay ? `• ${getTimeOfDayLabel(idea.timeOfDay)}` : ""}</span> : <span><Clock size={14} /> {idea.timeOfDay ? getTimeOfDayLabel(idea.timeOfDay) : "Click to schedule"}</span>}
        {idea.link && <span><LinkIcon size={14} /> Link saved</span>}
      </div>
    </article>
  );
}

function TimelineItem({ idea, onEdit }) {
  const category = getCategory(idea.category);
  return (
    <button className="timeline-item" style={{ "--accent": category.accent }} onClick={onEdit}>
      <div className="time-chip">{idea.time || getTimeOfDayLabel(idea.timeOfDay) || "Anytime"}</div>
      <div>
        <span>{category.emoji} {category.label}</span>
        <strong>{idea.title}</strong>
        {idea.notes && <p>{idea.notes}</p>}
        {idea.link && <em><LinkIcon size={13} /> Link attached</em>}
      </div>
    </button>
  );
}

const styles = `
:root { color: #f8fafc; background: #06101f; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; background: radial-gradient(circle at top left, rgba(56, 189, 248, .25), transparent 30rem), radial-gradient(circle at top right, rgba(236, 72, 153, .22), transparent 34rem), linear-gradient(135deg, #070d1a 0%, #0b1324 52%, #10172a 100%); }
button, input, textarea, select { font: inherit; }
.app-shell { min-height: 100vh; padding-bottom: 64px; }
.hero { position: relative; overflow: hidden; padding: 24px; border-bottom: 1px solid rgba(255,255,255,.1); }
.orb { position: absolute; border-radius: 999px; filter: blur(36px); opacity: .35; pointer-events: none; }
.orb-one { width: 320px; height: 320px; background: #38bdf8; top: -140px; left: -120px; }
.orb-two { width: 360px; height: 360px; background: #ec4899; right: -130px; bottom: -180px; }
.topbar, .hero-content, .workspace { max-width: 1240px; margin: 0 auto; position: relative; z-index: 1; }
.topbar { display: flex; align-items: center; gap: 14px; }
.brand-mark { width: 50px; height: 50px; border-radius: 18px; display: grid; place-items: center; background: linear-gradient(135deg, #ffffff, #bdd7ff); color: #0b1425; box-shadow: 0 18px 60px rgba(88,166,255,.35); }
.topbar h1, .topbar p, .hero h2, .hero p { margin: 0; }
.topbar h1 { font-size: 22px; letter-spacing: -.04em; }
.eyebrow { color: #93a4bd; text-transform: uppercase; letter-spacing: .14em; font-size: 11px; font-weight: 900; }
.top-actions { margin-left: auto; display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.ghost-button, .icon-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); color: white; padding: 10px 14px; border-radius: 999px; cursor: pointer; font-weight: 850; }
.hero-content { display: grid; grid-template-columns: 1fr 390px; gap: 32px; align-items: end; padding: 68px 0 30px; }
.pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.1); padding: 9px 13px; border-radius: 999px; color: #dbeafe; font-weight: 900; font-size: 13px; }
.hero h2 { margin-top: 18px; font-size: clamp(42px, 8vw, 76px); line-height: .92; letter-spacing: -.08em; max-width: 760px; }
.hero-subtitle { max-width: 720px; color: #cbd5e1; font-size: 17px; line-height: 1.65; margin-top: 20px !important; }
.hero-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.hero-meta span { display: inline-flex; align-items: center; gap: 7px; padding: 10px 12px; border-radius: 999px; background: rgba(15,23,42,.64); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; font-size: 13px; }
.hero-card, .panel, .modal, .empty-start { background: rgba(10, 18, 34, .76); border: 1px solid rgba(255,255,255,.12); box-shadow: 0 24px 80px rgba(0,0,0,.35); backdrop-filter: blur(22px); }
.hero-card { border-radius: 32px; padding: 24px; }
.hero-card p { color: #cbd5e1; font-weight: 900; }
.trip-select { margin-top: 10px; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
.stat-grid div { background: rgba(255,255,255,.07); border-radius: 20px; padding: 14px; }
.stat-grid strong { display: block; font-size: 27px; letter-spacing: -.04em; }
.stat-grid span { color: #94a3b8; font-size: 12px; font-weight: 800; }
.workspace { padding: 24px; }
.page-tabs { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.tab { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,.11); background: rgba(255,255,255,.065); color: #dbeafe; border-radius: 999px; padding: 11px 14px; font-weight: 950; cursor: pointer; }
.tab.active { background: white; color: #0f172a; }
.panel, .empty-start { border-radius: 34px; padding: 22px; }
.section-heading { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 18px; }
.section-heading h3, .empty-start h3 { margin: 4px 0 0; font-size: 28px; letter-spacing: -.05em; }
.mini-count { color: #cbd5e1; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); padding: 8px 11px; border-radius: 999px; font-size: 12px; font-weight: 900; white-space: nowrap; }
.add-form { display: grid; grid-template-columns: 1.2fr .75fr 1fr 1fr auto; gap: 10px; padding: 14px; border-radius: 26px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); }
.add-form textarea { grid-column: 1 / 5; min-height: 58px; }
.date-time-row { display: grid; grid-template-columns: 1.1fr .7fr 1fr; gap: 8px; }
input, textarea, select { width: 100%; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.08); color: #f8fafc; border-radius: 16px; padding: 12px 13px; outline: none; }
select option { background: #0f172a; color: white; }
textarea { min-height: 86px; resize: vertical; }
input:focus, textarea:focus, select:focus { border-color: rgba(147,197,253,.72); box-shadow: 0 0 0 4px rgba(59,130,246,.15); }
.primary-button, .danger-button { border: 0; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 17px; padding: 12px 15px; font-weight: 950; cursor: pointer; }
.primary-button { background: linear-gradient(135deg, #dbeafe, #fbcfe8); color: #0f172a; box-shadow: 0 18px 40px rgba(59,130,246,.18); }
.primary-button:disabled { opacity: .48; cursor: not-allowed; }
.danger-button { background: rgba(239,68,68,.14); color: #fecaca; border: 1px solid rgba(239,68,68,.35); }
.full { width: 100%; }
.category-cloud { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0; }
.category-chip { border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.06); color: #e2e8f0; border-radius: 999px; padding: 9px 11px; cursor: pointer; font-size: 13px; font-weight: 900; }
.category-chip span { color: #93c5fd; margin-left: 5px; }
.category-chip.active { background: white; color: #0f172a; }
.idea-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.idea-card { border: 1px solid rgba(255,255,255,.12); background: linear-gradient(135deg, rgba(255,255,255,.1), rgba(255,255,255,.045)); border-radius: 24px; padding: 16px; cursor: pointer; position: relative; overflow: hidden; min-height: 160px; }
.idea-card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 5px; background: var(--accent); }
.idea-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.24); transition: .18s ease; }
.idea-topline { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.category-badge { color: #e2e8f0; background: rgba(255,255,255,.08); padding: 7px 9px; border-radius: 999px; font-weight: 950; font-size: 12px; }
.vote-button { border: 0; background: rgba(255,255,255,.1); color: white; border-radius: 999px; padding: 7px 10px; font-weight: 950; cursor: pointer; }
.idea-card h4 { margin: 14px 0 6px; font-size: 18px; letter-spacing: -.03em; }
.idea-card p { margin: 0; color: #cbd5e1; line-height: 1.45; font-size: 14px; }
.card-footer { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 13px; color: #94a3b8; font-size: 12px; font-weight: 850; }
.card-footer span { display: inline-flex; align-items: center; gap: 5px; }
.days-stack { display: grid; gap: 14px; }
.day-card { background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.1); border-radius: 27px; padding: 16px; }
.day-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.day-header p, .day-header h4 { margin: 0; }
.day-header p { color: #93a4bd; font-weight: 950; font-size: 12px; text-transform: uppercase; letter-spacing: .1em; }
.day-header h4 { font-size: 21px; letter-spacing: -.04em; }
.day-header span { color: #cbd5e1; font-size: 12px; font-weight: 950; padding: 8px 10px; border-radius: 999px; background: rgba(255,255,255,.08); }
.empty-day, .empty-state { width: 100%; border: 1px dashed rgba(255,255,255,.18); background: rgba(255,255,255,.04); color: #94a3b8; border-radius: 20px; padding: 18px; text-align: center; }
.empty-start { max-width: 720px; margin: 46px auto; text-align: center; padding: 42px; }
.empty-start p:not(.eyebrow) { color: #cbd5e1; line-height: 1.6; }
.empty-icon { width: 70px; height: 70px; border-radius: 26px; background: linear-gradient(135deg, #dbeafe, #fbcfe8); color: #0f172a; display: grid; place-items: center; margin: 0 auto 16px; }
.timeline { display: grid; gap: 10px; }
.timeline-item { width: 100%; text-align: left; border: 1px solid rgba(255,255,255,.1); background: rgba(2,6,23,.36); border-radius: 20px; padding: 12px; display: grid; grid-template-columns: 92px 1fr; gap: 12px; color: white; cursor: pointer; }
.timeline-item:hover { border-color: rgba(255,255,255,.24); }
.time-chip { color: #0f172a; background: linear-gradient(135deg, #ffffff, #dbeafe); border-radius: 15px; display: grid; place-items: center; min-height: 56px; font-weight: 950; }
.timeline-item span { color: var(--accent); font-weight: 950; font-size: 12px; }
.timeline-item strong { display: block; margin-top: 3px; font-size: 16px; letter-spacing: -.03em; }
.timeline-item p { color: #94a3b8; margin: 5px 0 0; font-size: 13px; line-height: 1.35; }
.timeline-item em { color: #cbd5e1; font-style: normal; display: inline-flex; gap: 5px; align-items: center; margin-top: 8px; font-size: 12px; }
.calendar-heading { align-items: flex-start; }
.calendar-controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.calendar-controls strong { min-width: 160px; text-align: center; }
.mode-toggle { display: flex; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); padding: 4px; border-radius: 999px; }
.mode-toggle button { border: 0; color: #dbeafe; background: transparent; border-radius: 999px; padding: 8px 11px; font-weight: 950; cursor: pointer; text-transform: capitalize; }
.mode-toggle button.active { color: #0f172a; background: white; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.calendar-grid.week .calendar-cell { min-height: 360px; }
.calendar-cell { min-height: 150px; border-radius: 20px; padding: 10px; background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.1); overflow: hidden; }
.calendar-cell.muted { opacity: .38; }
.cell-date { display: flex; align-items: center; justify-content: space-between; color: #94a3b8; font-size: 12px; font-weight: 950; margin-bottom: 8px; }
.cell-date strong { color: white; font-size: 17px; }
.cell-items { display: grid; gap: 6px; }
.mini-calendar-item { width: 100%; text-align: left; border: 1px solid rgba(255,255,255,.1); border-left: 4px solid var(--accent); background: rgba(2,6,23,.42); color: white; border-radius: 13px; padding: 8px; font-size: 12px; cursor: pointer; overflow: hidden; }
.mini-calendar-item span { color: #bfdbfe; font-weight: 950; }
.mini-calendar-item em { display: block; color: #94a3b8; font-style: normal; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.more-pill { color: #cbd5e1; font-size: 12px; font-weight: 950; padding: 6px 8px; background: rgba(255,255,255,.08); border-radius: 999px; display: inline-block; }
.year-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.month-card { background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.1); border-radius: 22px; padding: 16px; min-height: 190px; }
.month-card h4 { margin: 0; font-size: 20px; letter-spacing: -.04em; }
.month-card p { margin: 6px 0 12px; color: #94a3b8; font-weight: 850; font-size: 13px; }
.month-items { display: grid; gap: 7px; }
.modal-backdrop { position: fixed; inset: 0; z-index: 20; background: rgba(2,6,23,.74); display: grid; place-items: center; padding: 20px; }
.modal { width: min(580px, 100%); border-radius: 30px; padding: 24px; position: relative; max-height: 92vh; overflow: auto; }
.modal h3 { margin: 4px 38px 18px 0; font-size: 28px; letter-spacing: -.05em; }
.modal label { display: grid; gap: 7px; color: #cbd5e1; font-weight: 850; font-size: 13px; margin-bottom: 12px; }
.close { position: absolute; top: 18px; right: 18px; width: 38px; height: 38px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.08); color: white; cursor: pointer; display: grid; place-items: center; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.logistics-grid, .saved-logistics { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.logistics-grid { margin-bottom: 18px; }
.logistics-form, .logistics-card { background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.1); border-radius: 26px; padding: 16px; display: grid; gap: 10px; }
.form-title, .logistics-list h4 { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; letter-spacing: -.03em; }
.logistics-list { display: grid; gap: 12px; align-content: start; }
.logistics-card label { display: grid; gap: 7px; color: #cbd5e1; font-weight: 850; font-size: 12px; margin: 0; }
.modal-actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 10px; }

.settings-modal .settings-section { background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.1); border-radius: 22px; padding: 16px; margin-bottom: 14px; }
.settings-section strong { display: block; margin-bottom: 5px; }
.settings-section p, .profile-copy { color: #94a3b8; line-height: 1.55; margin: 0 0 12px; }
.theme-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.theme-toggle button, .profile-row { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.07); color: white; border-radius: 18px; padding: 12px; font-weight: 950; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.theme-toggle button.active { background: linear-gradient(135deg, #ffffff, #dbeafe); color: #0f172a; }
.profile-row { width: 100%; justify-content: flex-start; text-align: left; }
.profile-row span { display: grid; gap: 2px; flex: 1; }
.profile-row em { color: #94a3b8; font-style: normal; font-size: 12px; }
.profile-avatar { width: 78px; height: 78px; border-radius: 28px; background: linear-gradient(135deg, #dbeafe, #fbcfe8); color: #0f172a; display: grid; place-items: center; margin-bottom: 14px; }
.profile-preview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
.profile-preview-grid div { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); border-radius: 18px; padding: 14px; display: grid; gap: 4px; }
.profile-preview-grid strong { font-size: 22px; letter-spacing: -.04em; text-transform: capitalize; }
.profile-preview-grid span { color: #94a3b8; font-size: 12px; font-weight: 900; }
.light-mode { color: #0f172a; background: #f8fbff; }
.light-mode body, body:has(.light-mode) { background: radial-gradient(circle at top left, rgba(125, 211, 252, .28), transparent 30rem), radial-gradient(circle at top right, rgba(251, 207, 232, .52), transparent 34rem), linear-gradient(135deg, #f8fbff 0%, #eff6ff 52%, #fdf2f8 100%); }
.light-mode .hero-card, .light-mode .panel, .light-mode .modal, .light-mode .empty-start { background: rgba(255,255,255,.78); border-color: rgba(15,23,42,.1); box-shadow: 0 24px 80px rgba(15,23,42,.12); }
.light-mode .hero-subtitle, .light-mode .hero-card p, .light-mode .empty-start p:not(.eyebrow), .light-mode .idea-card p, .light-mode .timeline-item p, .light-mode .settings-section p, .light-mode .profile-copy { color: #475569; }
.light-mode .ghost-button, .light-mode .icon-button, .light-mode .category-chip, .light-mode .idea-card, .light-mode .day-card, .light-mode .logistics-form, .light-mode .logistics-card, .light-mode .calendar-cell, .light-mode .month-card, .light-mode .settings-modal .settings-section, .light-mode .profile-preview-grid div { background: rgba(255,255,255,.72); color: #0f172a; border-color: rgba(15,23,42,.1); }
.light-mode input, .light-mode textarea, .light-mode select { background: rgba(255,255,255,.86); color: #0f172a; border-color: rgba(15,23,42,.12); }
.light-mode select option { background: white; color: #0f172a; }
.light-mode .category-badge, .light-mode .vote-button, .light-mode .hero-meta span, .light-mode .mini-count, .light-mode .day-header span, .light-mode .mode-toggle, .light-mode .profile-row, .light-mode .theme-toggle button { background: rgba(15,23,42,.06); color: #0f172a; border-color: rgba(15,23,42,.1); }
.light-mode .category-chip.active, .light-mode .mode-toggle button.active { background: #0f172a; color: white; }
.light-mode .cell-date strong, .light-mode .timeline-item, .light-mode .mini-calendar-item, .light-mode .close { color: #0f172a; }
.light-mode .timeline-item, .light-mode .mini-calendar-item { background: rgba(255,255,255,.82); border-color: rgba(15,23,42,.1); }
.light-mode .empty-day, .light-mode .empty-state { color: #64748b; border-color: rgba(15,23,42,.16); background: rgba(255,255,255,.52); }
.light-mode .topbar h1, .light-mode .hero h2, .light-mode .day-header h4, .light-mode .section-heading h3, .light-mode .modal h3 { color: #0f172a; }

@media (max-width: 1000px) { .hero-content { grid-template-columns: 1fr; } .idea-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .logistics-grid, .saved-logistics { grid-template-columns: 1fr; } .year-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .calendar-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .hero, .workspace { padding: 16px; } .topbar { align-items: flex-start; } .top-actions { width: 100%; margin-left: 0; } .hero h2 { font-size: 44px; } .add-form, .two-col, .three-col, .date-time-row, .timeline-item, .idea-grid, .year-grid, .calendar-grid { grid-template-columns: 1fr; } .add-form textarea { grid-column: auto; } .calendar-grid.week .calendar-cell, .calendar-cell { min-height: 120px; } .calendar-controls { justify-content: flex-start; } .section-heading { align-items: flex-start; flex-direction: column; } }
`;
