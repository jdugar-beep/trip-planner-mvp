import React, { useMemo, useState } from "react";

const initialCategories = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Activities",
  "Cafes",
  "Bars",
  "Shopping",
  "Must-do",
];

const demoTripDays = [
  { id: "day-1", label: "Day 1", date: "2026-07-10" },
  { id: "day-2", label: "Day 2", date: "2026-07-11" },
  { id: "day-3", label: "Day 3", date: "2026-07-12" },
  { id: "day-4", label: "Day 4", date: "2026-07-13" },
];

const demoIdeas = [
  { id: crypto.randomUUID(), title: "Cute neighborhood cafe", category: "Breakfast", votes: 6, link: "", notes: "Good for first morning", dayId: null, time: "09:30", status: "idea" },
  { id: crypto.randomUUID(), title: "Famous brunch spot", category: "Breakfast", votes: 4, link: "", notes: "Make reservation", dayId: null, time: "10:00", status: "idea" },
  { id: crypto.randomUUID(), title: "Museum afternoon", category: "Activities", votes: 8, link: "", notes: "Book tickets ahead", dayId: null, time: "13:00", status: "idea" },
  { id: crypto.randomUUID(), title: "Rooftop dinner", category: "Dinner", votes: 9, link: "", notes: "Splurge meal", dayId: null, time: "20:00", status: "idea" },
  { id: crypto.randomUUID(), title: "Cocktail bar", category: "Bars", votes: 5, link: "", notes: "After dinner", dayId: null, time: "22:00", status: "idea" },
];

function defaultTime(category) {
  const times = {
    Breakfast: "09:30",
    Lunch: "13:00",
    Dinner: "20:00",
    Activities: "15:00",
    Cafes: "11:00",
    Bars: "22:00",
    Shopping: "16:00",
    "Must-do": "12:00",
  };
  return times[category] || "12:00";
}

