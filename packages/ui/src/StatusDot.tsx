interface StatusDotProps {
  status: 'active' | 'monitoring' | 'resolved';
  size?: number;
}

export function StatusDot({ status, size = 8 }: StatusDotProps) {
  const colorMap = {
    active: '#ef4444',
    monitoring: '#f97316',
    resolved: '#22c55e',
  };

  return (
    <span
      className="inline-block rounded-full"
      style={{
        backgroundColor: colorMap[status],
        width: size,
        height: size,
        boxShadow: status === 'active' ? `0 0 6px ${colorMap[status]}` : undefined,
        animation: status === 'active' ? 'pulse-risk 2s ease-in-out infinite' : undefined,
      }}
    />
  );
}
