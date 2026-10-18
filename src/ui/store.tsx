import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EMPTY_MANIFEST, type AssetManifest } from '../game/assets';
import type { MatchResult, MatchSetup } from '../game/match';

interface Store {
  manifest: AssetManifest;
  /** The match the Battle page will start. */
  setup: MatchSetup | null;
  setSetup: (s: MatchSetup | null) => void;
  /** The last finished match, shown on the Results page. */
  result: MatchResult | null;
  setResult: (r: MatchResult | null) => void;
  /** Where "back" goes after a match, so training returns to Training and duels to Duel. */
  backTo: string;
  setBackTo: (p: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [manifest, setManifest] = useState<AssetManifest>(EMPTY_MANIFEST);
  const [setup, setSetup] = useState<MatchSetup | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [backTo, setBackTo] = useState('/play');

  useEffect(() => {
    fetch('assets/manifest.json')
      .then((r) => (r.ok ? r.json() : EMPTY_MANIFEST))
      .then(setManifest)
      .catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ manifest, setup, setSetup, result, setResult, backTo, setBackTo }), [manifest, setup, result, backTo]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}
