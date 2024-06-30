import Col from "@/components/Col";
import Grid from "@/components/Grid";
import LogoAndBackground from "@/components/LogoAndBackground";
import PageLayout from "@/components/PageLayout";
import Badges from '@/components/Badges'
import Image from 'next/image'
import SolXdex_NFT from '/public/logo/nft.png'
import useAppSettings from "@/application/common/useAppSettings";
import CyberpunkStyleCard from "@/components/CyberpunkStyleCard";
import Row from "@/components/Row";
import Collapse from "@/components/Collapse";
import useAirdrop from "@/application/airdrop/useAirdrop";

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
      mobileBarTitle="Airdrop"
      metaTitle="Airdrop - Pepedex"
    >
      <LogoAndBackground />
      <div>
        <AirdropHeader />
        {/* <AirdropCard />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className="badges-scroll-container mt-3">
            <div className="badges mt-4 mb-4" style={{ display: "flex", whiteSpace: "nowrap", alignItems: "center" }}>
              <Badges />
              <Badges />
            </div>
          </div>
        </div> */}
        <div className="text-6xl font-semibold text-center justify-center text-color">Coming Soon</div>
      </div>
    </PageLayout>
  )
}

function AirdropHeader() {
  return (
    <>
      <div className="text-center justify-center mb-2">
        <p className="text-xl">Airdrop ECAT to top 100 stakers!</p>
      </div>
    </>
  )
}

function AirdropCard() {
  const isMobile = useAppSettings((s) => s.isMobile)
  const infos = useAirdrop((s) => s.stakeInfo)
  return (
    <CyberpunkStyleCard
      wrapperClassName="flex-1 overflow-hidden flex flex-col h-full"
      className="grow p-10 pt-6 pb-4 mobile:px-3 mobile:py-3 w-full flex flex-col h-full"
      key="1">
      <Row type="grid-x" className="border-1 sticky border-soild border-[#7aa8ed7d] py-5 px-8 mobile:py-4 mobile:px-5 gap-2 items-stretch gap-3 text-color rounded-xl grid-cols-[1fr,auto, 1fr]">
        <Row className=" font-medium self-center text-color text-sm">Rank</Row>
        <Row className=" font-medium self-center text-color text-sm">Address</Row>
        <Row className=" font-medium self-center text-color text-sm -mr-8">Staking Amount</Row>
      </Row>
      <Row type="grid" className="gap-3 text-color rounded-xl mt-4">

        {infos && infos.map((info, index) => {
          return (
            index <= 99 &&
            <Row key={String(index)} type="grid-x" className="gap-3 text-color rounded-xl grid-cols-[1fr,auto, 1fr]">
              <Row className=" font-medium self-center text-color text-sm ml-10">#{index + 1}</Row>
              <Row className=" font-medium self-center text-color text-sm"><a href={`https://solscan.io/account/${info[0]}`} rel="noreferrer" target="_blank">{String(info[0]).slice(0, 5)}...{String(info[0]).slice(-5)}</a></Row>
              <Row className=" font-medium self-center text-color text-sm">{new Intl.NumberFormat().format(info[1].toFixed(3))}</Row>
            </Row>
          )

        })}
      </Row>
    </CyberpunkStyleCard>
  )
}