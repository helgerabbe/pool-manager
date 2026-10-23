import React from 'react';

/** Eine Zeile je Satz; zu lange Sätze werden bis zur Mindestgröße verkleinert, sonst ohne einzelnes Restwort umbrochen. */
function Zeile({ text, groesse, min }) {
  const ref = React.useRef(null);
  const [px, setPx] = React.useState(groesse);
  const [umbruch, setUmbruch] = React.useState(false);
  React.useLayoutEffect(() => {
    const el = ref.current;
    let s = groesse;
    el.style.fontSize = `${s}px`;
    while (el.scrollWidth > el.clientWidth && s > min) { s -= 1; el.style.fontSize = `${s}px`; }
    setPx(s);
    setUmbruch(el.scrollWidth > el.clientWidth);
  }, [text, groesse, min]);
  return <p ref={ref} className={umbruch ? '' : 'whitespace-nowrap'} style={{ fontSize: px, textWrap: 'pretty' }}>{text}</p>;
}

export default function SatzZeilen({ text = '', groesse, min, className }) {
  const saetze = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) || [];
  return <div className={`min-w-0 leading-snug ${className || ''}`}>{saetze.map((s, i) => <Zeile key={i} text={s} groesse={groesse} min={min} />)}</div>;
}