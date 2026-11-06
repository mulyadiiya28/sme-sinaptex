"use client";

export default function GlobalError() {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <title>Kesalahan Server — POS-Sinaptex</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          {`body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:white;padding:3rem;border-radius:1.5rem;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);text-align:center;max-width:400px}.btn{background:#0b2f6e;color:white;padding:0.75rem 1.5rem;border:none;border-radius:0.75rem;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;margin-top:1rem}.btn:hover{background:#082657}`}
        </style>
      </head>
      <body>
        <div className="card">
          <h1 style={{fontSize:'1.5rem',fontWeight:800,color:'#0b2f6e',marginBottom:'1rem'}}>
            Terjadi kesalahan
          </h1>
          <p style={{color:'#64748b',marginBottom:'1.5rem'}}>
            Terjadi kesalahan server yang tidak terduga. Silakan coba muat ulang halaman atau hubungi administrator.
          </p>
          <a href="/" className="btn">Kembali ke Beranda</a>
        </div>
      </body>
    </html>
  );
}