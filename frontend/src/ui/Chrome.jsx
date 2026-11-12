import Footer from "../components/Footer";
import WelcomeModal from "../components/WelcomeModal";
import Consent from "./Consent";
import Nav from "./Nav";
import Reeded from "./Reeded";
import SiteBanner from "./SiteBanner";

// The public site's frame: background, banner, nav, footer and consent. The admin console
// draws its own.
export default function Chrome({ children }) {
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
