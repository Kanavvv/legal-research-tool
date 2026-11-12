import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { API_URL, apiFetch, responseError } from "../api";

// "Save to folder": a small popover listing the user's folders, with a field
// to start a new one. Signed-out visitors are sent to sign in.
export default function SaveToFolder({ question, answer, sources }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const box = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  async function toggle() {
    if (!user) { navigate("/account"); return; }
    const next = !open;
    setOpen(next);
    setStatus("");
    if (next && folders === null) {
      try {
        const res = await apiFetch(`${API_URL}/folders`);
        if (!res.ok) throw await responseError(res);
        setFolders((await res.json()).folders);
      } catch {
        setFolders([]);
        setStatus("Couldn't load your folders.");
      }
    }
  }

  async function saveTo(folder) {
    setStatus("Saving…");
    try {
      const res = await apiFetch(`${API_URL}/folders/${folder.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, sources }),
      });
      if (!res.ok) throw await responseError(res);
      setStatus(`Saved to ${folder.name}`);
      setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, count: f.count + 1 } : f)));
      setTimeout(() => setOpen(false), 900);
    } catch (err) {
      setStatus(err?.userMessage || "Couldn't save that.");
    }
  }

  async function createAndSave(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setStatus("Creating…");
    try {
      const res = await apiFetch(`${API_URL}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (!res.ok) throw await responseError(res);
      const folder = await res.json();
      setFolders((prev) => [folder, ...(prev || [])]);
      setName("");
      await saveTo(folder);
    } catch (err) {
      setStatus(err?.userMessage || "Couldn't create that folder.");
    }
  }

  return (
    <div className="folder-pick" ref={box}>
      <button type="button" className="btn btn--ghost btn--sm" aria-expanded={open} aria-haspopup="dialog" onClick={toggle}>
        Save to folder
      </button>
      {open && (
        <div className="folder-pop" role="dialog" aria-label="Save to a folder">
          {folders === null ? (
            <p className="muted">Loading…</p>
          ) : (
            <>
              {folders.length > 0 && (
                <ul>
                  {folders.map((f) => (
                    <li key={f.id}>
                      <button type="button" onClick={() => saveTo(f)}>
                        <span>{f.name}</span><span className="mono muted">{f.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={createAndSave}>
                <label htmlFor="new-folder" className="sr-only">New folder name</label>
                <input id="new-folder" value={name} onChange={(e) => setName(e.target.value)} placeholder="New folder, e.g. Tenant matter" maxLength={80} />
                <button type="submit" className="btn btn--lime btn--sm" disabled={!name.trim()}>Add</button>
              </form>
            </>
          )}
          {status && <p className="folder-status" role="status">{status}</p>}
        </div>
      )}
    </div>
  );
}
