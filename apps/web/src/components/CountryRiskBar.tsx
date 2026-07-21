'use client';

interface CountryRisk {
  code: string;
  name: string;
  score: number;
  flag: string;
}

interface CountryRiskBarProps {
  countries: CountryRisk[];
}

export function CountryRiskBar({ countries }: CountryRiskBarProps) {
  const sorted = [...countries].sort((a, b) => b.score - a.score);

  return (
    <div className="rounded-lg border border-sentinel-700 bg-sentinel-800 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Risco por País</h3>
      <div className="space-y-2">
        {sorted.map((country) => (
          <div key={country.code} className="flex items-center gap-2">
            <span className="text-lg">{country.flag}</span>
            <span className="w-24 text-xs text-sentinel-200">{country.name}</span>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-sentinel-700">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${country.score}%`,
                    backgroundColor: getRiskHex(country.score),
                  }}
                />
              </div>
            </div>
            <span
              className="font-mono text-xs font-bold"
              style={{ color: getRiskHex(country.score) }}
            >
              {country.score}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getRiskHex(score: number): string {
  if (score <= 20) return '#22c55e';
  if (score <= 40) return '#eab308';
  if (score <= 60) return '#f97316';
  if (score <= 80) return '#ef4444';
  if (score <= 95) return '#a855f7';
  return '#000000';
}
