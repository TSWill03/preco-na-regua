import { useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ChartNoAxesCombined, Database, Search, Trash2, X, Archive, CalendarDays, ShieldCheck } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { allObservations, db, exportObservations, type PriceObservation } from '../../features/history/db';
import { formatBRL, formatRationalBRL, formatCents } from '../../domain/money';

type Order = 'recent' | 'oldest' | 'cheapest' | 'priciest';
interface Props { refreshKey: number; onBack: () => void; onError: (message: string) => void; onSuccess: (message: string) => void }

export function HistoryScreen({ refreshKey, onBack, onError, onSuccess }: Props) {
  const [observations, setObservations] = useState<PriceObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [order, setOrder] = useState<Order>('recent');
  const [chartKey, setChartKey] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    allObservations().then(data => { if (active) { setObservations(data); setLoading(false); } }).catch(() => {
      if (active) { onError('Não foi possível abrir o histórico local. Confira as permissões do navegador.'); setLoading(false); }
    });
    return () => { active = false; };
  }, [refreshKey, onError]);

  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of observations) map.set(`${row.productKey}::${row.category}`, `${row.product}${row.brand ? ` · ${row.brand}` : ''} (${row.standardUnit})`);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
  }, [observations]);
  const selectedChart = productOptions.some(([key]) => key === chartKey) ? chartKey : productOptions[0]?.[0] ?? '';
  const chartRows = useMemo(() => observations
    .filter(row => `${row.productKey}::${row.category}` === selectedChart)
    .slice().sort((a, b) => a.referenceDate.localeCompare(b.referenceDate) || a.observedAt.localeCompare(b.observedAt))
    .map(row => ({ ...row, label: new Date(`${row.referenceDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), price: row.normalizedPrice })), [observations, selectedChart]);

  const visible = useMemo(() => {
    const query = search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const filtered = observations.filter(row => {
      const haystack = `${row.product} ${row.brand} ${row.store}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return (category === 'all' || row.category === category) && (!query || haystack.includes(query));
    });
    return filtered.sort((a, b) => {
      if (order === 'cheapest') return a.normalizedPrice - b.normalizedPrice;
      if (order === 'priciest') return b.normalizedPrice - a.normalizedPrice;
      return order === 'oldest' ? a.observedAt.localeCompare(b.observedAt) : b.observedAt.localeCompare(a.observedAt);
    });
  }, [observations, search, category, order]);

  async function removeSelected() {
    if (!confirmTarget) return;
    try {
      if (confirmTarget === 'all') await db.observations.clear();
      else await db.observations.delete(confirmTarget);
      setObservations(await allObservations());
      onSuccess(confirmTarget === 'all' ? 'Histórico apagado deste navegador.' : 'Registro excluído do histórico.');
    } catch { onError('Não foi possível excluir o registro local.'); }
    finally { setConfirmTarget(null); }
  }
  async function exportJSON() {
    try {
      const exported = await exportObservations();
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `preco-na-regua-historico-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      onSuccess('Histórico exportado em JSON.');
    } catch { onError('Não foi possível exportar o histórico.'); }
  }
  useEffect(() => {
    if (!confirmTarget) return;
    const onEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') setConfirmTarget(null); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [confirmTarget]);
  const storesCount = new Set(observations.map(o => o.store.trim()).filter(Boolean)).size;
  return <main id="main-content" className="history-page container">
    <div className="history-hero"><div><button className="back-link" type="button" onClick={onBack}><ArrowLeft size={16} /> VOLTAR AO COMPARADOR</button><span className="eyebrow green">SEUS DADOS, SUAS DECISÕES</span><h1>O preço muda.<br /><em>A memória fica.</em></h1><p>Acompanhe o que já encontrou, compare tendências e guarde suas melhores descobertas. Tudo neste dispositivo.</p></div><div className="history-hero-stamp" aria-hidden="true"><Archive size={62} strokeWidth={1.1} /><span>ARQUIVO<br />PESSOAL</span></div></div>
    <div className="history-stats"><div><span>REGISTROS</span><strong>{observations.length}</strong></div><div><span>PRODUTOS</span><strong>{productOptions.length}</strong></div><div><span>ESTABELECIMENTOS</span><strong>{storesCount}</strong></div><div className="history-stat-note"><ShieldCheck size={20} /><p>Sem conta. Sem nuvem.<br /><strong>100% no seu navegador.</strong></p></div></div>
    <section className="history-chart-section"><div className="history-section-heading"><div><span className="section-index">01 / EVOLUÇÃO</span><h2>Preço ao longo do tempo</h2></div>{observations.length > 0 && <label className="history-chart-select"><span className="sr-only">Produto para o gráfico</span><select value={selectedChart} onChange={e => setChartKey(e.target.value)}>{productOptions.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>}</div>
      {chartRows.length ? <div className="history-chart" role="img" aria-label={`Histórico de preços normalizados de ${productOptions.find(([key]) => key === selectedChart)?.[1] || 'produto selecionado'}`}>
        <ResponsiveContainer width="100%" height={255}><LineChart data={chartRows} margin={{ top: 17, right: 18, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="#E0E0D7" strokeDasharray="3 6" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#66736A', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis width={85} tickFormatter={v => formatBRL(Number(v))} tick={{ fill: '#66736A', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
          <Tooltip formatter={(v) => formatBRL(Number(v))} labelFormatter={(_, payload) => { const p = payload[0]?.payload as PriceObservation | undefined; return p ? `${new Date(p.observedAt).toLocaleString('pt-BR')} · ${p.store || 'Loja não informada'}` : ''; }} />
          <Line dataKey="price" stroke="#27644B" strokeWidth={2.5} isAnimationActive={false} dot={{ fill: "#F2B84B", stroke: "#27644B", strokeWidth: 2, r: 5 }} activeDot={{ r: 7 }} />
        </LineChart></ResponsiveContainer>
        {chartRows.length === 1 && <p className="chart-footnote">Adicione novas observações deste produto para acompanhar a evolução.</p>}
      </div> : <div className="history-chart-empty"><ChartNoAxesCombined size={38} /><p>O gráfico aparecerá quando você salvar a primeira comparação.</p></div>}
    </section>
    <section className="history-list-section"><div className="history-section-heading"><div><span className="section-index">02 / REGISTROS</span><h2>Seu caderno de preços</h2></div><div className="history-actions"><button type="button" onClick={exportJSON} disabled={!observations.length} className="secondary-btn"><ArrowDownToLine size={16} /> Exportar JSON</button><button type="button" className="subtle-danger" onClick={() => setConfirmTarget('all')} disabled={!observations.length}><Trash2 size={16} /> Limpar</button></div></div>
      <div className="history-filters"><label className="history-search"><Search size={18} /><span className="sr-only">Pesquisar produtos, marcas ou lojas</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto, marca ou mercado..." /></label>
        <label><span className="sr-only">Filtrar por categoria</span><select value={category} onChange={e => setCategory(e.target.value)}><option value="all">Todas as medidas</option><option value="mass">Massa (kg)</option><option value="volume">Volume (L)</option><option value="count">Unidades</option></select></label>
        <label><span className="sr-only">Ordenar histórico</span><select value={order} onChange={e => setOrder(e.target.value as Order)}><option value="recent">Mais recentes</option><option value="oldest">Mais antigos</option><option value="cheapest">Menor preço/unid.</option><option value="priciest">Maior preço/unid.</option></select></label>
      </div>
      <div className="history-table-wrap">{loading ? <div className="table-empty">Carregando histórico local...</div> : visible.length ? <div className="history-rows">{visible.map(row => <article className="history-row" key={row.id}>
        <div className="history-row-date"><CalendarDays size={14} /><span>{new Date(row.observedAt).toLocaleDateString('pt-BR')}</span></div>
        <div className="history-row-product"><strong>{row.product}</strong><span>{row.brand || 'Sem marca'} · {row.presentation}</span><small>{row.store || 'Estabelecimento não informado'}</small></div>
        <div className="history-row-price"><span>PACOTE</span><strong>{formatCents(row.priceCents)}</strong></div>
        <div className="history-row-normalized"><span>POR {row.standardUnit.toUpperCase()}</span><strong>{formatRationalBRL(BigInt(row.normalizedNumerator), BigInt(row.normalizedDenominator))}</strong></div>
        <button className="row-delete" type="button" aria-label={`Excluir preço de ${row.product} registrado em ${new Date(row.observedAt).toLocaleDateString('pt-BR')}`} title="Excluir registro" onClick={() => setConfirmTarget(row.id)}><Trash2 size={17} /></button>
      </article>)}</div> : <div className="table-empty"><Database size={34} /><strong>{observations.length ? 'Nenhum registro corresponde aos filtros.' : 'Seu histórico começa com uma comparação.'}</strong><p>{observations.length ? 'Experimente outra pesquisa ou categoria.' : 'Volte para o comparador, preencha duas ofertas e clique em “Salvar no histórico”.'}</p>{!observations.length && <button type="button" className="primary-btn" onClick={onBack}>Comparar agora <ArrowLeft size={17} /></button>}</div>}</div>
      <div className="history-footnote"><ShieldCheck size={19} /><p>Esses dados são armazenados no IndexedDB deste navegador. Limpar dados do site, usar navegação privada ou trocar de dispositivo pode apagá-los. Exporte o JSON para ter uma cópia.</p></div>
    </section>
    {confirmTarget && <div className="dialog-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setConfirmTarget(null); }}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"><button type="button" className="dialog-close" onClick={() => setConfirmTarget(null)} aria-label="Fechar"><X size={20} /></button><Trash2 size={32} color="#C65B3E" /><h3 id="confirm-title">Excluir {confirmTarget === 'all' ? 'todo o histórico?' : 'este registro?'}</h3><p id="confirm-description">Essa ação remove {confirmTarget === 'all' ? 'todos os preços salvos' : 'a observação selecionada'} deste navegador e não pode ser desfeita. Considere exportar seus dados antes.</p><div className="dialog-buttons"><button className="secondary-btn" type="button" autoFocus onClick={() => setConfirmTarget(null)}>Cancelar</button><button className="danger-btn" type="button" onClick={removeSelected}>Sim, excluir</button></div></div></div>}
  </main>;
}
