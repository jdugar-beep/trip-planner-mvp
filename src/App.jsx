import React, { useMemo, useState } from "react";
import { CalendarDays, Plus, Sparkles, Clock, Link as LinkIcon, MapPin, Users, Wand2, X, Edit3, Trash2, CheckCircle2 } from "lucide-react";

const CATEGORIES = [
  { key: "breakfast", label: "Breakfast", emoji: "🥐", accent: "#F59E0B" },
  { key: "lunch", label: "Lunch", emoji: "🥗", accent: "#10B981" },
  { key: "dinner", label: "Dinner", emoji: "🍝", accent: "#EF4444" },
  { key: "activity", label: "Activity", emoji: "🎟️", accent: "#8B5CF6" },
  { key: "drinks", label: "Drinks", emoji: "🍸", accent: "#EC4899" },
  { key: "sightseeing", label: "Sightseeing", emoji: "🏛️", accent: "#3B82F6" },
  { key: "exploring", label: "Exploring", emoji: "🚶", accent: "#14B8A6" },
];

const sampleIdeas = [
  {
    id: crypto.randomUUID(),
    title: "Neighborhood cafe with pastries",
    category: "breakfast",
    link: "https://maps.google.com",
    notes: "Good first morning option. Add the real link later.",
    votes: 5,
    date: "",
    time: "09:30",
  },
  {
    id: crypto.randomUUID(),
    title: "Long lunch somewhere cute",
    category: "lunch",
    link: "",
    notes: "Save a few top lunch spots here and vote with friends.",
    votes: 3,
    date: "",
    time: "13:00",
  },
  {
    id: crypto.randomUUID(),
    title: "Fancy dinner reservation",
    category: "dinner",
    link: "",
    notes: "Mark once booked.",
    votes: 7,
    date: "",
    time: "20:00",
  },
  {
    id: crypto.randomUUID(),
    title: "Museum / gallery stop",
    category: "sightseeing",
    link: "",
    notes: "Could pair with nearby lunch.",
    votes: 4,
    date: "",
    time: "11:30",
  },
];

