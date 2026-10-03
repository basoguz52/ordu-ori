import PageShell from "./_PageShell";

// PDF'yi React projesinin /public altına koyarsan build sonrası aynen servis edilir.
// Örn: public/docs/faaliyet-takvimi.pdf  ->  https://domain.com/docs/faaliyet-takvimi.pdf
const PDF_RELATIVE_PATH = "/docs/faaliyet-takvimi.pdf";

export default function FaaliyetTakvimi() {
  // İstersen .env'e REACT_APP_PUBLIC_BASE_URL=https://orduoryantiring.com.tr gibi bir değer koy.
  // Yoksa aynı origin üzerinden dener.
  const baseUrl = ("https://orduoryantiring.com.tr").replace(/\/$/, "");
  const pdfUrl = `${baseUrl}${PDF_RELATIVE_PATH}` || PDF_RELATIVE_PATH;

  return (
    <PageShell title="Faaliyet Takvimi">
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: "none" }}
        >
          PDF'yi yeni sekmede aç
        </a>
        <span style={{ opacity: 0.6 }}>|</span>
        <a href={pdfUrl} download style={{ textDecoration: "none" }}>
          İndir
        </a>
      </div>

      <div
        style={{
          width: "100%",
          height: "80vh",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 8,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <iframe
          title="Faaliyet Takvimi PDF"
          src={`${pdfUrl}#view=FitH`}
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      </div>

      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>
        Not: Bazı mobil tarayıcılarda PDF iframe içinde açılmayabilir. Bu durumda yukarıdaki
        "yeni sekmede aç" linkini kullan.
      </div>
    </PageShell>
  );
}