export default function App() {
  const [tripName, setTripName] = useState("Barcelona Group Trip");
  const [days, setDays] = useState(demoTripDays);
  const [ideas, setIdeas] = useState(demoIdeas);
  const [selectedCard, setSelectedCard] = useState(null);
  const [newIdea, setNewIdea] = useState({ title: "", category: "Breakfast", link: "", notes: "" });

  const boardIdeas = useMemo(() => ideas.filter((idea) => !idea.dayId), [ideas]);
  const scheduledIdeas = useMemo(() => ideas.filter((idea) => idea.dayId), [ideas]);

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

    initialCategories.forEach((category) => {
      const ranked = unscheduled
        .filter((idea) => idea.category === category)
        .sort((a, b) => b.votes - a.votes);

      const maxPerCategory = category === "Breakfast" || category === "Lunch" || category === "Dinner" ? days.length : Math.min(days.length, 3);
      selected.push(...ranked.slice(0, maxPerCategory));
    });

    const assigned = selected.map((idea, index) => ({
      ...idea,
      dayId: days[index % days.length].id,
      time: idea.time || defaultTime(idea.category),
      status: "planned",
    }));

    setIdeas((prev) => prev.map((idea) => {
      const match = assigned.find((item) => item.id === idea.id);
      return match || idea;
    }));
  }

  function clearItinerary() {
    setIdeas((prev) => prev.map((idea) => ({ ...idea, dayId: null, status: "idea" })));
  }

  function moveCard(id, dayId) {
    updateCard(id, { dayId, status: dayId ? "planned" : "idea" });
  }

  return (
    <div className="min-h-screen bg-[#eef7ff] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-blue-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-500">Group Trip Planner</p>
            <input
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="mt-1 w-full bg-transparent text-3xl font-black outline-none md:text-4xl"
            />
            <p className="mt-1 text-sm text-slate-500">Add ideas, vote, auto-build the itinerary, then edit every card instantly.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={buildItinerary} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-300">Build Itinerary</button>
            <button onClick={clearItinerary} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">Clear Schedule</button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[390px_1fr]">
        <section className="space-y-4">
          <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">Add a spot</h2>
            <form onSubmit={addIdea} className="mt-4 space-y-3">
              <input value={newIdea.title} onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })} placeholder="Spot name" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" />
              <select value={newIdea.category} onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400">
                {initialCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <input value={newIdea.link} onChange={(e) => setNewIdea({ ...newIdea, link: e.target.value })} placeholder="Paste link optional" className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" />
              <textarea value={newIdea.notes} onChange={(e) => setNewIdea({ ...newIdea, notes: e.target.value })} placeholder="Notes optional" className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" />
              <button className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-black text-white">Add to board</button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black">Idea board</h2>
            <p className="mt-1 text-sm text-slate-500">Vote on ideas before building the itinerary.</p>
            <div className="mt-4 space-y-3">
              {boardIdeas.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Everything is scheduled. Clear the schedule to move cards back here.</p>}
              {boardIdeas.map((idea) => <Card key={idea.id} idea={idea} onOpen={() => setSelectedCard(idea)} onVote={vote} onMove={moveCard} days={days} />)}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Kpi label="Ideas" value={ideas.length} />
            <Kpi label="Scheduled" value={scheduledIdeas.length} />
            <Kpi label="Days" value={days.length} />
            <Kpi label="Votes" value={ideas.reduce((sum, idea) => sum + idea.votes, 0)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {days.map((day) => {
              const dayCards = ideas.filter((idea) => idea.dayId === day.id).sort((a, b) => a.time.localeCompare(b.time));
              return (
                <div key={day.id} className="min-h-96 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{day.label}</h2>
                      <input value={day.date} onChange={(e) => setDays((prev) => prev.map((d) => d.id === day.id ? { ...d, date: e.target.value } : d))} type="date" className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{dayCards.length} plans</span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {dayCards.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No plans yet. Use Build Itinerary or move a card here.</p>}
                    {dayCards.map((idea) => <Card key={idea.id} idea={idea} onOpen={() => setSelectedCard(idea)} onVote={vote} onMove={moveCard} days={days} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm" onClick={() => setSelectedCard(null)}>
          <div className="ml-auto h-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Quick edit</p>
                <h2 className="mt-1 text-2xl font-black">Edit card</h2>
              </div>
              <button onClick={() => setSelectedCard(null)} className="rounded-full bg-slate-100 px-3 py-2 font-black">×</button>
            </div>

            <div className="mt-6 space-y-4">
              <Field label="Title">
                <input value={selectedCard.title} onChange={(e) => updateCard(selectedCard.id, { title: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select value={selectedCard.category} onChange={(e) => updateCard(selectedCard.id, { category: e.target.value, time: selectedCard.time || defaultTime(e.target.value) })} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                    {initialCategories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </Field>
                <Field label="Votes">
                  <input type="number" value={selectedCard.votes} onChange={(e) => updateCard(selectedCard.id, { votes: Number(e.target.value) })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Day">
                  <select value={selectedCard.dayId || ""} onChange={(e) => moveCard(selectedCard.id, e.target.value || null)} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                    <option value="">Idea board</option>
                    {days.map((day) => <option key={day.id} value={day.id}>{day.label} — {day.date}</option>)}
                  </select>
                </Field>
                <Field label="Time">
                  <input type="time" value={selectedCard.time} onChange={(e) => updateCard(selectedCard.id, { time: e.target.value })} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                </Field>
              </div>
              <Field label="Link">
                <input value={selectedCard.link} onChange={(e) => updateCard(selectedCard.id, { link: e.target.value })} placeholder="https://..." className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" />
              </Field>
              <Field label="Notes">
                <textarea value={selectedCard.notes} onChange={(e) => updateCard(selectedCard.id, { notes: e.target.value })} className="min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" />
              </Field>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setSelectedCard(null)} className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 font-black text-white">Done</button>
                <button onClick={() => deleteCard(selectedCard.id)} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-black text-red-600">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ idea, onOpen, onVote, onMove, days }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{idea.category}</span>
            {idea.dayId && <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-black text-green-700">{idea.time}</span>}
          </div>
          <h3 className="mt-2 truncate text-base font-black">{idea.title}</h3>
          {idea.notes && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{idea.notes}</p>}
        </button>
        <div className="flex flex-col items-center rounded-2xl bg-slate-50 p-1">
          <button onClick={() => onVote(idea.id, 1)} className="px-2 py-1 text-sm font-black">+</button>
          <span className="text-sm font-black">{idea.votes}</span>
          <button onClick={() => onVote(idea.id, -1)} className="px-2 py-1 text-sm font-black">−</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {idea.link && <a href={idea.link} target="_blank" rel="noreferrer" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Open link</a>}
        <select value={idea.dayId || ""} onChange={(e) => onMove(idea.id, e.target.value || null)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
          <option value="">Idea board</option>
          {days.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}
        </select>
      </div>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}
