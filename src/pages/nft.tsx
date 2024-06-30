import Col from "@/components/Col";
import Grid from "@/components/Grid";
import LogoAndBackground from "@/components/LogoAndBackground";
import PageLayout from "@/components/PageLayout";
import Badges from '@/components/Badges'
import Image from 'next/image'
import ElonCat_NFT from '/public/logo/nft.png'

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

export default function NftStakingPage() {

  return (
    <PageLayout
      contentButtonPaddingShorter
      mobileBarTitle="NFT"
      metaTitle="NFT - Pepedex"
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
            <h1 className="text-6xl">Elon Cat NFT</h1>
          </div>
          <br />
          <div className="text-6xl font-semibold text-center justify-center text-color">Coming Soon</div>
          <br />
          <p className="text-xl">NFTs will present an excelent opportunity for investors, more information will be available soon!</p>
          <br />
          <p className="text-xl">✔&nbsp;Profitable</p>
          <p className="text-xl">✔&nbsp;Bring an extra utility for the platform</p>
          <p className="text-xl">✔&nbsp;Good long-term investment</p>
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
