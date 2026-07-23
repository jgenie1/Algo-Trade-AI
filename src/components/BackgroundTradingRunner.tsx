"use client";

import { useEffect, useState } from 'react';
import { useTradingSimulation } from '@/hooks/useTradingSimulation';

function SimulationHookLauncher() {
  useTradingSimulation();
  return null;
}

export default function BackgroundTradingRunner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <SimulationHookLauncher />;
}
