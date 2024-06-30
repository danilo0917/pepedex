import Col from "@/components/Col";
import Grid from "@/components/Grid";
import PageLayout from "@/components/PageLayout";

import LogoAndBackground from "@/components/LogoAndBackground"
import Badges from '@/components/Badges'
import Image from 'next/image'

const textBox = {
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  border: '1px solid #000',
  padding: '10px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '360px',
  width: '100%',
  borderRadius: '10px',
  backgroundImage: `linear-gradient(10.14deg,rgba(25,145,191,.15),rgba(27,22,89,.1) 86.61%),linear-gradient(180deg,#110d21,#2b2659)`,
};

export default function Bridge() {
  return (
    <PageLayout
      contentButtonPaddingShorter
      mobileBarTitle="Bridge"
      metaTitle="Bridge - Pepedex"
    >
      <LogoAndBackground />
      <Body />
    </PageLayout>
  )
}

function Body() {
  return (
    <div>
      <div className="ResponsiveFlexLayout">
        <div className="LeftColumn">
          <div className="flex text-center justify-center">
            <h1 className="text-6xl">Elon Cat Bridge</h1>
          </div>
          <br />
          <div className="text-6xl font-semibold text-center justify-center text-color">Coming Soon</div>
          <br />
          <p className="text-xl">Our Bridge allows you to exchange between different blockchains. Among other things, this makes it easy to purchase Pepedex token (ECAT) even if you are coming from another blockchain.</p>
          <br />
          <p className="text-xl">✔&nbsp;Quick and safe bridging</p>
          <p className="text-xl">✔&nbsp;Easy to use</p>
          <p className="text-xl">✔&nbsp;Multiple blockhains will be supported</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div className="badges-scroll-container mt-3">
              <div className="badges mt-4 mb-4" style={{ display: "flex", whiteSpace: "nowrap", alignItems: "center" }}>
                <Badges />
                <Badges />
              </div>
            </div>
          </div>
        </div>
        {/* <div className="RightColumn">

        </div> */}
      </div>
    </div>
  )
}
