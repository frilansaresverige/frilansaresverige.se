import Script from 'next/script'

// The secret part of an edit link (/uppdrag/<id>) must not reach Google, so it
// is masked in the reported page location.
const configScript = (id: string) => `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  var path = location.pathname.replace(/^\\/uppdrag\\/(?!information(?:\\/|$))[^/]+/, '/uppdrag/[id]');
  gtag('config', ${JSON.stringify(id)}, {
    page_path: path,
    page_location: location.origin + path,
  });
`

const GoogleAnalytics = ({ id }: { id: string }) => (
  <>
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
      strategy="afterInteractive"
    />
    <Script id="google-analytics" strategy="afterInteractive">
      {configScript(id)}
    </Script>
  </>
)

export default GoogleAnalytics
