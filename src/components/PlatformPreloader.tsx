import { BrandMark } from './BrandMark';

export function PlatformPreloader({ label = 'Preparing your experience', compact = false }: { label?: string; compact?: boolean }) {
  return <div className={`leaders-preloader${compact ? ' is-compact' : ''}`} role="status" aria-live="polite" aria-label={label}>
    <div className="leaders-preloader-eyes" aria-hidden="true">
      <span className="leaders-loader-eye is-left"><span className="leaders-loader-iris"><span /></span></span>
      <span className="leaders-loader-eye is-right"><span className="leaders-loader-iris"><span /></span></span>
    </div>
    <div className="leaders-preloader-brand" aria-hidden="true"><BrandMark light={false} /></div>
    <span className="leaders-preloader-label">{label}</span>
    <span className="leaders-preloader-dots" aria-hidden="true"><i /><i /><i /></span>
  </div>;
}
