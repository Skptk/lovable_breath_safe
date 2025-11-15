import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Optimized: Use matchMedia.matches instead of innerWidth to avoid forced reflow
    const onChange = () => {
      setIsMobile(mql.matches)
    }
    
    mql.addEventListener("change", onChange)
    
    // Initial check - use matchMedia instead of innerWidth
    setIsMobile(mql.matches)
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
