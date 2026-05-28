import React, { useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Hotel,
  ListChecks,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";

const CATEGORIES = [
  { key: "breakfast", label: "Breakfast", emoji: "🍳", hint: "Add restaurants or ideas", defaultTime: "09:00" },
  { key: "lunch", label: "Lunch", emoji: "🥗", hint: "Add restaurants or ideas", defaultTime: "12:30" },
  { key: "dinner", label: "Dinner", emoji: "🍝", hint: "Add restaurants or ideas", defaultTime: "19:30" },
  { key: "activity", label: "Activities", emoji: "🎢", hint: "Add activities or experiences", defaultTime: "14:00" },
  { key: "drinks", label: "Drinks", emoji: "🍹", hint: "Add bars or places to drink", defaultTime: "21:00" },
  { key: "sightseeing", label: "Sightseeing", emoji: "🗺️", hint: "Add must-see spots", defaultTime: "10:30" },
  { key: "exploring", label: "Exploring", emoji: "🚶", hint: "Add neighborhoods or ideas", defaultTime: "16:00" },
];

const initialTrip = {
  id: "trip-1",
  name: "Mall of America",
  location: "Minneapolis, MN",
  startDate: "2026-06-26",
  endDate: "2026-06-28",
  items: [],
  hotels: [],
  travelers: [],
};

const emptyItem = {
  title: "",
  category: "breakfast",
  link: "",
  notes: "",
  preferredDate: "",
  preferredTimeMode: "any",
  exactTime: "",
  votes: 0,
};

function formatDate(dateString, opts = {}) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString("en-US", opts);
}

function formatRange(trip) {
  if (!trip?.startDate || !trip?.endDate) return "Set dates";
  const start = formatDate(trip.startDate, { month: "short", day: "numeric" });
  const end = formatDate(trip.endDate, { month: "short", day: "numeric" });
  return `${start} – ${end}`;
}

