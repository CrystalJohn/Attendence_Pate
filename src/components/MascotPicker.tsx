import { useEffect, useState, type CSSProperties } from 'react';
import { Check } from '@phosphor-icons/react';
import { MASCOTS, MASCOT_TRAITS, mascotById } from '../domain/mascots';
import type { MascotId } from '../domain/mascotIds';
import { Mascot } from './Mascot';

export function MascotPicker({ value, onChange, locked = false }: { value: MascotId | null; onChange: (id: MascotId) => void; locked?: boolean }) {
  const [draft, setDraft] = useState<MascotId | null>(value);
  const [feedback, setFeedback] = useState<{ id: MascotId; kind: 'select' | 'confirm'; tick: number } | null>(null);
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 1100);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  const character = draft ? mascotById(draft) : null;
  const confirmed = Boolean(draft && value === draft);
  return <section className="mascot-picker" aria-label="Chọn bạn đồng hành">
    <div className="mascot-picker-heading"><strong>Chọn bạn đồng hành</strong><span>Một người bạn nhỏ cùng bạn vào tổ.</span></div>
    <div className="mascot-picker-grid">
      {MASCOTS.map(c => <button type="button" key={c.id} disabled={locked} aria-pressed={draft === c.id} aria-label={`${c.name}, ${c.element}`} onClick={() => { setDraft(c.id); setFeedback({id:c.id,kind:'select',tick:Date.now()}); }}
        className={`mascot-choice ${draft === c.id ? 'is-selected' : ''} ${value === c.id && draft === c.id ? 'is-confirmed' : ''}`}
        style={{'--mascot-tone': c.deep, '--mascot-bg': c.bg} as CSSProperties}>
        {draft === c.id && <span className="mascot-choice-check"><Check size={12} weight="bold" /></span>}
        <Mascot key={feedback?.id === c.id ? feedback.tick : c.id} id={c.id} state={feedback?.id === c.id && feedback.kind === 'confirm' ? 'celebrating' : draft === c.id ? 'selected' : 'idle'} animated={feedback?.id === c.id} size={78} />
        <strong>{c.name}</strong><small>{c.element}</small>
      </button>)}
    </div>
    {character && <div className="mascot-detail" style={{borderColor: character.deep}}>
      <strong style={{color:character.deep}}>{character.name}</strong><p>“{character.line}”</p>
      <div className="mascot-traits">{MASCOT_TRAITS[character.id].map(trait => <span key={trait} style={{background:character.bg,color:character.deep}}>{trait}</span>)}</div>
    </div>}
    <div className="mascot-picker-actions" style={character ? {'--mascot-tone':character.deep,'--mascot-bg':character.bg,'--mascot-button-ink': ['spark','breeze'].includes(character.id) ? '#231c33' : '#fff'} as CSSProperties : undefined}>
      {!locked && <button type="button" className={`button mascot-confirm-button ${confirmed ? 'is-confirmed' : ''}`} disabled={!draft} onClick={() => { if (draft) { onChange(draft); setFeedback({id:draft,kind:'confirm',tick:Date.now()}); } }}>
        <span key={feedback?.kind === 'confirm' ? feedback.tick : 'label'} className={feedback?.kind === 'confirm' ? 'mascot-confirm-feedback' : ''}>
          {confirmed && <Check size={18} weight="bold" />} {confirmed ? `Đã chọn ${character?.name}` : draft ? `Chọn ${character?.name}` : 'Chạm để chọn một bạn'}
        </span>
      </button>}
      {draft !== value && value && <button type="button" className="button button-secondary" onClick={() => setDraft(value)}>Hủy đổi</button>}
    </div>
    <span className="sr-only" role="status" aria-live="polite">{feedback?.kind === 'confirm' ? `Đã chọn ${character?.name} làm bạn đồng hành.` : ''}</span>
    <span className="mascot-picker-hint">{locked ? 'Bạn đồng hành này đã lưu trên hồ sơ và sẽ theo bạn qua các buổi nhóm.' : 'Chọn một bạn đồng hành cho hồ sơ của bạn.'}</span>
  </section>;
}
