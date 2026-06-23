interface CTASectionProps {
  title: string;
  description?: string;
  primaryButtonText: string;
  primaryButtonHref?: string;
  onPrimaryButtonClick?: () => void;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  onSecondaryButtonClick?: () => void;
  backgroundGlow?: 'purple' | 'cyan' | 'pink';
}

export default function CTASection({
  title,
  description,
  primaryButtonText,
  primaryButtonHref,
  onPrimaryButtonClick,
  secondaryButtonText,
  secondaryButtonHref,
  onSecondaryButtonClick,
  backgroundGlow = 'purple'
}: CTASectionProps) {
  const glowClasses = {
    purple: 'neon-glow-purple',
    cyan: 'neon-glow-cyan',
    pink: 'neon-glow-pink'
  };

  const handlePrimaryClick = () => {
    if (onPrimaryButtonClick) {
      onPrimaryButtonClick();
    }
  };

  const handleSecondaryClick = () => {
    if (onSecondaryButtonClick) {
      onSecondaryButtonClick();
    }
  };

  return (
    <section className="section-container space-section" aria-labelledby="cta-heading">
      <div className={`glass-cyber rounded-2xl p-8 md:p-12 text-center ${glowClasses[backgroundGlow]}`}>
        <h2 id="cta-heading" className="text-h2 mb-4">{title}</h2>
        
        {description && (
          <p className="text-lead mb-8 max-w-2xl mx-auto">{description}</p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {primaryButtonHref ? (
            <a
              href={primaryButtonHref}
              className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label={primaryButtonText}
            >
              {primaryButtonText}
            </a>
          ) : (
            <button
              onClick={handlePrimaryClick}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              aria-label={primaryButtonText}
            >
              {primaryButtonText}
            </button>
          )}
          
          {secondaryButtonText && (
            secondaryButtonHref ? (
              <a
                href={secondaryButtonHref}
                className="inline-flex items-center justify-center px-8 py-3 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label={secondaryButtonText}
              >
                {secondaryButtonText}
              </a>
            ) : (
              <button
                onClick={handleSecondaryClick}
                className="px-8 py-3 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-all font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label={secondaryButtonText}
              >
                {secondaryButtonText}
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}
