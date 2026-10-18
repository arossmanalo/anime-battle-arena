import { expect, it } from 'vitest';
import { ROSTER } from '../src/data/fighters';
import { skillText } from '../src/ui/skillText';

it('every skill has a description', () => {
  const miss: string[] = [];
  for (const d of ROSTER) {
    const all = [...d.skills, ...Object.values(d.teamKit ?? {}), d.ultimate, ...Object.values(d.form?.skillOverrides ?? {}), ...(d.form?.ultimateOverride ? [d.form.ultimateOverride] : [])];
    for (const s of all) if (!skillText(d.id, s.name)) miss.push(`${d.id}|${s.name}`);
  }
  expect(miss).toEqual([]);
});
