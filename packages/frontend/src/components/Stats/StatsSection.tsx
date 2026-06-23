interface Stat {
  value: string;
  label: string;
  color?: 'purple' | 'pink' | 'cyan' | 'green' | 'yellow';
}

interface StatsSectionProps {
  stats: Stat[];
  title?: string;
  description?: string;
}

export default function StatsSection({ stats, title, description }: StatsSectionProps) {
  const colorClasses = {
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    cyan: 'text-cyan-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400'
  };

  return (
    <section className="section-container space-section" aria-labelledby={title ? 'stats-heading' : undefined}>
      {title && (
        <h2 id="stats-heading" className="text-h2 text-center mb-4">{title}</h2>
      )}
      {description && (
        <p className="text-lead text-center mb-12">{description}</p>
      )}
      
      <div className="grid-stats">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="glass-cyber rounded-lg p-6 text-center hover:bg-white/10 transition-all"
            tabIndex={0}
            role="img"
            aria-label={`${stat.label}: ${stat.value}`}
          >
            <div className={`text-stat ${stat.color ? colorClasses[stat.color] : 'text-white'}`}>
              {stat.value}
            </div>
            <div className="text-caption mt-2">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