function formatDateLabel(dateString) {
  if (!dateString) return "Unscheduled";
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
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

export default function App() {
  const [trip, setTrip] = useState({
    name: "Mexico City Birthday Trip",
    location: "Mexico City",
    startDate: "2026-06-18",
    endDate: "2026-06-22",
  });

  const [ideas, setIdeas] = useState(sampleIdeas);
  const [activeCategory, setActiveCategory] = useState("all");
  const [editingIdea, setEditingIdea] = useState(null);
  const [showTripEditor, setShowTripEditor] = useState(false);
  const [newIdea, setNewIdea] = useState({ title: "", category: "breakfast", link: "", notes: "" });

  const tripDates = useMemo(() => getDateRange(trip.startDate, trip.endDate), [trip.startDate, trip.endDate]);
  const scheduledIdeas = ideas.filter((idea) => idea.date).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const unscheduledIdeas = ideas.filter((idea) => !idea.date);
  const filteredIdeas = ideas.filter((idea) => activeCategory === "all" || idea.category === activeCategory);

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = ideas.filter((idea) => idea.category === cat.key).length;
    return acc;
  }, {});

  function addIdea(event) {
    event.preventDefault();
    if (!newIdea.title.trim()) return;
    setIdeas((current) => [
      {
        id: crypto.randomUUID(),
        title: newIdea.title.trim(),
        category: newIdea.category,
        link: newIdea.link.trim(),
        notes: newIdea.notes.trim(),
        votes: 0,
        date: "",
        time: "",
      },
      ...current,
    ]);
    setNewIdea({ title: "", category: newIdea.category, link: "", notes: "" });
  }

  function updateIdea(id, updates) {
    setIdeas((current) => current.map((idea) => (idea.id === id ? { ...idea, ...updates } : idea)));
    setEditingIdea((current) => (current?.id === id ? { ...current, ...updates } : current));
  }

  function deleteIdea(id) {
    setIdeas((current) => current.filter((idea) => idea.id !== id));
    setEditingIdea(null);
  }

  function autoBuildItinerary() {
    if (!tripDates.length) return;

    const defaultTimes = {
      breakfast: "09:30",
      lunch: "13:00",
      dinner: "20:00",
      activity: "15:00",
      drinks: "22:00",
      sightseeing: "11:00",
      exploring: "17:00",
    };

    const pickedByCategory = CATEGORIES.flatMap((cat) => {
      const options = ideas
        .filter((idea) => idea.category === cat.key)
        .sort((a, b) => b.votes - a.votes)
        .slice(0, tripDates.length);
      return options.map((idea, index) => ({ idea, date: tripDates[index % tripDates.length], time: idea.time || defaultTimes[cat.key] }));
    });

    const assignments = new Map(pickedByCategory.map((item) => [item.idea.id, { date: item.date, time: item.time }]));
    setIdeas((current) => current.map((idea) => (assignments.has(idea.id) ? { ...idea, ...assignments.get(idea.id) } : idea)));
  }

  return (
    <div className="app-shell">
      <style>{styles}</style>

      <header className="hero">
        <div className="hero-glow one" />
        <div className="hero-glow two" />
        <nav className="topbar">
          <div className="brand-mark">✦</div>
          <div>
            <p className="eyebrow">Group trip planner</p>
            <h1>It’s a Trip</h1>
          </div>
          <button className="ghost-button" onClick={() => setShowTripEditor(true)}>
            <Edit3 size={16} /> Edit trip
          </button>
        </nav>

        <section className="hero-content">
          <div>
            <p className="pill"><Sparkles size={14} /> Collaborative itinerary board</p>
            <h2>{trip.name}</h2>
            <p className="hero-subtitle">
              Add ideas by category, let everyone vote, then assign each spot to a date and time so your trip turns into a clean itinerary.
            </p>
            <div className="hero-meta">
              <span><MapPin size={16} /> {trip.location || "Add location"}</span>
              <span><CalendarDays size={16} /> {formatDateLabel(trip.startDate)} – {formatDateLabel(trip.endDate)}</span>
              <span><Users size={16} /> Shareable with friends</span>
            </div>
          </div>

          <div className="hero-card">
            <p>Trip status</p>
            <div className="stat-grid">
              <div><strong>{ideas.length}</strong><span>Total ideas</span></div>
              <div><strong>{scheduledIdeas.length}</strong><span>Scheduled</span></div>
              <div><strong>{tripDates.length}</strong><span>Trip days</span></div>
            </div>
            <button className="primary-button full" onClick={autoBuildItinerary} disabled={!tripDates.length}>
              <Wand2 size={17} /> Auto-build draft itinerary
            </button>
          </div>
        </section>
      </header>

      <main className="main-grid">
        <section className="panel add-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Add ideas</p>
              <h3>Planning board</h3>
            </div>
          </div>

          <form className="add-form" onSubmit={addIdea}>
            <input value={newIdea.title} onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })} placeholder="Spot name, restaurant, activity..." />
            <select value={newIdea.category} onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}>
              {CATEGORIES.map((cat) => <option key={cat.key} value={cat.key}>{cat.emoji} {cat.label}</option>)}
            </select>
            <input value={newIdea.link} onChange={(e) => setNewIdea({ ...newIdea, link: e.target.value })} placeholder="Optional link" />
            <textarea value={newIdea.notes} onChange={(e) => setNewIdea({ ...newIdea, notes: e.target.value })} placeholder="Notes, reservation details, why people should vote for it..." />
            <button className="primary-button" type="submit"><Plus size={17} /> Add to trip</button>
          </form>

          <div className="category-cloud">
            <button className={activeCategory === "all" ? "category-chip active" : "category-chip"} onClick={() => setActiveCategory("all")}>All <span>{ideas.length}</span></button>
            {CATEGORIES.map((cat) => (
              <button key={cat.key} className={activeCategory === cat.key ? "category-chip active" : "category-chip"} onClick={() => setActiveCategory(cat.key)}>
                {cat.emoji} {cat.label} <span>{categoryCounts[cat.key]}</span>
              </button>
            ))}
          </div>

          <div className="idea-list">
            {filteredIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} onEdit={() => setEditingIdea(idea)} onVote={() => updateIdea(idea.id, { votes: idea.votes + 1 })} />)}
          </div>
        </section>

        <section className="panel itinerary-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Scheduled plan</p>
              <h3>Your itinerary</h3>
            </div>
            <span className="mini-count">{unscheduledIdeas.length} unscheduled</span>
          </div>

          {!tripDates.length ? (
            <div className="empty-state">Add trip start and end dates to build an itinerary.</div>
          ) : (
            <div className="days-stack">
              {tripDates.map((date) => {
                const dayItems = scheduledIdeas.filter((idea) => idea.date === date);
                return (
                  <article className="day-card" key={date}>
                    <div className="day-header">
                      <div>
                        <p>{new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" })}</p>
                        <h4>{formatDateLabel(date)}</h4>
                      </div>
                      <span>{dayItems.length} plans</span>
                    </div>
                    {dayItems.length === 0 ? (
                      <button className="empty-day" onClick={() => setActiveCategory("all")}>No plans yet. Assign cards here.</button>
                    ) : (
                      <div className="timeline">
                        {dayItems.map((idea) => <TimelineItem key={idea.id} idea={idea} onEdit={() => setEditingIdea(idea)} />)}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showTripEditor && (
        <div className="modal-backdrop" onClick={() => setShowTripEditor(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowTripEditor(false)}><X size={18} /></button>
            <p className="eyebrow">Create / edit trip</p>
            <h3>Trip details</h3>
            <label>Trip name<input value={trip.name} onChange={(e) => setTrip({ ...trip, name: e.target.value })} /></label>
            <label>Location<input value={trip.location} onChange={(e) => setTrip({ ...trip, location: e.target.value })} /></label>
            <div className="two-col">
              <label>Start date<input type="date" value={trip.startDate} onChange={(e) => setTrip({ ...trip, startDate: e.target.value })} /></label>
              <label>End date<input type="date" value={trip.endDate} onChange={(e) => setTrip({ ...trip, endDate: e.target.value })} /></label>
            </div>
            <button className="primary-button full" onClick={() => setShowTripEditor(false)}><CheckCircle2 size={17} /> Save trip</button>
          </div>
        </div>
      )}

      {editingIdea && (
        <div className="modal-backdrop" onClick={() => setEditingIdea(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setEditingIdea(null)}><X size={18} /></button>
            <p className="eyebrow">Quick edit</p>
            <h3>{editingIdea.title}</h3>
            <label>Title<input value={editingIdea.title} onChange={(e) => updateIdea(editingIdea.id, { title: e.target.value })} /></label>
            <div className="two-col">
              <label>Category<select value={editingIdea.category} onChange={(e) => updateIdea(editingIdea.id, { category: e.target.value })}>{CATEGORIES.map((cat) => <option key={cat.key} value={cat.key}>{cat.emoji} {cat.label}</option>)}</select></label>
              <label>Votes<input type="number" value={editingIdea.votes} onChange={(e) => updateIdea(editingIdea.id, { votes: Number(e.target.value) })} /></label>
            </div>
            <div className="two-col">
              <label>Date<select value={editingIdea.date} onChange={(e) => updateIdea(editingIdea.id, { date: e.target.value })}><option value="">Unscheduled</option>{tripDates.map((date) => <option key={date} value={date}>{formatDateLabel(date)}</option>)}</select></label>
              <label>Time<input type="time" value={editingIdea.time} onChange={(e) => updateIdea(editingIdea.id, { time: e.target.value })} /></label>
            </div>
            <label>Link<input value={editingIdea.link} onChange={(e) => updateIdea(editingIdea.id, { link: e.target.value })} /></label>
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
        {idea.date ? <span><CalendarDays size={14} /> {formatDateLabel(idea.date)}</span> : <span><Clock size={14} /> Unscheduled</span>}
        {idea.link && <span><LinkIcon size={14} /> Link saved</span>}
      </div>
    </article>
  );
}

function TimelineItem({ idea, onEdit }) {
  const category = getCategory(idea.category);
  return (
    <button className="timeline-item" style={{ "--accent": category.accent }} onClick={onEdit}>
      <div className="time-chip">{idea.time || "Anytime"}</div>
      <div>
        <span>{category.emoji} {category.label}</span>
        <strong>{idea.title}</strong>
        {idea.notes && <p>{idea.notes}</p>}
      </div>
    </button>
  );
}

const styles = `
  :root {
    color: #f8fafc;
    background: #08111f;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-width: 320px; background: radial-gradient(circle at top left, #263b6f 0, transparent 32rem), radial-gradient(circle at top right, #5b254d 0, transparent 34rem), #07111f; }
  button, input, textarea, select { font: inherit; }
  .app-shell { min-height: 100vh; padding-bottom: 60px; }
  .hero { position: relative; overflow: hidden; padding: 24px; border-bottom: 1px solid rgba(255,255,255,.1); }
  .hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,.08), transparent 35%, rgba(255,255,255,.04)); pointer-events: none; }
  .hero-glow { position: absolute; width: 320px; height: 320px; border-radius: 999px; filter: blur(34px); opacity: .35; }
  .hero-glow.one { background: #3b82f6; top: -140px; left: -80px; }
  .hero-glow.two { background: #ec4899; right: -90px; bottom: -160px; }
  .topbar, .hero-content, .main-grid { max-width: 1180px; margin: 0 auto; position: relative; z-index: 1; }
  .topbar { display: flex; align-items: center; gap: 14px; }
  .brand-mark { width: 48px; height: 48px; border-radius: 18px; display: grid; place-items: center; background: linear-gradient(135deg, #ffffff, #bcd2ff); color: #0b1425; font-weight: 900; font-size: 24px; box-shadow: 0 18px 60px rgba(88, 166, 255, .35); }
  .topbar h1, .topbar p, .hero h2, .hero p { margin: 0; }
  .topbar h1 { font-size: 22px; letter-spacing: -.04em; }
  .eyebrow { color: #93a4bd; text-transform: uppercase; letter-spacing: .14em; font-size: 11px; font-weight: 800; }
  .ghost-button { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); color: white; padding: 10px 14px; border-radius: 999px; cursor: pointer; }
  .hero-content { display: grid; grid-template-columns: 1fr 360px; gap: 32px; align-items: end; padding: 70px 0 34px; }
  .pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.1); padding: 9px 13px; border-radius: 999px; color: #dbeafe; font-weight: 800; font-size: 13px; }
  .hero h2 { margin-top: 18px; font-size: clamp(42px, 8vw, 78px); line-height: .92; letter-spacing: -.08em; max-width: 760px; }
  .hero-subtitle { max-width: 720px; color: #cbd5e1; font-size: 17px; line-height: 1.65; margin-top: 20px !important; }
  .hero-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
  .hero-meta span { display: inline-flex; align-items: center; gap: 7px; padding: 10px 12px; border-radius: 999px; background: rgba(15,23,42,.64); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; font-size: 13px; }
  .hero-card, .panel, .modal { background: rgba(12, 21, 37, .74); border: 1px solid rgba(255,255,255,.12); box-shadow: 0 24px 80px rgba(0,0,0,.35); backdrop-filter: blur(22px); }
  .hero-card { border-radius: 32px; padding: 24px; }
  .hero-card p { color: #cbd5e1; font-weight: 800; }
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
  .stat-grid div { background: rgba(255,255,255,.07); border-radius: 20px; padding: 14px; }
  .stat-grid strong { display: block; font-size: 27px; letter-spacing: -.04em; }
  .stat-grid span { color: #94a3b8; font-size: 12px; font-weight: 700; }
  .main-grid { display: grid; grid-template-columns: minmax(0, .92fr) minmax(360px, 1.08fr); gap: 22px; padding: 24px; }
  .panel { border-radius: 34px; padding: 22px; min-width: 0; }
  .section-heading { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 18px; }
  .section-heading h3 { margin: 4px 0 0; font-size: 25px; letter-spacing: -.04em; }
  .mini-count { color: #cbd5e1; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); padding: 8px 11px; border-radius: 999px; font-size: 12px; font-weight: 800; }
  .add-form { display: grid; gap: 10px; padding: 14px; border-radius: 26px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); }
  input, textarea, select { width: 100%; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.08); color: #f8fafc; border-radius: 16px; padding: 12px 13px; outline: none; }
  select option { background: #0f172a; color: white; }
  textarea { min-height: 86px; resize: vertical; }
  input:focus, textarea:focus, select:focus { border-color: rgba(147,197,253,.72); box-shadow: 0 0 0 4px rgba(59,130,246,.15); }
  .primary-button, .danger-button { border: 0; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 17px; padding: 12px 15px; font-weight: 900; cursor: pointer; }
  .primary-button { background: linear-gradient(135deg, #dbeafe, #fbcfe8); color: #0f172a; box-shadow: 0 18px 40px rgba(59,130,246,.18); }
  .primary-button:disabled { opacity: .5; cursor: not-allowed; }
  .danger-button { background: rgba(239,68,68,.14); color: #fecaca; border: 1px solid rgba(239,68,68,.35); }
  .full { width: 100%; }
  .category-cloud { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0; }
  .category-chip { border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.06); color: #e2e8f0; border-radius: 999px; padding: 9px 11px; cursor: pointer; font-size: 13px; font-weight: 800; }
  .category-chip span { color: #93c5fd; margin-left: 5px; }
  .category-chip.active { background: white; color: #0f172a; }
  .idea-list { display: grid; gap: 12px; max-height: 760px; overflow: auto; padding-right: 4px; }
  .idea-card { border: 1px solid rgba(255,255,255,.12); background: linear-gradient(135deg, rgba(255,255,255,.1), rgba(255,255,255,.045)); border-radius: 24px; padding: 16px; cursor: pointer; position: relative; overflow: hidden; }
  .idea-card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 5px; background: var(--accent); }
  .idea-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.24); transition: .18s ease; }
  .idea-topline { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .category-badge { color: #e2e8f0; background: rgba(255,255,255,.08); padding: 7px 9px; border-radius: 999px; font-weight: 900; font-size: 12px; }
  .vote-button { border: 0; background: rgba(255,255,255,.1); color: white; border-radius: 999px; padding: 7px 10px; font-weight: 900; cursor: pointer; }
  .idea-card h4 { margin: 14px 0 6px; font-size: 18px; letter-spacing: -.03em; }
  .idea-card p { margin: 0; color: #cbd5e1; line-height: 1.45; font-size: 14px; }
  .card-footer { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 13px; color: #94a3b8; font-size: 12px; font-weight: 800; }
  .card-footer span { display: inline-flex; align-items: center; gap: 5px; }
  .days-stack { display: grid; gap: 14px; }
  .day-card { background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.1); border-radius: 27px; padding: 16px; }
  .day-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .day-header p, .day-header h4 { margin: 0; }
  .day-header p { color: #93a4bd; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: .1em; }
  .day-header h4 { font-size: 21px; letter-spacing: -.04em; }
  .day-header span { color: #cbd5e1; font-size: 12px; font-weight: 900; padding: 8px 10px; border-radius: 999px; background: rgba(255,255,255,.08); }
  .empty-day, .empty-state { width: 100%; border: 1px dashed rgba(255,255,255,.18); background: rgba(255,255,255,.04); color: #94a3b8; border-radius: 20px; padding: 18px; text-align: center; }
  .timeline { display: grid; gap: 10px; }
  .timeline-item { width: 100%; text-align: left; border: 1px solid rgba(255,255,255,.1); background: rgba(2,6,23,.36); border-radius: 20px; padding: 12px; display: grid; grid-template-columns: 88px 1fr; gap: 12px; color: white; cursor: pointer; }
  .timeline-item:hover { border-color: rgba(255,255,255,.24); }
  .time-chip { color: #0f172a; background: linear-gradient(135deg, #ffffff, #dbeafe); border-radius: 15px; display: grid; place-items: center; min-height: 54px; font-weight: 950; }
  .timeline-item span { color: var(--accent); font-weight: 950; font-size: 12px; }
  .timeline-item strong { display: block; margin-top: 3px; font-size: 16px; letter-spacing: -.03em; }
  .timeline-item p { color: #94a3b8; margin: 5px 0 0; font-size: 13px; line-height: 1.35; }
  .modal-backdrop { position: fixed; inset: 0; z-index: 20; background: rgba(2,6,23,.74); display: grid; place-items: center; padding: 20px; }
  .modal { width: min(560px, 100%); border-radius: 30px; padding: 24px; position: relative; max-height: 92vh; overflow: auto; }
  .modal h3 { margin: 4px 38px 18px 0; font-size: 28px; letter-spacing: -.05em; }
  .modal label { display: grid; gap: 7px; color: #cbd5e1; font-weight: 850; font-size: 13px; margin-bottom: 12px; }
  .close { position: absolute; top: 18px; right: 18px; width: 38px; height: 38px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.08); color: white; cursor: pointer; display: grid; place-items: center; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .modal-actions { display: flex; justify-content: space-between; gap: 12px; margin-top: 10px; }
  @media (max-width: 920px) { .hero-content, .main-grid { grid-template-columns: 1fr; } .hero-content { padding-top: 42px; } }
  @media (max-width: 640px) { .hero, .main-grid { padding: 16px; } .topbar { align-items: flex-start; } .ghost-button { padding: 9px 10px; font-size: 12px; } .hero h2 { font-size: 44px; } .hero-card, .panel { border-radius: 26px; } .two-col, .timeline-item { grid-template-columns: 1fr; } .time-chip { min-height: 42px; place-items: center start; padding-left: 12px; } }
`;
