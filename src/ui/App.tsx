import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Battle } from './pages/Battle';
import { Duel } from './pages/Duel';
import { FighterDetail } from './pages/FighterDetail';
import { Home } from './pages/Home';
import { HowToPlay } from './pages/HowToPlay';
import { NotFound } from './pages/NotFound';
import { Play } from './pages/Play';
import { Results } from './pages/Results';
import { Roster } from './pages/Roster';
import { TeamBuilder } from './pages/TeamBuilder';
import { Training } from './pages/Training';
import { StoreProvider } from './store';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/play', label: 'Play' },
  { to: '/roster', label: 'Roster' },
  { to: '/how-to-play', label: 'How to play' },
];

function Navbar() {
  return (
    <nav className="nav">
      <Link to="/" className="brand" aria-label="Anime Battle Arena, home">
        Anime Battle Arena
      </Link>
      <div className="nav-links">
        {LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'on' : '')}>
            {l.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Shell() {
  const loc = useLocation();
  const inBattle = loc.pathname === '/battle';
  useEffect(() => {
    if (!inBattle) window.scrollTo({ top: 0 });
  }, [loc.pathname, inBattle]);
  return (
    <>
      {!inBattle && <Navbar />}
      <main className={inBattle ? 'main battle' : 'main'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<Play />} />
          <Route path="/duel" element={<Duel />} />
          <Route path="/team" element={<TeamBuilder />} />
          <Route path="/training" element={<Training />} />
          <Route path="/roster" element={<Roster />} />
          <Route path="/roster/:id" element={<FighterDetail />} />
          <Route path="/how-to-play" element={<HowToPlay />} />
          <Route path="/battle" element={<Battle />} />
          <Route path="/results" element={<Results />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!inBattle && (
        <footer className="footer">
          <span>A fan-made prototype. Characters belong to their creators.</span>
          <span className="footer-links">
            <Link to="/roster">Roster</Link>
            <Link to="/training">Training</Link>
          </span>
        </footer>
      )}
    </>
  );
}

export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StoreProvider>
  );
}
