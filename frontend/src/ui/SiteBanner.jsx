import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../api";

// A one-line announcement the admin can switch on from /admin > Settings.
export default function SiteBanner() {
  const [banner, setBanner] = useState(null);
  useEffect(() => {
    fetch(`${API_URL}/site-config`).then((r) => (r.ok ? r.json() : null)).then((d) => setBanner(d?.banner || null)).catch(() => {});
  }, []);
  if (!banner) return null;
  const { text, link } = banner;
  if (!link) return <p className="site-banner" role="status">{text}</p>;
  return link.startsWith("/")
    ? <Link className="site-banner" to={link}>{text}</Link>
    : <a className="site-banner" href={link} target="_blank" rel="noreferrer">{text}</a>;
}
