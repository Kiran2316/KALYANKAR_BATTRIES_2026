import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

/**
 * Creates and manages a Chart.js instance on a canvas ref.
 * Pass a `config` object (type, data, options) — it will be
 * rebuilt whenever `deps` changes, and destroyed on unmount.
 */
export function useChart(config, deps = []) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return undefined

    chartRef.current = new Chart(canvasRef.current, config)

    return () => {
      chartRef.current?.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return canvasRef
}
