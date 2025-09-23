import { useEffect, useState, useRef } from 'react';

export function MemoryProfiler() {
  const [memory, setMemory] = useState<{
    jsHeapSizeLimit?: number;
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
  }>({});

  const [active, setActive] = useState(false);
  const [stats, setStats] = useState<Array<{time: string; used: number}>>([]);
  const statsRef = useRef<Array<{time: string; used: number}>>([]);
  const maxStats = 60; // Keep last 60 seconds of data

  useEffect(() => {
    if (!active || !(window as any).performance?.memory) return;

    const interval = setInterval(() => {
      const { usedJSHeapSize } = (window.performance as any).memory;
      const now = new Date();
      const timeStr = `${now.getMinutes()}:${now.getSeconds()}`;
      
      const newStat = {
        time: timeStr,
        used: Math.round(usedJSHeapSize / 1024 / 1024)
      };
      
      statsRef.current = [...(statsRef.current.slice(-(maxStats - 1))), newStat];
      setStats(statsRef.current);
      
      setMemory({
        jsHeapSizeLimit: Math.round((window.performance as any).memory.jsHeapSizeLimit / 1024 / 1024),
        totalJSHeapSize: Math.round((window.performance as any).memory.totalJSHeapSize / 1024 / 1024),
        usedJSHeapSize: Math.round(usedJSHeapSize / 1024 / 1024),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [active]);

  if (!(window as any).performance?.memory) {
    return (
      <div style={styles.container}>
        <div>Performance.memory API not available</div>
      </div>
    );
  }

  const maxUsed = Math.max(...stats.map(s => s.used), 10);
  const minUsed = Math.min(...stats.length ? stats.map(s => s.used) : [0]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Memory Usage</h3>
        <button 
          onClick={() => setActive(!active)}
          style={active ? styles.stopButton : styles.startButton}
        >
          {active ? 'Stop' : 'Start'}
        </button>
      </div>
      
      <div style={styles.stats}>
        <div>Used: <strong>{memory.usedJSHeapSize || '--'} MB</strong></div>
        <div>Total: {memory.totalJSHeapSize || '--'} MB</div>
        <div>Limit: {memory.jsHeapSizeLimit || '--'} MB</div>
      </div>
      
      {active && stats.length > 0 && (
        <div style={styles.chart}>
          {stats.map((stat, i) => (
            <div 
              key={i}
              style={{
                ...styles.bar,
                height: `${(stat.used / (maxUsed * 1.1)) * 50}px`,
                backgroundColor: stat.used > (memory.jsHeapSizeLimit || 0) * 0.7 
                  ? '#ff6b6b' 
                  : stat.used > (memory.jsHeapSizeLimit || 0) * 0.5 
                    ? '#ffd166' 
                    : '#06d6a0'
              }}
              title={`${stat.time} - ${stat.used}MB`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    color: 'white',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'monospace',
    zIndex: 9999,
    maxWidth: '300px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  stats: {
    marginBottom: '8px',
    lineHeight: '1.4',
  },
  chart: {
    display: 'flex',
    alignItems: 'flex-end',
    height: '60px',
    gap: '2px',
    marginTop: '8px',
  },
  bar: {
    flex: 1,
    minWidth: '2px',
    backgroundColor: '#06d6a0',
    borderRadius: '2px',
    transition: 'height 0.3s ease',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  stopButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};
