import { ArrowDownRight, ArrowRight, Check, ChartNoAxesColumn, ReceiptText, Tag, Equal, CircleCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';
import { type Comparison, type NormalizedOffer, normalPriceLabel, percentageLabel } from '../../domain/comparison';
import { formatCents, formatRationalBRL, formatBRL } from '../../domain/money';
import { readableQuantity } from '../../domain/units';

type View = 'labels' | 'analysis' | 'receipt';
interface Props { comparison: Comparison | null; view: View; onViewChange: (v: View) => void; incomplete: boolean; errorMessage?: string }

function PriceTag({ item, name, isWinner, tied }: { item: NormalizedOffer; name: string; isWinner: boolean; tied: boolean }) {
  return <div className={`price-result-card ${isWinner && !tied ? 'winning-price-card' : ''}`}>
    <div className="price-result-top"><span>ETIQUETA {name}</span>{isWinner && !tied ? <span className="winner-stamp"><Check size={13} /> MELHOR ESCOLHA</span> : tied ? <span className="tie-stamp">EMPATE</span> : <span className="price-result-muted">COMPARADA</span>}</div>
    <div className="price-result-product">{item.source.product || `Oferta ${name}`}<span>{item.source.brand || 'Produto sem marca informada'}</span></div>
    <div className="price-result-normal">{formatRationalBRL(item.numeratorCents, item.denominator)}<small>POR {item.label.toUpperCase()}</small></div>
    <div className="price-result-bottom"><span>{readableQuantity(item.source.quantity, item.source.unit, Number(item.source.packCount))}</span><strong>{formatCents(item.priceCents)}</strong></div>
  </div>;
}

function LabelsView({ c }: { c: Comparison }) {
  const tied = c.winner === 'tie';
  return <div className="labels-view"><div className="result-two-col"><PriceTag item={c.a} name="A" isWinner={c.winner === 'a'} tied={tied} /><PriceTag item={c.b} name="B" isWinner={c.winner === 'b'} tied={tied} /></div>
    <div className="explain-strip"><span className="explain-icon"><CircleCheck size={18} /></span><p>{tied ? 'Os dois conjuntos custam exatamente o mesmo por medida, mesmo que as embalagens tenham preços diferentes.' : <>A oferta <strong>{c.winner.toUpperCase()}</strong> sai por <strong>{percentageLabel(c.savingsBasisPoints)} menos</strong> a cada {c.standardLabel} equivalente. O cálculo considera a quantidade total do conjunto.</>}</p></div>
  </div>;
}

function AnalysisView({ c }: { c: Comparison }) {
  const data = [
    { name: 'OFERTA A', price: c.a.chartValue, label: normalPriceLabel(c.a) },
    { name: 'OFERTA B', price: c.b.chartValue, label: normalPriceLabel(c.b) }
  ];
  return <div className="analysis-view">
    <div className="analysis-header"><span className="eyebrow">PREÇO PADRONIZADO</span><strong>Quanto custa cada {c.standardLabel}?</strong><p>Mesma régua para as duas opções, independentemente do tamanho da embalagem.</p></div>
    <div className="analysis-graph" role="img" aria-label={`Gráfico: oferta A ${normalPriceLabel(c.a)}; oferta B ${normalPriceLabel(c.b)}`}>
      <ResponsiveContainer width="100%" height={218}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 76, left: 5, bottom: 5 }} barSize={35}>
          <CartesianGrid horizontal={false} stroke="#DFDFD5" strokeDasharray="3 5" />
          <XAxis type="number" domain={[0, 'dataMax']} tickFormatter={v => formatBRL(Number(v))} tick={{ fontSize: 11, fill: '#68736D' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 12, fontWeight: 700, fill: '#1B2420' }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(value) => formatBRL(Number(value))} cursor={{ fill: '#F5F2E8' }} />
          <Bar dataKey="price" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {data.map((_, index) => <Cell key={index} fill={c.winner === 'tie' || c.winner === (index === 0 ? 'a' : 'b') ? '#27644B' : '#C65B3E'} />)}
            <LabelList dataKey="price" position="right" formatter={(value: unknown) => typeof value === 'number' ? formatBRL(value) : ''} style={{ fill: '#1B2420', fontSize: 12, fontWeight: 700 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="analysis-footer"><span>{c.winner === 'tie' ? <Equal size={24} /> : <ArrowDownRight size={24} />}</span><div><small>ECONOMIA RELATIVA</small><strong>{percentageLabel(c.savingsBasisPoints)}</strong></div><p>{c.winner === 'tie' ? 'Empate exato.' : `Comparando a oferta mais barata com a mais cara por ${c.standardLabel}.`}</p></div>
  </div>;
}

function ReceiptLine({ title, value, emphasis }: { title: string; value: string; emphasis?: boolean }) {
  return <div className={`receipt-line ${emphasis ? 'receipt-emphasis' : ''}`}><span>{title}</span><strong>{value}</strong></div>;
}
function ReceiptView({ c }: { c: Comparison }) {
  return <div className="receipt-view"><div className="receipt-paper">
    <div className="receipt-brand"><span className="receipt-symbol">▰ ▰ ▰ ▰ ▰</span><strong>PREÇO NA RÉGUA</strong><span>COMPROVANTE DE COMPARAÇÃO</span><span>━━━━━━━━━━━━━━━━━━━━━━━━━</span></div>
    <div className="receipt-section-title">01 / OFERTAS ENCONTRADAS</div>
    <ReceiptLine title="OFERTA A" value={formatCents(c.a.priceCents)} /><div className="receipt-subline">{readableQuantity(c.a.source.quantity, c.a.source.unit, Number(c.a.source.packCount))}</div>
    <ReceiptLine title="OFERTA B" value={formatCents(c.b.priceCents)} /><div className="receipt-subline">{readableQuantity(c.b.source.quantity, c.b.source.unit, Number(c.b.source.packCount))}</div>
    <div className="receipt-rule" />
    <div className="receipt-section-title">02 / CONTAS POR {c.standardLabel.toUpperCase()}</div>
    <ReceiptLine title={`A / ${c.standardLabel}`} value={formatRationalBRL(c.a.numeratorCents, c.a.denominator)} />
    <ReceiptLine title={`B / ${c.standardLabel}`} value={formatRationalBRL(c.b.numeratorCents, c.b.denominator)} />
    <div className="receipt-rule" />
    <ReceiptLine title="MAIS EM CONTA" value={c.winner === 'tie' ? 'EMPATE' : `OFERTA ${c.winner.toUpperCase()}`} emphasis />
    <ReceiptLine title="ECONOMIA" value={percentageLabel(c.savingsBasisPoints)} emphasis />
    <ReceiptLine title={`DIFERENÇA / ${c.standardLabel}`} value={formatRationalBRL(c.differenceNumeratorCents, c.differenceDenominator)} />
    <div className="receipt-thanks">* Preço do conjunto ÷ quantidade total<br />* Comparação proporcional, não o gasto no caixa<br /><br />OBRIGADO POR COMPARAR ☺</div>
    <div className="receipt-bars" aria-hidden="true">▎▍▏▎▉▎▏▍▉▍▎▏▉▍▏▎▉▍▎▏▍</div>
  </div></div>;
}

export function ResultViews({ comparison: c, view, onViewChange, incomplete, errorMessage }: Props) {
  return <section className="result-section" aria-labelledby="result-title">
    <div className="section-line"><div><span className="section-index">02 / O VEREDITO</span><h2 id="result-title">O resultado <em>na régua.</em></h2></div><span className="result-context">O QUE IMPORTA É O PREÇO POR MEDIDA</span></div>
    <div className="results-container">
      <div className="results-header"><div className="result-heading"><span className="eyebrow">COMPARE DO SEU JEITO</span><h3>{c ? c.winner === 'tie' ? 'Deu empate.' : `A oferta ${c.winner.toUpperCase()} rende mais.` : 'Tudo pronto para medir.'}</h3></div><div className="view-switch" role="group" aria-label="Modo de visualização">
        <button aria-pressed={view === 'labels'} type="button" onClick={() => onViewChange('labels')} className={view === 'labels' ? 'selected' : ''}><Tag size={16} /> <span>Etiquetas</span></button>
        <button aria-pressed={view === 'analysis'} type="button" onClick={() => onViewChange('analysis')} className={view === 'analysis' ? 'selected' : ''}><ChartNoAxesColumn size={16} /> <span>Analítico</span></button>
        <button aria-pressed={view === 'receipt'} type="button" onClick={() => onViewChange('receipt')} className={view === 'receipt' ? 'selected' : ''}><ReceiptText size={16} /> <span>Cupom</span></button>
      </div></div>
      {c ? <div className="result-content" aria-live="polite">{view === 'labels' ? <LabelsView c={c} /> : view === 'analysis' ? <AnalysisView c={c} /> : <ReceiptView c={c} />}</div> :
        <div className="result-empty" role="status"><div className="empty-ruler" aria-hidden="true">0 <span>│┊│┊│┊│┊│</span> 1</div><div className="empty-illustration"><ArrowRight size={43} strokeWidth={1.2} /></div><h4>{errorMessage || 'A boa escolha começa aqui.'}</h4><p>{errorMessage ? 'Revise os campos indicados e tente novamente.' : incomplete ? 'Preencha o preço e a quantidade das duas ofertas. O resultado aparece automaticamente, sem precisar apertar calcular.' : 'Informe duas ofertas para iniciar.'}</p></div>}
    </div>
  </section>;
}