function getTripDates(trip) {
  if (!trip?.startDate || !trip?.endDate) return [];
  const dates = [];
  const start = new Date(`${trip.startDate}T12:00:00`);
  const end = new Date(`${trip.endDate}T12:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function timeFor(item) {
  if (item.exactTime) return item.exactTime;
  if (item.preferredTimeMode === "morning") return "09:30";
  if (item.preferredTimeMode === "afternoon") return "14:00";
  if (item.preferredTimeMode === "evening") return "19:00";
  return CATEGORIES.find((c) => c.key === item.category)?.defaultTime || "12:00";
}

function sortByTime(a, b) {
  return timeFor(a).localeCompare(timeFor(b));
}

export default function App() {
  const [trips, setTrips] = useState([initialTrip]);
  const [activeTripId, setActiveTripId] = useState("trip-1");
  const [page, setPage] = useState("planning");
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditTrip, setShowEditTrip] = useState(false);
  const [newItem, setNewItem] = useState(emptyItem);
  const [logisticsTab, setLogisticsTab] = useState("hotels");
  const [activeTravelerId, setActiveTravelerId] = useState(null);
  const [newTrip, setNewTrip] = useState({ name: "", location: "", startDate: "", endDate: "" });

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0];
  const tripDates = useMemo(() => getTripDates(activeTrip), [activeTrip]);

  function updateTrip(patch) {
    setTrips((prev) => prev.map((t) => (t.id === activeTrip.id ? { ...t, ...patch } : t)));
  }

  function addTrip() {
    if (!newTrip.name.trim()) return;
    const trip = { ...newTrip, id: `trip-${Date.now()}`, items: [], hotels: [], travelers: [] };
    setTrips((prev) => [...prev, trip]);
    setActiveTripId(trip.id);
    setPage("planning");
    setShowAddTrip(false);
    setNewTrip({ name: "", location: "", startDate: "", endDate: "" });
  }

  function addItem() {
    if (!newItem.title.trim()) return;
    const item = {
      ...newItem,
      id: `item-${Date.now()}`,
      scheduledDate: newItem.preferredDate || "",
      scheduledTime: newItem.exactTime || "",
      votes: 0,
    };
    updateTrip({ items: [...activeTrip.items, item] });
    setNewItem(emptyItem);
    setShowAddItem(false);
  }

  function updateItem(id, patch) {
    updateTrip({ items: activeTrip.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  }

  function deleteItem(id) {
    updateTrip({ items: activeTrip.items.filter((i) => i.id !== id) });
  }

  function autoBuild() {
    const dates = getTripDates(activeTrip);
    if (!dates.length) return;
    const grouped = {};
    CATEGORIES.forEach((c) => {
      grouped[c.key] = [...activeTrip.items]
        .filter((i) => i.category === c.key)
        .sort((a, b) => b.votes - a.votes);
    });
    const counters = Object.fromEntries(CATEGORIES.map((c) => [c.key, 0]));
    const items = activeTrip.items.map((item) => {
      const category = CATEGORIES.find((c) => c.key === item.category);
      const idx = grouped[item.category].findIndex((i) => i.id === item.id);
      const fallbackDate = dates[idx % dates.length] || dates[0];
      counters[item.category] += 1;
      return {
        ...item,
        scheduledDate: item.preferredDate || item.scheduledDate || fallbackDate,
        scheduledTime: item.exactTime || item.scheduledTime || timeFor({ ...item, exactTime: "" }) || category?.defaultTime || "12:00",
      };
    });
    updateTrip({ items });
    setPage("itinerary");
  }

  function addHotel() {
    updateTrip({
      hotels: [
        ...activeTrip.hotels,
        { id: `hotel-${Date.now()}`, name: "", address: "", checkIn: "", checkOut: "", confirmation: "", notes: "" },
      ],
    });
  }

  function updateHotel(id, patch) {
    updateTrip({ hotels: activeTrip.hotels.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
  }

  function deleteHotel(id) {
    updateTrip({ hotels: activeTrip.hotels.filter((h) => h.id !== id) });
  }

  function addTraveler() {
    const traveler = { id: `traveler-${Date.now()}`, name: "", flights: [] };
    updateTrip({ travelers: [...activeTrip.travelers, traveler] });
    setActiveTravelerId(traveler.id);
  }

  function updateTraveler(id, patch) {
    updateTrip({ travelers: activeTrip.travelers.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  }

  function addFlight(travelerId) {
    updateTrip({
      travelers: activeTrip.travelers.map((t) =>
        t.id === travelerId
          ? {
              ...t,
              flights: [
                ...t.flights,
                { id: `flight-${Date.now()}`, airline: "", flightNo: "", from: "", to: "", depart: "", arrive: "", confirmation: "", notes: "" },
              ],
            }
          : t
      ),
    });
  }

  function updateFlight(travelerId, flightId, patch) {
    updateTrip({
      travelers: activeTrip.travelers.map((t) =>
        t.id === travelerId ? { ...t, flights: t.flights.map((f) => (f.id === flightId ? { ...f, ...patch } : f)) } : t
      ),
    });
  }

  const activeTraveler = activeTrip.travelers.find((t) => t.id === activeTravelerId);

  return (
    <div className="min-h-screen bg-[#050712] text-white selection:bg-orange-400/30">
      <style>{css}</style>
      <div className="fixed inset-0 -z-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,129,42,.28),transparent_32%),radial-gradient(circle_at_88%_12%,rgba(74,118,255,.16),transparent_30%),linear-gradient(180deg,#1a1820_0%,#07101d_42%,#050712_100%)]" />
      <div className="relative mx-auto min-h-screen max-w-[1120px] pb-32 md:pb-10">
        <DesktopNav
          trips={trips}
          activeTrip={activeTrip}
          setActiveTripId={setActiveTripId}
          page={page}
          setPage={setPage}
          setShowAddTrip={setShowAddTrip}
          setShowEditTrip={setShowEditTrip}
        />

        <main className="px-5 pt-10 md:px-8 md:pt-28">
          <MobileHero activeTrip={activeTrip} setShowEditTrip={setShowEditTrip} />
          <TripOverview activeTrip={activeTrip} autoBuild={autoBuild} setShowEditTrip={setShowEditTrip} />

          {page === "planning" && (
            <PlanningPage
              activeTrip={activeTrip}
              setShowAddItem={setShowAddItem}
              updateItem={updateItem}
              deleteItem={deleteItem}
            />
          )}
          {page === "logistics" && (
            <LogisticsPage
              activeTrip={activeTrip}
              tab={logisticsTab}
              setTab={setLogisticsTab}
              addHotel={addHotel}
              updateHotel={updateHotel}
              deleteHotel={deleteHotel}
              addTraveler={addTraveler}
              activeTraveler={activeTraveler}
              setActiveTravelerId={setActiveTravelerId}
              updateTraveler={updateTraveler}
              addFlight={addFlight}
              updateFlight={updateFlight}
            />
          )}
          {page === "itinerary" && <ItineraryPage activeTrip={activeTrip} updateItem={updateItem} />}
          {page === "calendar" && <CalendarPage trips={trips} setActiveTripId={setActiveTripId} setPage={setPage} />}
        </main>

        <MobileNav page={page} setPage={setPage} setShowAddTrip={setShowAddTrip} />
      </div>

      {showAddItem && (
        <Modal title="Add to Planning Board" onClose={() => setShowAddItem(false)}>
          <ItemForm item={newItem} setItem={setNewItem} tripDates={tripDates} onSave={addItem} saveLabel="Add to Board" />
        </Modal>
      )}

      {showAddTrip && (
        <Modal title="Create a Trip" onClose={() => setShowAddTrip(false)}>
          <TripForm trip={newTrip} setTrip={setNewTrip} onSave={addTrip} saveLabel="Save Trip" />
        </Modal>
      )}

      {showEditTrip && (
        <Modal title="Edit Trip" onClose={() => setShowEditTrip(false)}>
          <TripForm trip={activeTrip} setTrip={(patch) => updateTrip(patch)} onSave={() => setShowEditTrip(false)} saveLabel="Save Changes" />
        </Modal>
      )}
    </div>
  );
}

function DesktopNav({ trips, activeTrip, setActiveTripId, page, setPage, setShowAddTrip, setShowEditTrip }) {
  return (
    <div className="fixed left-0 right-0 top-0 z-30 hidden border-b border-white/10 bg-[#070a14]/75 backdrop-blur-2xl md:block">
      <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-8 py-4">
        <div className="mr-2 text-xs font-black uppercase tracking-[0.35em] text-orange-300">Trip Studio</div>
        <select value={activeTrip.id} onChange={(e) => setActiveTripId(e.target.value)} className="select max-w-[260px]">
          {trips.map((t) => (
            <option key={t.id} value={t.id}>{t.name || "Untitled trip"}</option>
          ))}
        </select>
        <button className="iconBtn ml-auto"><Bell size={18} /></button>
        {[
          ["planning", "Planning"],
          ["logistics", "Logistics"],
          ["itinerary", "Itinerary"],
          ["calendar", "Calendar"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setPage(key)} className={`navPill ${page === key ? "active" : ""}`}>{label}</button>
        ))}
        <button onClick={() => setShowAddTrip(true)} className="orangeSmall"><Plus size={17} /> Add Trip</button>
        <button onClick={() => setShowEditTrip(true)} className="iconBtn"><Pencil size={18} /></button>
      </div>
    </div>
  );
}

function MobileHero({ activeTrip, setShowEditTrip }) {
  return (
    <section className="mb-7 block md:hidden">
      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] font-black uppercase tracking-[0.38em] text-orange-300">Trip Studio</span>
        <button className="iconBtn relative"><Bell size={19} /><span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-orange-400" /></button>
      </div>
      <div className="mt-12 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[32px] font-black leading-none tracking-[-0.04em]">{activeTrip.name || "New Trip"}</h1>
          <p className="mt-3 text-[15px] font-medium text-white/70">{activeTrip.location || "Add location"} · {formatRange(activeTrip)}</p>
        </div>
        <button onClick={() => setShowEditTrip(true)} className="editBubble"><Pencil size={17} /> Edit</button>
      </div>
    </section>
  );
}

function TripOverview({ activeTrip, autoBuild, setShowEditTrip }) {
  const days = getTripDates(activeTrip).length;
  return (
    <section className="glass mb-8 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-white/60 md:hidden">Trip Overview</p>
          <h2 className="mt-1 text-xl font-black md:text-2xl">{activeTrip.name || "Untitled trip"}</h2>
          <p className="text-sm font-medium text-white/60 md:hidden">{activeTrip.location || "No location"} · {formatRange(activeTrip)}</p>
        </div>
        <button onClick={() => setShowEditTrip(true)} className="editBubble hidden md:flex"><Pencil size={17} /> Edit</button>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="miniStat"><MapPin size={18} /><div><b>{activeTrip.location || "Destination"}</b><span>Destination</span></div></div>
        <div className="miniStat"><CalendarDays size={18} /><div><b>{formatRange(activeTrip)}</b><span>{days || 0} days</span></div></div>
      </div>
      <button onClick={autoBuild} className="orangeBtn mt-5"><Sparkles size={18} /> Auto Build Itinerary</button>
    </section>
  );
}

function PlanningPage({ activeTrip, setShowAddItem, updateItem, deleteItem }) {
  return (
    <section>
      <Header title="Planning Board" subtitle="Add ideas, vote, and plan together." />
      <div className="space-y-3">
        {CATEGORIES.map((cat) => {
          const items = activeTrip.items.filter((i) => i.category === cat.key);
          return (
            <div key={cat.key} className="categoryCard">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat.emoji}</span>
                  <div>
                    <h3 className="text-lg font-black">{cat.label}</h3>
                    <p className="text-xs font-medium text-white/55">{cat.hint}</p>
                  </div>
                </div>
                <button onClick={() => setShowAddItem(true)} className="roundPlus"><Plus size={22} /></button>
              </div>
              {items.length > 0 && (
                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <PlanningItem key={item.id} item={item} updateItem={updateItem} deleteItem={deleteItem} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="tipCard mt-7">
        <Lightbulb className="text-orange-300" size={30} />
        <div><b>Tip</b><p>Add items to the board, vote on your favorites, and let Auto Build create your itinerary.</p></div>
      </div>
    </section>
  );
}

function PlanningItem({ item, updateItem, deleteItem }) {
  return (
    <div className="subCard">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-black">{item.title}</p>
          <p className="text-xs text-white/55">{item.preferredDate ? formatDate(item.preferredDate, { weekday: "short", month: "short", day: "numeric" }) : "Flexible"} · {item.exactTime || item.preferredTimeMode || "any time"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => updateItem(item.id, { votes: Math.max(0, item.votes - 1) })} className="tinyBtn">−</button>
          <span className="min-w-6 text-center font-black">{item.votes}</span>
          <button onClick={() => updateItem(item.id, { votes: item.votes + 1 })} className="tinyBtn">+</button>
          <button onClick={() => deleteItem(item.id)} className="tinyBtn text-rose-300"><Trash2 size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function LogisticsPage({ activeTrip, tab, setTab, addHotel, updateHotel, deleteHotel, addTraveler, activeTraveler, setActiveTravelerId, updateTraveler, addFlight, updateFlight }) {
  return (
    <section>
      <Header title="Logistics" subtitle="Manage your bookings and travel details." />
      <div className="segmented mb-5">
        <button onClick={() => setTab("hotels")} className={tab === "hotels" ? "selected" : ""}><Hotel size={18} /> Hotels</button>
        <button onClick={() => setTab("flights")} className={tab === "flights" ? "selected" : ""}><Plane size={18} /> Flights</button>
      </div>

      {tab === "hotels" ? (
        <div className="space-y-5">
          {activeTrip.hotels.length === 0 ? <EmptyBox icon={<Hotel />} title="No hotels added yet" text="Add your hotel details to keep everything in one place." action="Add Hotel" onClick={addHotel} /> : null}
          {activeTrip.hotels.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} updateHotel={updateHotel} deleteHotel={deleteHotel} />)}
          {activeTrip.hotels.length > 0 && <button onClick={addHotel} className="orangeBtn"><Plus size={18} /> Add Hotel</button>}
          <BookingCard />
          <Checklist title="What to add" items={["Hotel name", "Check-in / Check-out", "Address", "Confirmation number", "Notes"]} />
        </div>
      ) : (
        <div className="space-y-5">
          {!activeTraveler ? (
            <>
              {activeTrip.travelers.length === 0 ? <EmptyBox icon={<Plane />} title="No travelers added yet" text="Add each traveler, then add one or more flight legs." action="Add Traveler" onClick={addTraveler} /> : null}
              <div className="space-y-3">
                {activeTrip.travelers.map((traveler) => (
                  <button key={traveler.id} onClick={() => setActiveTravelerId(traveler.id)} className="travelerCard">
                    <div><b>{traveler.name || "Unnamed traveler"}</b><span>{traveler.flights.length} flights</span></div><ChevronDown className="-rotate-90" />
                  </button>
                ))}
              </div>
              {activeTrip.travelers.length > 0 && <button onClick={addTraveler} className="orangeBtn"><Plus size={18} /> Add Traveler</button>}
            </>
          ) : (
            <TravelerDetail traveler={activeTraveler} updateTraveler={updateTraveler} setActiveTravelerId={setActiveTravelerId} addFlight={addFlight} updateFlight={updateFlight} />
          )}
        </div>
      )}
    </section>
  );
}

function HotelCard({ hotel, updateHotel, deleteHotel }) {
  return (
    <div className="glass p-4">
      <div className="flex gap-3"><input className="input" placeholder="Hotel name" value={hotel.name} onChange={(e) => updateHotel(hotel.id, { name: e.target.value })} /><button onClick={() => deleteHotel(hotel.id)} className="deleteBubble"><Trash2 size={20} /></button></div>
      <input className="input mt-3" placeholder="Address" value={hotel.address} onChange={(e) => updateHotel(hotel.id, { address: e.target.value })} />
      <div className="mt-3 grid grid-cols-2 gap-3"><input className="input" type="datetime-local" value={hotel.checkIn} onChange={(e) => updateHotel(hotel.id, { checkIn: e.target.value })} /><input className="input" type="datetime-local" value={hotel.checkOut} onChange={(e) => updateHotel(hotel.id, { checkOut: e.target.value })} /></div>
      <input className="input mt-3" placeholder="Confirmation number" value={hotel.confirmation} onChange={(e) => updateHotel(hotel.id, { confirmation: e.target.value })} />
      <textarea className="input mt-3 min-h-[95px]" placeholder="Notes" value={hotel.notes} onChange={(e) => updateHotel(hotel.id, { notes: e.target.value })} />
    </div>
  );
}

function BookingCard() {
  return <div className="glass p-5"><h3 className="font-black">Need to book?</h3><button className="searchRow mt-4"><Search size={19} /> Search Hotels <ChevronDown className="-rotate-90 ml-auto" /></button><p className="mt-4 text-sm text-white/55">We’ll open trusted booking sites for you.</p><div className="mt-4 flex flex-wrap gap-3 text-xs font-black"><span>Booking.com</span><span>Expedia</span><span>Hotels.com</span></div></div>;
}

function Checklist({ title, items }) {
  return <div className="glass p-5"><h3 className="mb-4 font-black">{title}</h3><div className="space-y-3">{items.map((i) => <div key={i} className="flex items-center gap-3 text-sm"><CheckCircle2 size={17} className="text-white/70" /> {i}</div>)}</div></div>;
}

function TravelerDetail({ traveler, updateTraveler, setActiveTravelerId, addFlight, updateFlight }) {
  return (
    <div className="space-y-4">
      <button onClick={() => setActiveTravelerId(null)} className="text-sm font-black text-orange-300">← All travelers</button>
      <div className="glass p-4"><input className="input" placeholder="Traveler name" value={traveler.name} onChange={(e) => updateTraveler(traveler.id, { name: e.target.value })} /></div>
      {traveler.flights.map((flight, idx) => (
        <div key={flight.id} className="glass p-4">
          <h3 className="mb-3 font-black">Flight {idx + 1}</h3>
          <div className="grid grid-cols-2 gap-3"><input className="input" placeholder="Airline" value={flight.airline} onChange={(e) => updateFlight(traveler.id, flight.id, { airline: e.target.value })} /><input className="input" placeholder="Flight #" value={flight.flightNo} onChange={(e) => updateFlight(traveler.id, flight.id, { flightNo: e.target.value })} /></div>
          <div className="mt-3 grid grid-cols-2 gap-3"><input className="input" placeholder="From" value={flight.from} onChange={(e) => updateFlight(traveler.id, flight.id, { from: e.target.value })} /><input className="input" placeholder="To" value={flight.to} onChange={(e) => updateFlight(traveler.id, flight.id, { to: e.target.value })} /></div>
          <div className="mt-3 grid grid-cols-2 gap-3"><input className="input" type="datetime-local" value={flight.depart} onChange={(e) => updateFlight(traveler.id, flight.id, { depart: e.target.value })} /><input className="input" type="datetime-local" value={flight.arrive} onChange={(e) => updateFlight(traveler.id, flight.id, { arrive: e.target.value })} /></div>
          <input className="input mt-3" placeholder="Confirmation number" value={flight.confirmation} onChange={(e) => updateFlight(traveler.id, flight.id, { confirmation: e.target.value })} />
        </div>
      ))}
      <button onClick={() => addFlight(traveler.id)} className="orangeBtn"><Plus size={18} /> Add Flight Leg</button>
    </div>
  );
}

function ItineraryPage({ activeTrip, updateItem }) {
  const dates = getTripDates(activeTrip);
  return (
    <section>
      <Header title="Itinerary" subtitle="Your scheduled plans in one clean timeline." />
      {dates.length === 0 ? <EmptyBox icon={<CalendarDays />} title="Set trip dates first" text="Add dates to your trip to build an itinerary." /> : null}
      <div className="space-y-6">
        {dates.map((date) => {
          const items = activeTrip.items.filter((i) => i.scheduledDate === date).sort(sortByTime);
          return (
            <div key={date}>
              <h3 className="sticky top-2 z-10 mb-3 rounded-2xl bg-[#080b15]/80 px-1 py-2 text-lg font-black backdrop-blur-lg">{formatDate(date, { weekday: "long", month: "short", day: "numeric" })}</h3>
              {items.length === 0 ? <div className="emptySmall">Nothing planned yet.</div> : items.map((item) => <TimelineItem key={item.id} item={item} updateItem={updateItem} dates={dates} />)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TimelineItem({ item, updateItem, dates }) {
  const cat = CATEGORIES.find((c) => c.key === item.category);
  return (
    <div className="timelineItem">
      <div className="timeCol"><input type="time" value={item.scheduledTime || timeFor(item)} onChange={(e) => updateItem(item.id, { scheduledTime: e.target.value })} /></div>
      <div className="timelineCard"><div className="flex items-center gap-2"><span>{cat?.emoji}</span><b>{item.title}</b></div><p>{cat?.label} · {item.votes} votes</p><select value={item.scheduledDate} onChange={(e) => updateItem(item.id, { scheduledDate: e.target.value })}>{dates.map((d) => <option key={d} value={d}>{formatDate(d, { weekday: "short", month: "short", day: "numeric" })}</option>)}</select></div>
    </div>
  );
}

function CalendarPage({ trips, setActiveTripId, setPage }) {
  const baseTrip = trips[0];
  const base = baseTrip?.startDate ? new Date(`${baseTrip.startDate}T12:00:00`) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startOffset + daysInMonth }, (_, i) => (i < startOffset ? null : i - startOffset + 1));
  return (
    <section>
      <Header title="Calendar" subtitle="See all your trip dates together." />
      <div className="glass p-4">
        <h3 className="mb-5 text-xl font-black">{base.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h3>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-white/45">{["S","M","T","W","T","F","S"].map((d) => <div key={d}>{d}</div>)}</div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
            const matching = trips.filter((t) => dateStr && t.startDate <= dateStr && t.endDate >= dateStr);
            return <div key={idx} className="calendarCell"><span>{day}</span>{matching.map((t) => <button key={t.id} onClick={() => { setActiveTripId(t.id); setPage("itinerary"); }} className="tripLine">{t.name}</button>)}</div>;
          })}
        </div>
      </div>
    </section>
  );
}

function EmptyBox({ icon, title, text, action, onClick }) {
  return <div className="emptyBox"><div className="emptyIcon">{icon}</div><h3>{title}</h3><p>{text}</p>{action && <button onClick={onClick} className="orangeBtn mt-5"><Plus size={18} /> {action}</button>}</div>;
}

function Header({ title, subtitle }) {
  return <div className="mb-5"><h2 className="text-[29px] font-black tracking-[-0.04em] md:text-4xl">{title}</h2><p className="mt-2 text-base font-medium text-white/60">{subtitle}</p></div>;
}

function MobileNav({ page, setPage, setShowAddTrip }) {
  const item = (key, label, Icon) => <button onClick={() => setPage(key)} className={`mobileNavItem ${page === key ? "active" : ""}`}><Icon size={22} /><span>{label}</span></button>;
  return <nav className="mobileNav md:hidden">{item("planning", "Planning", ListChecks)}{item("logistics", "Logistics", ClipboardList)}<button onClick={() => setShowAddTrip(true)} className="mobileAdd"><Plus size={36} /></button>{item("itinerary", "Itinerary", CalendarDays)}{item("calendar", "Calendar", CalendarDays)}</nav>;
}

function Modal({ title, children, onClose }) {
  return <div className="fixed inset-0 z-50 flex items-end bg-black/55 p-3 backdrop-blur-md md:items-center md:justify-center"><div className="modalPanel"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-black">{title}</h2><button onClick={onClose} className="iconBtn"><X size={20} /></button></div>{children}</div></div>;
}

function TripForm({ trip, setTrip, onSave, saveLabel }) {
  const set = (patch) => setTrip({ ...trip, ...patch });
  return <div className="space-y-3"><input className="input" placeholder="Trip name" value={trip.name} onChange={(e) => set({ name: e.target.value })} /><input className="input" placeholder="Location" value={trip.location} onChange={(e) => set({ location: e.target.value })} /><div className="grid grid-cols-2 gap-3"><input className="input" type="date" value={trip.startDate} onChange={(e) => set({ startDate: e.target.value })} /><input className="input" type="date" value={trip.endDate} onChange={(e) => set({ endDate: e.target.value })} /></div><button onClick={onSave} className="orangeBtn mt-2">{saveLabel}</button></div>;
}

function ItemForm({ item, setItem, tripDates, onSave, saveLabel }) {
  const set = (patch) => setItem({ ...item, ...patch });
  return <div className="space-y-3"><input className="input" placeholder="Add a place or plan" value={item.title} onChange={(e) => set({ title: e.target.value })} /><select className="input" value={item.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}</select><input className="input" placeholder="Link optional" value={item.link} onChange={(e) => set({ link: e.target.value })} /><input className="input" placeholder="Notes optional" value={item.notes} onChange={(e) => set({ notes: e.target.value })} /><select className="input" value={item.preferredDate} onChange={(e) => set({ preferredDate: e.target.value })}><option value="">Any date</option>{tripDates.map((d) => <option key={d} value={d}>{formatDate(d, { weekday: "short", month: "short", day: "numeric" })}</option>)}</select><select className="input" value={item.preferredTimeMode} onChange={(e) => set({ preferredTimeMode: e.target.value, exactTime: e.target.value === "exact" ? item.exactTime : "" })}><option value="any">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option><option value="exact">Specific time</option></select>{item.preferredTimeMode === "exact" && <input className="input" type="time" value={item.exactTime} onChange={(e) => set({ exactTime: e.target.value })} />}<button onClick={onSave} className="orangeBtn">{saveLabel}</button></div>;
}

const css = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #050712; }
  .glass, .categoryCard { border: 1px solid rgba(255,255,255,.13); background: linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.055)); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 24px 70px rgba(0,0,0,.28); backdrop-filter: blur(22px); border-radius: 28px; }
  .categoryCard { padding: 18px; }
  .subCard { border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.07); border-radius: 20px; padding: 14px; }
  .input, .select { width: 100%; border: 1px solid rgba(255,255,255,.14); border-radius: 20px; background: rgba(255,255,255,.1); color: white; padding: 16px 18px; outline: none; font-size: 16px; font-weight: 650; }
  .input::placeholder { color: rgba(255,255,255,.44); }
  select option { color: #111827; }
  .orangeBtn, .orangeSmall { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; border: 0; border-radius: 22px; background: linear-gradient(135deg,#ff9638,#ff6516); color: white; padding: 16px 20px; font-size: 17px; font-weight: 950; box-shadow: 0 18px 45px rgba(255,108,27,.24); }
  .orangeSmall { width: auto; border-radius: 999px; padding: 11px 16px; font-size: 14px; }
  .iconBtn, .editBubble, .roundPlus, .deleteBubble, .tinyBtn { border: 1px solid rgba(255,255,255,.13); background: rgba(255,255,255,.12); color: white; backdrop-filter: blur(16px); }
  .iconBtn { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 999px; }
  .editBubble { display: flex; align-items: center; gap: 9px; border-radius: 999px; padding: 12px 16px; font-weight: 850; }
  .roundPlus { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 999px; }
  .deleteBubble { display: grid; place-items: center; min-width: 55px; height: 55px; border-radius: 999px; color: #fb7185; }
  .tinyBtn { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 999px; font-weight: 900; }
  .miniStat { display: flex; gap: 12px; align-items: flex-start; color: white; }
  .miniStat b { display: block; font-weight: 900; line-height: 1.2; }
  .miniStat span { display: block; margin-top: 5px; color: rgba(255,255,255,.55); font-size: 12px; font-weight: 700; }
  .navPill { border: 0; border-radius: 999px; padding: 10px 14px; color: rgba(255,255,255,.65); background: transparent; font-weight: 850; }
  .navPill.active { background: rgba(255,255,255,.12); color: white; }
  .mobileNav { position: fixed; left: max(14px, env(safe-area-inset-left)); right: max(14px, env(safe-area-inset-right)); bottom: max(12px, env(safe-area-inset-bottom)); z-index: 40; display: grid; grid-template-columns: 1fr 1fr 88px 1fr 1fr; align-items: center; min-height: 76px; border: 1px solid rgba(255,255,255,.14); border-radius: 28px; background: rgba(23,29,43,.88); box-shadow: 0 20px 60px rgba(0,0,0,.45); backdrop-filter: blur(28px); }
  .mobileNavItem { display: flex; flex-direction: column; align-items: center; gap: 4px; border: 0; background: transparent; color: rgba(255,255,255,.55); font-size: 11px; font-weight: 950; }
  .mobileNavItem.active { color: #ff8d31; }
  .mobileAdd { justify-self: center; display: grid; place-items: center; width: 76px; height: 76px; border: 0; border-radius: 26px; background: linear-gradient(135deg,#ff9638,#ff6516); color: white; box-shadow: 0 20px 55px rgba(255,108,27,.45); transform: translateY(-12px); }
  .segmented { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; border-radius: 24px; padding: 5px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.08); }
  .segmented button { display: flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 19px; padding: 14px; color: rgba(255,255,255,.58); background: transparent; font-weight: 950; font-size: 17px; }
  .segmented button.selected { color: #ff8d31; background: rgba(255,125,41,.22); }
  .emptyBox { border: 1px dashed rgba(255,255,255,.22); border-radius: 26px; padding: 34px 24px; text-align: center; background: rgba(255,255,255,.045); }
  .emptyIcon { display: grid; place-items: center; width: 64px; height: 64px; margin: 0 auto 20px; border-radius: 999px; background: rgba(255,255,255,.07); color: rgba(255,255,255,.7); }
  .emptyBox h3 { margin: 0; font-size: 20px; font-weight: 950; }
  .emptyBox p { margin: 10px auto 0; max-width: 250px; color: rgba(255,255,255,.58); line-height: 1.5; }
  .tipCard { display: flex; gap: 14px; border: 1px solid rgba(255,151,62,.2); border-radius: 24px; padding: 18px; background: linear-gradient(135deg,rgba(255,139,43,.18),rgba(255,255,255,.06)); }
  .tipCard b { font-weight: 950; } .tipCard p { margin: 4px 0 0; color: rgba(255,255,255,.58); font-size: 13px; line-height: 1.45; }
  .searchRow, .travelerCard { width: 100%; display: flex; align-items: center; gap: 12px; border: 1px solid rgba(255,255,255,.1); border-radius: 18px; background: rgba(255,255,255,.07); color: white; padding: 14px; font-weight: 850; }
  .travelerCard { justify-content: space-between; text-align: left; } .travelerCard b { display:block; } .travelerCard span { display:block; margin-top: 4px; color: rgba(255,255,255,.55); font-size: 13px; }
  .timelineItem { display: grid; grid-template-columns: 82px 1fr; gap: 12px; margin-bottom: 12px; }
  .timeCol input { width: 82px; border: 0; background: transparent; color: #ff9c3f; font-size: 13px; font-weight: 950; padding-top: 16px; }
  .timelineCard { border-left: 3px solid #ff8d31; border-radius: 18px; background: rgba(255,255,255,.08); padding: 14px; }
  .timelineCard p { margin: 4px 0 10px; color: rgba(255,255,255,.55); font-size: 13px; }
  .timelineCard select { width: 100%; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; background: rgba(255,255,255,.08); color: white; padding: 9px; }
  .emptySmall { border-radius: 18px; background: rgba(255,255,255,.06); color: rgba(255,255,255,.45); padding: 16px; font-weight: 800; }
  .calendarCell { min-height: 78px; border-radius: 14px; background: rgba(255,255,255,.055); padding: 7px; overflow: hidden; }
  .calendarCell span { color: rgba(255,255,255,.55); font-size: 12px; font-weight: 900; }
  .tripLine { display: block; width: 100%; margin-top: 5px; border: 0; border-radius: 999px; background: linear-gradient(135deg,#ff9638,#ff6516); color: white; padding: 4px 6px; font-size: 10px; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .modalPanel { width: min(560px,100%); max-height: 88vh; overflow-y: auto; border: 1px solid rgba(255,255,255,.13); border-radius: 30px; background: #111827; padding: 22px; box-shadow: 0 30px 90px rgba(0,0,0,.55); }
  @media (max-width: 767px) { main { padding-bottom: 40px; } .glass { border-radius: 24px; } .categoryCard { border-radius: 20px; padding: 16px; } .orangeBtn { min-height: 56px; } }
`;
