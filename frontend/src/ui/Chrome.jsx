import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Footer from "../components/Footer";
import WelcomeModal from "../components/WelcomeModal";
import Consent from "./Consent";
import Nav from "./Nav";
import Reeded from "./Reeded";
import SiteBanner from "./SiteBanner";
import { trackPage } from "./track";

// The public site's frame: background, banner, nav, footer and consent. The admin console
// draws its own.
export default function Chrome({ children }) {
  const { pathname } = useLocation();
  useEffect(() => { trackPage(pathname); }, [pathname]);
  return (
    <>
      <Reeded />
      <div className="site">
        <SiteBanner />
        <Nav />
        <WelcomeModal />
        <div className="column">
          {children}
          <Footer />
        </div>
      </div>
      <Consent />
    </>
  );
}
