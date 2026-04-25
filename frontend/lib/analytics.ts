declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    hj?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (gaId && window.gtag) {
    window.gtag("event", name, params);
  }
}

export function trackPageView(url: string) {
  if (typeof window === "undefined") return;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (gaId && window.gtag) {
    window.gtag("config", gaId, { page_path: url });
  }
}
