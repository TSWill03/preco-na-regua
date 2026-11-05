import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, Copy, Download, ExternalLink, LockKeyhole, RefreshCw, Ruler, Share2, SlidersHorizontal, X, WifiOff } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { Brand } from './components/Brand';
import { OfferForm } from './components/OfferForm';
import { ResultViews } from './components/ResultViews';
import { HistoryScreen } from './components/HistoryScreen';
import { blankOffer, compareOffers, validateOffer, type OfferInput } from '../domain/comparison';
import { saveComparison } from '../features/history/db';
import { readSharedHash, shareLinkFor } from '../features/share/share';

type Page = 'compare' | 'history';
type View = 'labels' | 'analysis' | 'receipt';
interface Notice { message: string; kind: 'success' | 'error' | 'info' }

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function App() {
  const [page, setPage] = useState<Page>('compare');
  const [view, setView] = useState<View>('labels');
  const [offers, setOffers] = useState<[OfferInput, OfferInput]>(() => [blankOffer(todayLocal()), blankOffer(todayLocal())]);
  const [attempted, setAttempted] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [shared, setShared] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [savedSignature, setSavedSignature] = useState('');
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);
  const online = useOnlineStatus();

  const notify = useCallback((message: string, kind: Notice['kind'] = 'info') => setNotice({ message, kind }), []);
  const onError = useCallback((message: string) => notify(message, 'error'), [notify]);
  const onSuccess = useCallback((message: string) => notify(message, 'success'), [notify]);

  useEffect(() => {
    const applyFragment = () => {
      const decoded = readSharedHash(window.location.hash);
      if (!decoded) return;
      setShareUrl(null);
      if (!decoded.ok) { onError(decoded.reason); setShared(false); return; }
      const result = compareOffers(decoded.data.offers[0], decoded.data.offers[1]);
      if (result.status !== 'ok') { onError('A comparação compartilhada contém preços, medidas ou datas inválidas.'); return; }
      setOffers(decoded.data.offers); setPage('compare'); setShared(true); setAttempted(false);
      setSavedSignature(''); onSuccess('Comparação recebida! Você pode editar ou salvar no seu histórico.');
    };
    applyFragment(); window.addEventListener('hashchange', applyFragment);
    return () => window.removeEventListener('hashchange', applyFragment);
  }, [onError, onSuccess]);

  useEffect(() => {
    const updater = registerSW({
      onNeedRefresh() { setNeedRefresh(true); },
      onOfflineReady() { /* o indicador offline acompanha navigator.onLine */ }
    });
    setUpdateSW(() => updater);
  }, []);

  const hasInput = offers.every(offer => !!offer.price.trim() && !!offer.quantity.trim());
  const outcome = useMemo(() => hasInput ? compareOffers(offers[0], offers[1]) : null, [hasInput, offers]);
  const comparison = outcome?.status === 'ok' ? outcome.comparison : null;
  const errorsA = attempted ? validateOffer(offers[0]) : outcome?.status === 'invalid' ? outcome.errors[0] : {};
  const errorsB = attempted ? validateOffer(offers[1]) : outcome?.status === 'invalid' ? outcome.errors[1] : {};
  const errorMessage = outcome?.status === 'incompatible' ? 'Essas medidas não são compatíveis.' :
    outcome?.status === 'invalid' ? 'Alguns valores precisam ser corrigidos.' : undefined;

  function updateOffer(index: 0 | 1, offer: OfferInput) {
    setOffers(previous => index === 0 ? [offer, previous[1]] : [previous[0], offer]);
    setAttempted(false); setShared(false); setSavedSignature('');
    if (window.location.hash.startsWith('#c=')) window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  function assertComparison(): boolean {
    setAttempted(true);
    if (!comparison) {
      notify('Informe preços, quantidades e unidades compatíveis nas duas ofertas.', 'error');
      return false;
    }
    return true;
  }

  async function save() {
    if (!assertComparison()) return;
    if (offers.some(offer => !offer.product.trim())) { onError('Preencha o nome dos dois produtos para salvar no histórico.'); return; }
    const sig = JSON.stringify(offers);
    if (savedSignature === sig) { notify('Esta comparação já foi salva. Altere uma oferta para registrar outra observação.', 'info'); return; }
    try {
      await saveComparison(offers);
      setHistoryRevision(n => n + 1); setSavedSignature(sig);
      onSuccess('As duas ofertas foram salvas no histórico deste navegador.');
    } catch { onError('Não foi possível salvar no IndexedDB. Verifique espaço e permissões do navegador.'); }
  }

  function share() {
    if (!assertComparison()) return;
    try {
      const canonical = window.location.hostname === 'pronatec.wicolly.com.br' ? 'https://pronatec.wicolly.com.br/' : window.location.href;
      const link = shareLinkFor(offers, offers[0].referenceDate, canonical);
      setShareUrl(link);
    } catch (e) { onError(e instanceof Error ? e.message : 'Não foi possível gerar o link.'); }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      try { await navigator.clipboard.writeText(shareUrl); }
      catch {
        const field = document.createElement('textarea'); field.value = shareUrl; field.style.position = 'fixed'; field.style.opacity = '0';
        document.body.append(field); field.select();
        const copied = document.execCommand('copy'); field.remove();
        if (!copied) throw new Error('Falha na cópia.');
      }
      onSuccess('Link da comparação copiado! Pode enviar para outra pessoa.');
    } catch { onError('A cópia falhou. Selecione o link e copie manualmente.'); }
  }
  async function nativeShare() {
    if (!shareUrl || !navigator.share) return;
    try {
      await navigator.share({ title: 'Preço na Régua', text: 'Veja qual oferta rende mais.', url: shareUrl });
      setShareUrl(null); onSuccess('Comparação compartilhada.');
    } catch (error) { if ((error as DOMException).name !== 'AbortError') onError('Não foi possível compartilhar; você pode copiar o link.'); }
  }

  function reset() {
    setOffers([blankOffer(todayLocal()), blankOffer(todayLocal())]); setAttempted(false);
    setShared(false); setSavedSignature(''); setNotice(null); setShareUrl(null);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  const renderedErrorsA = attempted || hasInput ? errorsA : {};
  const renderedErrorsB = attempted || hasInput ? errorsB : {};
  useEffect(() => {
    if (!shareUrl) return;
    const onEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') setShareUrl(null); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [shareUrl]);

  const dateNow = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Pular para o conteúdo</a>
    <Brand page={page} onChange={setPage} offline={!online} />
    {!online && <div className="offline-banner" role="status"><WifiOff size={15} /> Você está offline. Comparações, links e histórico local continuam disponíveis.</div>}
    {page === 'history' ? <HistoryScreen refreshKey={historyRevision} onBack={() => setPage('compare')} onError={onError} onSuccess={onSuccess} /> : <main id="main-content" className="container">
      <section className="hero"><div className="hero-copy"><div className="hero-overline"><span className="hero-overline-line" /> UM JEITO MAIS ESPERTO DE COMPRAR <span className="hero-overline-line" /></div>
        <h1>O menor preço<br />nem sempre é o<br /><span className="hero-mark">melhor negócio<span className="hero-period">.</span></span></h1>
        <p>Uma embalagem maior nem sempre vale mais a pena. Coloque duas ofertas lado a lado e descubra qual rende mais pelo seu dinheiro.</p>
        <div className="hero-facts"><span><Check size={15} /> Sem cadastro</span><span><Check size={15} /> Funciona offline</span><span><Check size={15} /> Seus dados são seus</span></div>
      </div><aside className="hero-right" aria-label="Como funciona o cálculo"><div className="hero-receipt"><div className="hero-receipt-head"><span>MANUAL DA BOA COMPRA</span><span>Nº 001</span></div><div className="hero-receipt-ruler" aria-hidden="true"><span>0</span><i /><i /><i /><i /><i /><i /><i /><i /><i /><span>10</span></div><div className="hero-receipt-main"><span>O SEGREDO É SIMPLES:</span><strong>PREÇO<br /><span>÷</span> QUANTIDADE</strong><p>= O PREÇO DE VERDADE.</p></div><div className="hero-receipt-bottom"><span>MENOS ACHISMO.<br />MAIS ECONOMIA.</span><Ruler size={30} strokeWidth={1.4} /></div></div><span className="hero-side-note">A RÉGUA CERTA PARA A SUA COMPRA. <ArrowUpRight size={14} /></span></aside></section>
      <div className="marquee-line" aria-label="Compare por quilo, litro e unidade"><div>POR QUILO <span>✳</span> POR LITRO <span>✳</span> POR UNIDADE <span>✳</span> SEM PEGADINHA <span>✳</span> A CONTA FECHA AQUI <span>✳</span></div></div>
      <section className="compare-section" aria-labelledby="compare-title"><div className="section-line"><div><span className="section-index">01 / COLOQUE NA BALANÇA</span><h2 id="compare-title">Duas ofertas. <em>Uma escolha.</em></h2></div><div className="section-side"><span>HOJE · {dateNow.toUpperCase()}</span><button type="button" className="clear-btn" onClick={reset}><RefreshCw size={15} /> Limpar tudo</button></div></div>
        {shared && <div className="shared-banner" role="status"><Share2 size={18} /><div><strong>Você abriu uma comparação compartilhada.</strong><span>Confira as ofertas, ajuste o que quiser e salve no seu próprio histórico.</span></div><button type="button" onClick={() => setShared(false)} aria-label="Ocultar mensagem"><X size={16} /></button></div>}
        <div className="offer-grid"><OfferForm side="a" offer={offers[0]} onChange={next => updateOffer(0, next)} errors={renderedErrorsA} /><div className="vs-badge" aria-hidden="true">VS</div><OfferForm side="b" offer={offers[1]} onChange={next => updateOffer(1, next)} errors={renderedErrorsB} /></div>
        {outcome?.status === 'incompatible' && <div className="validation-warning" role="alert"><SlidersHorizontal size={18} /> Você está comparando medidas diferentes. Selecione duas opções de massa (g/kg), duas de volume (mL/L) ou duas de unidades.</div>}
        <div className="compare-toolbar"><div className="toolbar-hint"><span className="toolbar-hint-icon"><LockKeyhole size={18} /></span><div><strong>Seu comparador, suas regras.</strong><p>Nenhum dado é enviado para servidores.</p></div></div><div className="toolbar-actions"><button type="button" className="secondary-btn" onClick={save}><Download size={17} /> Salvar no histórico</button><button type="button" className="primary-btn" onClick={share}><Share2 size={17} /> Compartilhar comparação <ArrowRight size={17} /></button></div></div>
      </section>
      <ResultViews comparison={comparison} view={view} onViewChange={setView} incomplete={!hasInput} errorMessage={errorMessage} />
      <section id="como-funciona" className="how-section"><div><span className="section-index">03 / SEM LETRAS MIÚDAS</span><h2>É matemática.<br /><em>Não é mágica.</em></h2><p>Não compare só o valor na etiqueta. A conta justa usa o preço dividido pela quantidade total, convertido para a mesma unidade.</p><a href="#compare-title" className="how-inline-link">VOLTAR AO COMPARADOR <ArrowUpRight size={15} /></a></div><div className="how-steps"><div><span>01</span><strong>INFORME AS OFERTAS</strong><p>Digite preço, tamanho da embalagem e quantidade do pacote.</p></div><div><span>02</span><strong>COLOQUE NA MESMA MEDIDA</strong><p>g vira kg, mL vira L, dúzias viram unidades.</p></div><div><span>03</span><strong>DECIDA SEM DÚVIDA</strong><p>Veja o vencedor, compartilhe ou guarde o preço para comparar depois.</p></div></div></section>
    </main>}
    <footer className="footer"><div className="container footer-inner"><div><strong>PREÇO NA RÉGUA<span>.</span></strong><p>Compare pelo que rende, não apenas pelo que custa.</p></div><div className="footer-right"><span>FEITO PARA ESCOLHAS MAIS INTELIGENTES</span><span>100% LOCAL · SEM CADASTRO · <ExternalLink size={13} /></span></div></div></footer>
    {shareUrl && <div className="dialog-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShareUrl(null); }}><div className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title" aria-describedby="share-description"><button type="button" className="dialog-close" onClick={() => setShareUrl(null)} aria-label="Fechar"><X size={20} /></button><span className="share-dialog-icon"><Share2 size={25} /></span><span className="eyebrow green">UM LINK. DUAS OFERTAS.</span><h3 id="share-title">Espalhe uma boa escolha.</h3><p id="share-description">Quem abrir este link receberá as duas ofertas para comparar, editar e salvar no próprio histórico. Seu histórico pessoal não é enviado.</p><label htmlFor="share-link">LINK DA COMPARAÇÃO</label><input id="share-link" autoFocus readOnly value={shareUrl} onFocus={e => e.currentTarget.select()} /><div className="dialog-buttons"><button type="button" className="secondary-btn" onClick={() => setShareUrl(null)}>Fechar</button><button type="button" className="primary-btn" onClick={copyShareLink}><Copy size={16} /> Copiar link</button>{typeof navigator.share === 'function' && <button type="button" className="primary-btn" onClick={nativeShare}><Share2 size={16} /> Enviar</button>}</div></div></div>}
    {notice && <div className={`toast toast-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}><span>{notice.kind === 'success' ? <Check size={20} /> : notice.kind === 'error' ? <X size={20} /> : <Copy size={20} />}</span><p>{notice.message}</p><button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={17} /></button></div>}
    {needRefresh && <div className="update-toast" role="status"><span>Uma atualização do aplicativo está disponível.</span><button type="button" onClick={() => { if (updateSW) void updateSW(); }}>Atualizar <RefreshCw size={15} /></button><button type="button" onClick={() => setNeedRefresh(false)} aria-label="Ignorar atualização"><X size={16} /></button></div>}
  </div>;
}
