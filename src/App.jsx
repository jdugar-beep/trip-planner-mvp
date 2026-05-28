import React, { useMemo, useState } from "react";

const categories = [
  { name: "Breakfast", emoji: "🥐", accent: "bg-amber-100 text-amber-800 border-amber-200" },
  { name: "Lunch", emoji: "🥗", accent: "bg-lime-100 text-lime-800 border-lime-200" },
  { name: "Dinner", emoji: "🍝", accent: "bg-rose-100 text-rose-800 border-rose-200" },
  { name: "Activities", emoji: "🎟️", accent: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  { name: "Cafes", emoji: "☕", accent: "bg-orange-100 text-orange-800 border-orange-200" },
  { name: "Bars", emoji: "🍸", accent: "bg-purple-100 text-purple-800 border-purple-200" },
  { name: "Shopping", emoji: "🛍️", accent: "bg-pink-100 text-pink-800 border-pink-200" },
  { name: "Must-do", emoji: "⭐", accent: "bg-sky-100 text-sky-800 border-sky-200" },
];

const demoTripDays = [
  { id: "day-1", label: "Fri", date: "2026-07-10", vibe: "Arrival + easy wins" },
  { id: "day-2", label: "Sat", date: "2026-07-11", vibe: "Big exploring day" },
  { id: "day-3", label: "Sun", date: "2026-07-12", vibe: "Cute neighborhoods" },
  { id: "day-4", label: "Mon", date: "2026-07-13", vibe: "Last perfect bites" },
];

const demoIdeas = [
  { id: "idea-1", title: "Cute neighborhood cafe", category: "Breakfast", votes: 6, link: "", notes: "Good for first morning. Casual and walkable.", dayId: null, time: "09:30", status: "idea" },
  { id: "idea-2", title: "Famous brunch spot", category: "Breakfast", votes: 4, link: "", notes: "Make reservation if this wins.", dayId: null, time: "10:00", status: "idea" },
  { id: "idea-3", title: "Museum afternoon", category: "Activities", votes: 8, link: "", notes: "Book tickets ahead and pair with a cafe nearby.", dayId: null, time: "13:00", status: "idea" },
  { id: "idea-4", title: "Rooftop dinner", category: "Dinner", votes: 9, link: "", notes: "Splurge meal. Best sunset option.", dayId: null, time: "20:00", status: "idea" },
  { id: "idea-5", title: "Cocktail bar", category: "Bars", votes: 5, link: "", notes: "After dinner. Good group photos.", dayId: null, time: "22:00", status: "idea" },
];

function categoryMeta(name) {
  return categories.find((category) => category.name === name) || categories[0];
}

function defaultTime(category) {
  return {
    Breakfast: "09:30",
    Lunch: "13:00",
    Dinner: "20:00",
    Activities: "15:00",
    Cafes: "11:00",
    Bars: "22:00",
    Shopping: "16:00",
    "Must-do": "12:00",
  }[category] || "12:00";
}

function shortDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function App() {
  const [tripName, setTripName] = useState("Barcelona Group Trip");
  const [days, setDays] = useState(demoTripDays);
  const [ideas, setIdeas] = useState(demoIdeas);
  const [selectedCard, setSelectedCard] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [newIdea, setNewIdea] = useState({ title: "", category: "Breakfast", link: "", notes: "" });

  const boardIdeas = useMemo(() => ideas.filter((idea) => !idea.dayId), [ideas]);
  const filteredBoardIdeas = useMemo(() => {
    const source = activeCategory === "All" ? boardIdeas : boardIdeas.filter((idea) => idea.category === activeCategory);
    return [...source].sort((a, b) => b.votes - a.votes);
  }, [activeCategory, boardIdeas]);
  const scheduledIdeas = useMemo(() => ideas.filter((idea) => idea.dayId), [ideas]);
  const totalVotes = ideas.reduce((sum, idea) => sum + idea.votes, 0);
  const topPick = [...ideas].sort((a, b) => b.votes - a.votes)[0];

  function addIdea(e) {
    e.preventDefault();
    if (!newIdea.title.trim()) return;
    const card = {
      id: crypto.randomUUID(),
      title: newIdea.title.trim(),
      category: newIdea.category,
      link: newIdea.link.trim(),
      notes: newIdea.notes.trim(),
      votes: 0,
      dayId: null,
      time: defaultTime(newIdea.category),
      status: "idea",
    };
    setIdeas((prev) => [card, ...prev]);
    setNewIdea({ title: "", category: "Breakfast", link: "", notes: "" });
  }

  function vote(id, amount) {
    setIdeas((prev) => prev.map((idea) => idea.id === id ? { ...idea, votes: Math.max(0, idea.votes + amount) } : idea));
  }

  function updateCard(id, patch) {
    setIdeas((prev) => prev.map((idea) => idea.id === id ? { ...idea, ...patch } : idea));
    setSelectedCard((current) => current?.id === id ? { ...current, ...patch } : current);
  }

  function deleteCard(id) {
    setIdeas((prev) => prev.filter((idea) => idea.id !== id));
    setSelectedCard(null);
  }

  function buildItinerary() {
    const selected = [];
    const unscheduled = ideas.filter((idea) => !idea.dayId);

    categories.forEach(({ name }) => {
      const ranked = unscheduled.filter((idea) => idea.category === name).sort((a, b) => b.votes - a.votes);
      const maxPerCategory = ["Breakfast", "Lunch", "Dinner"].includes(name) ? days.length : Math.min(days.length, 3);
      selected.push(...ranked.slice(0, maxPerCategory));
    });

    const assigned = selected.map((idea, index) => ({
      ...idea,
      dayId: days[index % days.length].id,
      time: idea.time || defaultTime(idea.category),
      status: "planned",
    }));

    setIdeas((prev) => prev.map((idea) => assigned.find((item) => item.id === idea.id) || idea));
  }

  function clearItinerary() {
    setIdeas((prev) => prev.map((idea) => ({ ...idea, dayId: null, status: "idea" })));
  }

  function moveCard(id, dayId) {
    updateCard(id, { dayId, status: dayId ? "planned" : "idea" });
  }

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#201914]">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-rose-200/50 blur-3xl" />
        <div className="absolute right-0 top-28 h-80 w-80 rounded-full bg-sky-200/60 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />
      </div>

      <header className="px-4 pt-5 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-xl shadow-stone-300/30 backdrop-blur-xl">
          <div className="grid gap-6 p-5 md:grid-cols-[1.2fr_0.8fr] md:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#201914] px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">Trip Studio</span>
                <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-bold text-stone-500">Collaborative planning board</span>
              </div>
              <input
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="mt-5 w-full bg-transparent text-4xl font-black tracking-tight outline-none md:text-6xl"
              />
              <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-stone-600">
                Drop ideas, let the group vote, then turn the winners into a polished itinerary you can edit in seconds.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={buildItinerary} className="rounded-2xl bg-[#201914] px-5 py-3 text-sm font-black text-white shadow-lg shadow-stone-400/40 transition hover:-translate-y-0.5">
                  ✨ Build itinerary
                </button>
                <button onClick={clearItinerary} className="rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-black text-stone-700 transition hover:-translate-y-0.5">
                  Reset board
                </button>
              </div>
            </div>

            <div className="grid content-end gap-3 sm:grid-cols-2">
              <Kpi label="Ideas" value={ideas.length} hint="submitted" />
              <Kpi label="Planned" value={scheduledIdeas.length} hint="on itinerary" />
              <Kpi label="Votes" value={totalVotes} hint="group signal" />
              <Kpi label="Top pick" value={topPick ? topPick.votes : 0} hint={topPick ? topPick.title : "none yet"} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 md:px-6 lg:grid-cols-[400px_1fr] lg:px-8">
        <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-stone-300/20 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Add spot</p>
                <h2 className="mt-1 text-2xl font-black">New idea</h2>
              </div>
              <span className="rounded-2xl bg-stone-100 px-3 py-2 text-xl">📍</span>
            </div>

            <form onSubmit={addIdea} className="mt-5 space-y-3">
              <Input value={newIdea.title} onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })} placeholder="Restaurant, museum, cafe..." />
              <select value={newIdea.category} onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 font-bold outline-none focus:border-stone-500">
                {categories.map((category) => <option key={category.name}>{category.name}</option>)}
              </select>
              <Input value={newIdea.link} onChange={(e) => setNewIdea({ ...newIdea, link: e.target.value })} placeholder="Paste Google Maps / TikTok / Resy link" />
              <textarea value={newIdea.notes} onChange={(e) => setNewIdea({ ...newIdea, notes: e.target.value })} placeholder="Why should this make the trip?" className="min-h-24 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 font-medium outline-none focus:border-stone-500" />
              <button className="w-full rounded-2xl bg-rose-500 px-4 py-3 font-black text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5">
                Add to voting board
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-xl shadow-stone-300/20 backdrop-blur-xl">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Voting board</p>
                <h2 className="mt-1 text-2xl font-black">Group picks</h2>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">{filteredBoardIdeas.length} open</span>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {["All", ...categories.map((category) => category.name)].map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${activeCategory === category ? "border-[#201914] bg-[#201914] text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"}`}
                >
                  {category === "All" ? "All" : `${categoryMeta(category).emoji} ${category}`}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {filteredBoardIdeas.length === 0 && <EmptyState text="No open ideas here. Add one or reset the itinerary." />}
              {filteredBoardIdeas.map((idea) => <Card key={idea.id} idea={idea} onOpen={() => setSelectedCard(idea)} onVote={vote} onMove={moveCard} days={days} compact />)}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          <div className="rounded-[2rem] border border-white/70 bg-white/70 p-4 shadow-xl shadow-stone-300/20 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Itinerary</p>
                <h2 className="text-2xl font-black">Draft schedule</h2>
              </div>
              <p className="max-w-md text-sm font-medium text-stone-500">Click any card to edit its day, time, link, notes, votes, or category.</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {days.map((day, dayIndex) => {
                const dayCards = ideas.filter((idea) => idea.dayId === day.id).sort((a, b) => a.time.localeCompare(b.time));
                return (
                  <div key={day.id} className="min-h-[360px] rounded-[1.75rem] border border-stone-200 bg-[#fbfaf7] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#201914] text-sm font-black text-white">{dayIndex + 1}</span>
                          <div>
                            <h3 className="text-xl font-black">{day.label}</h3>
                            <p className="text-sm font-bold text-stone-500">{shortDate(day.date)}</p>
                          </div>
                        </div>
                        <input value={day.vibe} onChange={(e) => setDays((prev) => prev.map((d) => d.id === day.id ? { ...d, vibe: e.target.value } : d))} className="mt-3 w-full bg-transparent text-sm font-bold text-stone-500 outline-none" />
                      </div>
                      <input value={day.date} onChange={(e) => setDays((prev) => prev.map((d) => d.id === day.id ? { ...d, date: e.target.value } : d))} type="date" className="rounded-2xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold outline-none" />
                    </div>

                    <div className="mt-4 space-y-3">
                      {dayCards.length === 0 && <EmptyState text="No plans yet. Build the itinerary or move a voted card here." />}
                      {dayCards.map((idea) => <Card key={idea.id} idea={idea} onOpen={() => setSelectedCard(idea)} onVote={vote} onMove={moveCard} days={days} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-stone-950/35 p-3 backdrop-blur-sm md:p-5" onClick={() => setSelectedCard(null)}>
          <div className="ml-auto flex h-full max-w-xl flex-col overflow-hidden rounded-[2rem] bg-[#fbfaf7] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-stone-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-500">Quick edit</p>
                  <h2 className="mt-1 text-3xl font-black">Plan details</h2>
                </div>
                <button onClick={() => setSelectedCard(null)} className="rounded-full bg-stone-100 px-4 py-2 text-lg font-black transition hover:bg-stone-200">×</button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <Field label="Title">
                <Input value={selectedCard.title} onChange={(e) => updateCard(selectedCard.id, { title: e.target.value })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select value={selectedCard.category} onChange={(e) => updateCard(selectedCard.id, { category: e.target.value, time: selectedCard.time || defaultTime(e.target.value) })} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 font-bold outline-none focus:border-stone-500">
                    {categories.map((category) => <option key={category.name}>{category.name}</option>)}
                  </select>
                </Field>
                <Field label="Votes">
                  <Input type="number" value={selectedCard.votes} onChange={(e) => updateCard(selectedCard.id, { votes: Number(e.target.value) })} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Day">
                  <select value={selectedCard.dayId || ""} onChange={(e) => moveCard(selectedCard.id, e.target.value || null)} className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 font-bold outline-none focus:border-stone-500">
                    <option value="">Idea board</option>
                    {days.map((day) => <option key={day.id} value={day.id}>{day.label} — {day.date}</option>)}
                  </select>
                </Field>
                <Field label="Time">
                  <Input type="time" value={selectedCard.time} onChange={(e) => updateCard(selectedCard.id, { time: e.target.value })} />
                </Field>
              </div>

              <Field label="Link">
                <Input value={selectedCard.link} onChange={(e) => updateCard(selectedCard.id, { link: e.target.value })} placeholder="https://..." />
              </Field>

              <Field label="Notes">
                <textarea value={selectedCard.notes} onChange={(e) => updateCard(selectedCard.id, { notes: e.target.value })} className="min-h-36 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 font-medium outline-none focus:border-stone-500" />
              </Field>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-stone-200 bg-white p-5">
              <button onClick={() => setSelectedCard(null)} className="rounded-2xl bg-[#201914] px-4 py-3 font-black text-white">Save changes</button>
              <button onClick={() => deleteCard(selectedCard.id)} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-black text-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ idea, onOpen, onVote, onMove, days, compact = false }) {
  const meta = categoryMeta(idea.category);
  return (
    <article className="group rounded-[1.5rem] border border-stone-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-stone-300/30">
      <div className="flex items-start gap-3">
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.accent}`}>{meta.emoji} {idea.category}</span>
            {idea.dayId && <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-black text-stone-700">{idea.time}</span>}
          </div>
          <h3 className="mt-2 text-base font-black leading-snug text-stone-950">{idea.title}</h3>
          {idea.notes && !compact && <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-stone-500">{idea.notes}</p>}
        </button>
        <div className="grid w-12 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 text-center">
          <button onClick={() => onVote(idea.id, 1)} className="py-1 text-sm font-black hover:bg-white">+</button>
          <span className="border-y border-stone-200 bg-white py-1 text-sm font-black">{idea.votes}</span>
          <button onClick={() => onVote(idea.id, -1)} className="py-1 text-sm font-black hover:bg-white">−</button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {idea.link && <a href={idea.link} target="_blank" rel="noreferrer" className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-black text-stone-600 hover:bg-stone-200">Open link</a>}
        <select value={idea.dayId || ""} onChange={(e) => onMove(idea.id, e.target.value || null)} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-black text-stone-600 outline-none">
          <option value="">Idea board</option>
          {days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
        </select>
        <button onClick={onOpen} className="ml-auto rounded-full px-3 py-1.5 text-xs font-black text-stone-400 transition group-hover:bg-stone-100 group-hover:text-stone-700">Edit</button>
      </div>
    </article>
  );
}

function Kpi({ label, value, hint }) {
  return (
    <div className="rounded-[1.5rem] border border-stone-200 bg-white/90 p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-1 truncate text-3xl font-black">{value}</p>
      <p className="mt-1 truncate text-xs font-bold text-stone-500">{hint}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-stone-400">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return <input {...props} className={`w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 font-bold outline-none focus:border-stone-500 ${props.className || ""}`} />;
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-stone-300 bg-white/70 p-5 text-center">
      <p className="text-sm font-bold leading-6 text-stone-500">{text}</p>
    </div>
  );
}
