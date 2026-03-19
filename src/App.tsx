import { useState, useEffect, useRef, useCallback } from "react";

/*
  CONFIGURATION — fill these in before deploying:
  1. Sign up at cloudinary.com (free)
  2. Create an unsigned upload preset: Settings → Upload → Add upload preset → Signing Mode: Unsigned
  3. Enable resource list: Settings → Security → "Restricted media types" → uncheck "Resource list"
*/
const CONFIG = {
  cloudName: "djeynpnd1",        // your Cloudinary cloud name
  uploadPreset: "Family Share",     // your unsigned upload preset name
  albumTag: "shared-album",
  albumTitle: "Our Photo Album",
  passcode: "1234",
};

const CONFIGURED = CONFIG.cloudName && CONFIG.uploadPreset;

// -- colors --
const bg = "#0a0a0a", fg = "#f0f0f0", muted = "#888", accent = "#6366f1";
const card = "#161616", border = "#262626";

const btnBase = { border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.15s" };
const btnPrimary = { ...btnBase, background: accent, color: "#fff", padding: "10px 20px" };
const btnGhost = (on) => ({ ...btnBase, background: on ? "#222" : "transparent", color: on ? "#fff" : muted, padding: "8px 16px" });

export default function PhotoAlbum() {
  const [view, setView] = useState("gallery");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authed, setAuthed] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lightbox, setLightbox] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  // Fetch all photos tagged with albumTag from Cloudinary
  const fetchPhotos = useCallback(async () => {
    if (!CONFIGURED) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://res.cloudinary.com/${CONFIG.cloudName}/image/list/${CONFIG.albumTag}.json`);
      if (!res.ok) {
        if (res.status === 404) { setPhotos([]); setLoading(false); return; }
        throw new Error("Failed to fetch photos. Make sure 'Resource list' is enabled in Cloudinary Security settings.");
      }
      const data = await res.json();
      const list = (data.resources || []).map(r => ({
        id: r.public_id,
        ver: r.version,
        fmt: r.format,
        w: r.width,
        h: r.height,
        created: r.created_at,
        thumb: `https://res.cloudinary.com/${CONFIG.cloudName}/image/upload/w_600,c_fill,q_auto,f_auto/${r.public_id}.${r.format}`,
        full: `https://res.cloudinary.com/${CONFIG.cloudName}/image/upload/q_auto,f_auto/${r.public_id}.${r.format}`,
      }));
      list.sort((a, b) => new Date(b.created) - new Date(a.created));
      setPhotos(list);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const handleUpload = async (files) => {
    if (!files.length || !CONFIGURED) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    let uploaded = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) { setProgress(p => ({ ...p, done: p.done + 1 })); continue; }
      const fd = new FormData();
      fd.append("file", f);
      fd.append("upload_preset", CONFIG.uploadPreset);
      fd.append("folder", "shared-album");
      fd.append("tags", CONFIG.albumTag);
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CONFIG.cloudName}/image/upload`, { method: "POST", body: fd });
        const d = await res.json();
        if (d.secure_url) uploaded++;
      } catch (err) {
        console.error("Upload failed:", err);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setUploading(false);
    if (uploaded > 0) fetchPhotos();
  };

  // Group by month
  const grouped = photos.reduce((acc, p) => {
    const d = new Date(p.created);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!acc[k]) acc[k] = { label, photos: [] };
    acc[k].photos.push(p);
    return acc;
  }, {});
  const months = Object.keys(grouped).sort().reverse();

  if (!CONFIGURED) return (
    <div style={{ minHeight: "100vh", background: bg, color: fg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: 40, maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚙️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Setup Required</h2>
        <p style={{ color: muted, fontSize: 14, lineHeight: 1.6 }}>
          Open <code style={{ background: border, padding: "2px 6px", borderRadius: 4 }}>src/App.jsx</code> and fill in
          your <strong>cloudName</strong> and <strong>uploadPreset</strong> in the CONFIG object at the top of the file.
        </p>
        <p style={{ color: muted, fontSize: 13, marginTop: 16 }}>
          Need a Cloudinary account? Sign up free at <a href="https://cloudinary.com" target="_blank" rel="noreferrer" style={{ color: accent }}>cloudinary.com</a>
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, color: fg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* HEADER */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(10,10,10,0.85)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${border}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{CONFIG.albumTitle}</h1>
          <div style={{ display: "flex", gap: 4, background: "#111", borderRadius: 10, padding: 3 }}>
            {[["gallery", "📷"], ["upload", "⬆"]].map(([v, ico]) => (
              <button key={v} onClick={() => setView(v)} style={btnGhost(view === v)}>
                {ico} <span style={{ marginLeft: 4 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>

        {/* UPLOAD VIEW */}
        {view === "upload" && !authed && (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 32, maxWidth: 320, margin: "60px auto 0", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <p style={{ color: muted, fontSize: 14, marginBottom: 16 }}>Enter the album passcode to upload</p>
            <input
              type="password"
              value={passInput}
              onChange={e => setPassInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && passInput === CONFIG.passcode) setAuthed(true); }}
              placeholder="Passcode"
              style={{ width: "100%", padding: "10px 12px", background: bg, border: `1px solid ${border}`, borderRadius: 8, color: fg, fontSize: 16, textAlign: "center", outline: "none", marginBottom: 12, boxSizing: "border-box", letterSpacing: 4 }}
            />
            <button onClick={() => { if (passInput === CONFIG.passcode) setAuthed(true); }} style={{ ...btnPrimary, width: "100%" }}>Enter</button>
          </div>
        )}

        {view === "upload" && authed && (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Add Photos</h2>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(Array.from(e.dataTransfer.files)); }}
              onClick={() => !uploading && fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? accent : border}`,
                borderRadius: 16, padding: "60px 20px", textAlign: "center",
                cursor: uploading ? "default" : "pointer",
                background: dragOver ? "rgba(99,102,241,0.05)" : card,
                transition: "all 0.2s",
              }}
            >
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleUpload(Array.from(e.target.files))} style={{ display: "none" }} />
              {uploading ? (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>Uploading {progress.done} of {progress.total}</p>
                  <div style={{ width: 200, height: 4, background: border, borderRadius: 2, margin: "0 auto", overflow: "hidden" }}>
                    <div style={{ width: `${(progress.done / progress.total) * 100}%`, height: "100%", background: accent, borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Tap to select photos</p>
                  <p style={{ fontSize: 13, color: muted, margin: 0 }}>or drag and drop here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GALLERY VIEW */}
        {view === "gallery" && (
          <div>
            {loading ? (
              <p style={{ textAlign: "center", color: muted, padding: 60 }}>Loading photos...</p>
            ) : error ? (
              <div style={{ background: card, border: `1px solid #7f1d1d`, borderRadius: 12, padding: 24, textAlign: "center", maxWidth: 480, margin: "40px auto" }}>
                <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>
              </div>
            ) : photos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🖼</div>
                <p style={{ fontSize: 16, color: muted }}>No photos yet</p>
                <button onClick={() => setView("upload")} style={{ ...btnPrimary, marginTop: 12 }}>Add Photos</button>
              </div>
            ) : (
              months.map(k => (
                <div key={k} style={{ marginBottom: 40 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: muted, marginBottom: 12, letterSpacing: 0.5 }}>
                    {grouped[k].label} <span style={{ fontWeight: 400, fontSize: 13 }}>· {grouped[k].photos.length}</span>
                  </h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
                    {grouped[k].photos.map(p => (
                      <div key={p.id} onClick={() => setLightbox(p)} style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: card }}>
                        <img
                          src={p.thumb}
                          alt=""
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.2s" }}
                          onMouseOver={e => e.target.style.transform = "scale(1.05)"}
                          onMouseOut={e => e.target.style.transform = "scale(1)"}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "90vw", maxHeight: "85vh" }}>
            <img src={lightbox.full} alt="" style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8, display: "block" }} />
            <button
              onClick={() => setLightbox(null)}
              style={{ ...btnBase, position: "absolute", top: -40, right: 0, background: "rgba(255,255,255,0.15)", color: "#fff", padding: "6px 14px", fontSize: 13 }}
            >✕ Close</button>
            <p style={{ textAlign: "center", color: muted, fontSize: 12, marginTop: 8 }}>
              {new Date(lightbox.created).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}