"use client";

import {useEffect} from 'react';

const measurementId = 'G-F5MZ3SEMTV';
const productionHost = 'xn--js0bx4ezvk5jm1b610k.com';

export default function HomeAnalytics() {
  useEffect(() => {
    const {location} = window;
    if (location.protocol !== 'https:' || location.hostname !== productionHost || location.pathname !== '/') return;

    // Keep an existing Google Tag or GTM installation in charge if present.
    const google = window as Window & {dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void};
    if (google.gtag || document.querySelector('script[src*="googletagmanager.com/gtag/js"],script[src*="googletagmanager.com/gtm.js"]')) return;

    const queue = google.dataLayer ??= [];
    function gtag(..._args: unknown[]) { queue.push(arguments); }
    google.gtag = gtag;

    let referrer = '';
    try { if (document.referrer) referrer = new URL(document.referrer).origin; } catch {}
    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false,
      page_location: location.origin + '/',
      page_referrer: referrer,
    });
    gtag('event', 'page_view', {
      send_to: measurementId,
      page_location: location.origin + '/',
      page_referrer: referrer,
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.appendChild(script);
  }, []);
  return null;
}
