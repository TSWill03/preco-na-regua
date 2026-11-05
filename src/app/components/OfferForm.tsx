import { Link2, Store, Tag, CalendarDays, Package, ArrowUpRight } from 'lucide-react';
import { type OfferInput } from '../../domain/comparison';
import { UNIT_GROUPS } from '../../domain/units';
import type { ReactNode } from 'react';

interface FieldProps { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; error?: string; type?: string; inputMode?: 'decimal' | 'numeric' | 'text'; maxLength?: number; icon?: ReactNode }
function Field({ id, label, value, onChange, placeholder, error, type = 'text', inputMode, maxLength, icon }: FieldProps) {
  return <div className="field">
    <label htmlFor={id} className="field-label">{icon}<span>{label}</span></label>
    <input id={id} className={`text-input ${error ? 'invalid-input' : ''}`} type={type} inputMode={inputMode} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} maxLength={maxLength} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />
    {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
  </div>;
}

interface OfferFormProps {
  side: 'a' | 'b'; offer: OfferInput; onChange: (next: OfferInput) => void;
  errors: Record<string, string>; expanded?: boolean;
}
export function OfferForm({ side, offer, onChange, errors }: OfferFormProps) {
  const update = (field: keyof OfferInput, value: string) => onChange({ ...offer, [field]: value });
  const id = (field: string) => `${side}-${field}`;
  return <section className={`offer-panel offer-panel-${side}`} aria-label={`Oferta ${side.toUpperCase()}`}>
    <div className="offer-heading">
      <span className={`offer-badge offer-badge-${side}`}>{side.toUpperCase()}</span>
      <div><span className="eyebrow">OPÇÃO {side === 'a' ? '01' : '02'}</span><h3>Oferta {side.toUpperCase()}</h3></div>
      <div className="offer-decoration" aria-hidden="true"><span /><span /><span /><span /><span /></div>
    </div>
    <div className="offer-form-body">
      <div className="field-grid-two">
        <Field id={id('product')} label="Produto" value={offer.product} onChange={value => update('product', value)} placeholder="Ex.: Arroz branco" maxLength={100} error={errors.product} icon={<Tag size={14} />} />
        <Field id={id('brand')} label="Marca (opcional)" value={offer.brand} onChange={value => update('brand', value)} placeholder="Ex.: Marca X" maxLength={100} error={errors.brand} />
      </div>
      <div className="measure-block">
        <div className="measure-field price-measure">
          <label className="measure-label" htmlFor={id('price')}>PREÇO DO CONJUNTO</label>
          <div className={`measure-input-shell ${errors.price ? 'measure-invalid' : ''}`}><span>R$</span><input id={id('price')} type="text" inputMode="decimal" placeholder="0,00" maxLength={16} value={offer.price} onChange={event => update('price', event.target.value)} aria-invalid={!!errors.price} aria-describedby={errors.price ? `${id('price')}-error` : undefined} /></div>
          {errors.price && <span className="field-error" id={`${id('price')}-error`}>{errors.price}</span>}
        </div>
        <div className="measure-field quantity-measure">
          <label className="measure-label" htmlFor={id('quantity')}>QUANTIDADE POR EMBALAGEM</label>
          <div className={`measure-input-shell ${errors.quantity ? 'measure-invalid' : ''}`}>
            <input id={id('quantity')} type="text" inputMode="decimal" placeholder="500" maxLength={16} value={offer.quantity} onChange={event => update('quantity', event.target.value)} aria-invalid={!!errors.quantity} aria-describedby={errors.quantity ? `${id('quantity')}-error` : undefined} />
            <select id={id('unit')} aria-label={`Unidade da oferta ${side.toUpperCase()}`} value={offer.unit} onChange={event => update('unit', event.target.value)}>
              {UNIT_GROUPS.map(group => <optgroup label={group.title} key={group.title}>{group.units.map(unit => <option key={unit} value={unit}>{unit === 'ml' ? 'mL' : unit === 'l' ? 'L' : unit === 'un' ? 'un.' : unit === 'dz' ? 'dz.' : unit}</option>)}</optgroup>)}
            </select>
          </div>
          {errors.quantity && <span className="field-error" id={`${id('quantity')}-error`}>{errors.quantity}</span>}
        </div>
      </div>
      <div className="packing-strip">
        <span className="packing-description"><Package size={17} /> Leve mais de uma embalagem?</span>
        <div className="packing-control"><span aria-hidden="true">×</span><label htmlFor={id('packCount')} className="sr-only">Embalagens no conjunto, oferta {side.toUpperCase()}</label><input id={id('packCount')} type="text" inputMode="numeric" maxLength={3} value={offer.packCount} onChange={event => update('packCount', event.target.value)} aria-invalid={!!errors.packCount} /></div>
      </div>
      {errors.packCount && <span className="field-error">{errors.packCount}</span>}
      <div className="field-grid-two ancillary-fields">
        <Field id={id('store')} label="Onde encontrou?" value={offer.store} onChange={value => update('store', value)} placeholder="Nome do mercado" maxLength={100} error={errors.store} icon={<Store size={14} />} />
        <Field id={id('referenceDate')} label="Data da oferta" type="date" value={offer.referenceDate} onChange={value => update('referenceDate', value)} error={errors.referenceDate} icon={<CalendarDays size={14} />} />
      </div>
      <details className="link-details"><summary><Link2 size={15} /> Adicionar link da promoção <ArrowUpRight size={14} /></summary>
        <div className="link-details-content"><Field id={id('sourceUrl')} label="Endereço da promoção (opcional)" type="url" value={offer.sourceUrl} onChange={value => update('sourceUrl', value)} placeholder="https://loja.com/produto" maxLength={1024} error={errors.sourceUrl} /></div>
      </details>
    </div>
  </section>;
}
