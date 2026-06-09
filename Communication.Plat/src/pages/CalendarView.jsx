import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const EVENT_COLORS = ['#d4c4a8','#03dac6','#f48fb1','#ffb74d','#81c784','#4fc3f7'];

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

// ── Sample events ────────────────────────────────────────────────────────────
const today = new Date();
const SAMPLE_EVENTS = [
  { id: 1, date: today, title: 'Sprint Planning',   time: '10:00 AM', color: '#d4c4a8' },
  { id: 2, date: today, title: 'Design Review',     time: '2:00 PM',  color: '#03dac6' },
  { id: 3, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2), title: 'Client Call', time: '11:30 AM', color: '#ffb74d' },
  { id: 4, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5), title: 'Team Outing', time: 'All day',   color: '#81c784' },
];

// ── Add Event Modal ──────────────────────────────────────────────────────────
function AddEventModal({ date, onAdd, onClose }) {
  const [title,    setTitle]    = useState('');
  const [time,     setTime]     = useState('');
  const [color,    setColor]    = useState(EVENT_COLORS[0]);

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({ id: Date.now(), date, title, time: time || 'All day', color });
    onClose();
  };

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.modal} onClick={e => e.stopPropagation()}>
        <div style={m.header}>
          <span style={m.title}>Add Event</span>
          <button style={m.closeBtn} onClick={onClose}><X size={20} color="#fff" /></button>
        </div>
        <div style={m.body}>
          <div style={m.dateLabel}>
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <input
            autoFocus
            placeholder="Event title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={m.input}
          />
          <input
            placeholder="Time (e.g. 3:00 PM or All day)"
            value={time}
            onChange={e => setTime(e.target.value)}
            style={m.input}
          />
          {/* Color picker */}
          <div style={m.colorRow}>
            {EVENT_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ ...m.colorDot, backgroundColor: c, border: color === c ? '3px solid #fff' : '3px solid transparent' }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...m.btn, flex: 1, backgroundColor: '#1a1a1a', color: '#aaa' }} onClick={onClose}>Cancel</button>
            <button style={{ ...m.btn, flex: 2, backgroundColor: color, color: '#000', opacity: title.trim() ? 1 : 0.5 }} onClick={handleAdd}>
              Add Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Custom Calendar Grid ─────────────────────────────────────────────────────
