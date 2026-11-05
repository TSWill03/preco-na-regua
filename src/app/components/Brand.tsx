import { ArrowUpRight, ChartNoAxesColumn, ClipboardList, Ruler, WifiOff } from 'lucide-react';

interface BrandProps { page: 'compare' | 'history'; onChange: (page: 'compare' | 'history') => void; offline: boolean }
export function Brand({ page, onChange, offline }: BrandProps) {
  return <header className="topbar">
    <div className="topbar-inner">
      <button className="brand-lockup" type="button" onClick={() => onChange('compare')} aria-label="Preço na Régua, ir para comparador">
        <span className="brand-icon" aria-hidden="true"><Ruler size={27} strokeWidth={2.5} /></span>
        <span className="brand-type"><strong>PREÇO<span>NA</span>RÉGUA<span className="brand-dot">.</span></strong><small>DECISÃO BOA TEM MEDIDA.</small></span>
      </button>
      <nav className="main-nav" aria-label="Navegação principal">
        <button type="button" className={`nav-link ${page === 'compare' ? 'is-active' : ''}`} onClick={() => onChange('compare')} aria-current={page === 'compare' ? 'page' : undefined}><ChartNoAxesColumn size={16} /> Comparar</button>
        <button type="button" className={`nav-link ${page === 'history' ? 'is-active' : ''}`} onClick={() => onChange('history')} aria-current={page === 'history' ? 'page' : undefined}><ClipboardList size={16} /> Histórico</button>
      </nav>
      <div className="topbar-right">
        {offline ? <span className="connection-pill offline" role="status"><WifiOff size={14} /> Modo offline</span> : <span className="connection-pill"><span className="connection-dot" /> Salvo no seu navegador</span>}
        <a className="topbar-help" href="#como-funciona" aria-label="Entenda como funciona">COMO FUNCIONA <ArrowUpRight size={14} /></a>
      </div>
    </div>
  </header>;
}
