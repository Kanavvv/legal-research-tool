import { Link } from "react-router-dom";
import { useSiteConfig } from "./siteConfig";

// A one-line announcement the admin can switch on from the control room's Settings.
export default function SiteBanner() {
  const banner = useSiteConfig()?.banner;
  if (!banner) return null;
  const { text, link } = banner;
  if (!link) return <p className="site-banner" role="status">{text}</p>;
  return link.startsWith("/")
    ? <Link className="site-banner" to={link}>{text}</Link>
    : <a className="site-banner" href={link} target="_blank" rel="noreferrer">{text}</a>;
}