function CalendarGrid({ year, month, selectedDate, events, onSelectDate }) {
  const firstDay   = getFirstDayOfMonth(year, month);
  const totalDays  = getDaysInMonth(year, month);
  const todayDate  = new Date();

  // Build grid cells (fill leading blanks, then days)
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const getEvents = (date) => date ? events.filter(e => sameDay(e.date, date)) : [];

  return (
    <div>
      {/* Day-of-week headers */}
      <div style={g.weekRow}>
        {DAYS.map(d => <div key={d} style={g.weekLabel}>{d}</div>)}
      </div>

      {/* Date cells */}
      <div style={g.grid}>
        {cells.map((date, i) => {
          if (!date) return <div key={i} style={g.emptyCell} />;

          const isToday    = sameDay(date, todayDate);
          const isSelected = sameDay(date, selectedDate);
          const evs        = getEvents(date);
          const isPast     = date < new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

          return (
            <button
              key={i}
              onClick={() => onSelectDate(date)}
              style={{
                ...g.cell,
                backgroundColor: isSelected ? '#d4c4a8' : isToday ? '#1a1a2e' : 'transparent',
                border: isToday && !isSelected ? '1px solid #d4c4a855' : '1px solid transparent',
                opacity: isPast ? 0.45 : 1,
              }}
            >
              <span style={{ ...g.dayNum, color: isSelected ? '#000' : isToday ? '#d4c4a8' : '#fff', fontWeight: isToday || isSelected ? 800 : 400 }}>
                {date.getDate()}
              </span>
              {/* Event dots */}
              {evs.length > 0 && (
                <div style={g.dotRow}>
                  {evs.slice(0, 3).map((ev, di) => (
                    <div key={di} style={{ ...g.dot, backgroundColor: isSelected ? '#000' : ev.color }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Calendar Page ────────────────────────────────────────────────────────
export default function CalendarView() {
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin';

  const [viewDate,  setViewDate]  = useState(new Date());  // controls which month is shown
  const [selected,  setSelected]  = useState(new Date());  // selected date
  const [events,    setEvents]    = useState(SAMPLE_EVENTS);
  const [showAdd,   setShowAdd]   = useState(false);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday   = () => { setViewDate(new Date()); setSelected(new Date()); };

  const eventsOnSelected = events.filter(e => sameDay(e.date, selected));

  const addEvent  = (ev) => setEvents(prev => [...prev, ev]);
  const delEvent  = (id) => setEvents(prev => prev.filter(e => e.id !== id));

  const selectedLabel = sameDay(selected, new Date())
    ? 'TODAY'
    : selected.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <div style={st.page}>
      {/* Add Event Modal */}
      {showAdd && (
        <AddEventModal date={selected} onAdd={addEvent} onClose={() => setShowAdd(false)} />
      )}

      {/* ── Month Navigation ── */}
      <div style={st.navBar}>
        <button style={st.navBtn} onClick={prevMonth}><ChevronLeft size={20} color="#aaa" /></button>

        <div style={st.monthInfo}>
          <h2 style={st.monthName}>{MONTHS[month]} {year}</h2>
          {!sameDay(viewDate, new Date()) && (
            <button style={st.todayBtn} onClick={goToday}>Today</button>
          )}
        </div>

        <button style={st.navBtn} onClick={nextMonth}><ChevronRight size={20} color="#aaa" /></button>
      </div>

      {/* ── Calendar Grid ── */}
      <div style={st.calBox}>
        <CalendarGrid
          year={year}
          month={month}
          selectedDate={selected}
          events={events}
          onSelectDate={setSelected}
        />
      </div>

      {/* ── Events Panel ── */}
      <div style={st.eventsPanel}>
        <div style={st.eventsPanelHeader}>
          <span style={st.sectionLabel}>{selectedLabel}</span>
          {isAdmin && (
            <button style={st.addBtn} onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add Event
            </button>
          )}
        </div>

        {eventsOnSelected.length === 0 ? (
          <div style={st.empty}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div>No events scheduled</div>
            {isAdmin && <div style={{ fontSize: 12, color: '#222', marginTop: 6 }}>Tap "Add Event" to create one</div>}
          </div>
        ) : (
          eventsOnSelected.map(ev => (
            <div key={ev.id} style={st.eventCard}>
              <div style={{ ...st.eventBar, backgroundColor: ev.color }} />
              <div style={{ flex: 1 }}>
                <div style={st.eventTitle}>{ev.title}</div>
                <div style={st.eventTime}><Clock size={12} color="#555" />{ev.time}</div>
              </div>
              {isAdmin && (
                <button style={st.delBtn} onClick={() => delEvent(ev.id)}>
                  <Trash2 size={16} color="#ff5555" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Calendar Grid Styles ─────────────────────────────────────────────────────
const g = {
  weekRow:    { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 },
  weekLabel:  { textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#333', padding: '6px 0', letterSpacing: 0.5 },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 },
  emptyCell:  { height: 52 },
  cell:       { height: 52, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit', transition: 'background-color 0.15s', gap: 3 },
  dayNum:     { fontSize: 15, lineHeight: 1 },
  dotRow:     { display: 'flex', gap: 3, justifyContent: 'center' },
  dot:        { width: 5, height: 5, borderRadius: '50%' },
};

// ── Page Styles ──────────────────────────────────────────────────────────────
const st = {
  page:         { height: '100%', overflowY: 'auto', backgroundColor: '#000', paddingBottom: 80 },
  navBar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 12px 8px' },
  navBtn:       { width: 38, height: 38, borderRadius: '50%', backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  monthInfo:    { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  monthName:    { color: '#fff', fontWeight: 800, fontSize: 20, margin: 0 },
  todayBtn:     { fontSize: 11, color: '#d4c4a8', backgroundColor: '#d4c4a811', border: '1px solid #d4c4a833', padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 },
  calBox:       { padding: '0 10px 12px' },
  eventsPanel:  { padding: '0 16px' },
  eventsPanelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel: { fontSize: 11, color: '#333', fontWeight: 800, letterSpacing: 2 },
  addBtn:       { display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#d4c4a8', color: '#000', fontWeight: 700, padding: '8px 14px', borderRadius: 10, fontSize: 13, cursor: 'pointer', border: 'none', fontFamily: 'inherit' },
  empty:        { color: '#333', fontSize: 14, textAlign: 'center', padding: '30px 0' },
  eventCard:    { display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#0a0a0a', borderRadius: 14, padding: '14px 16px', marginBottom: 10, border: '1px solid #111' },
  eventBar:     { width: 4, height: 42, borderRadius: 4, flexShrink: 0 },
  eventTitle:   { color: '#fff', fontWeight: 600, fontSize: 15 },
  eventTime:    { color: '#555', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 },
  delBtn:       { background: 'none', border: 'none', cursor: 'pointer', padding: 6 },
};

// ── Add Event Modal Styles ───────────────────────────────────────────────────
const m = {
  overlay:   { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modal:     { backgroundColor: '#0d0d0d', borderRadius: 20, border: '1px solid #1a1a1a', width: '92%', maxWidth: 380, overflow: 'hidden' },
  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #111' },
  title:     { color: '#fff', fontWeight: 700, fontSize: 18 },
  closeBtn:  { background: 'none', border: 'none', cursor: 'pointer', padding: 4 },
  body:      { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  dateLabel: { color: '#555', fontSize: 13, fontWeight: 600 },
  input:     { backgroundColor: '#111', border: '1px solid #222', borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'inherit' },
  colorRow:  { display: 'flex', gap: 10, padding: '4px 0' },
  colorDot:  { width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', border: '3px solid transparent', transition: 'border-color 0.15s' },
  btn:       { border: 'none', borderRadius: 12, padding: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'inherit' },
};
