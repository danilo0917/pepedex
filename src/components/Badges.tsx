import React from "react";
import Image from "next/image";
import PinkSale_KYC from '/public/logo/pinksale-kyc.png'
import PinkSale_AMA from '/public/logo/pinksale-ama.png'
import PinkSale_Doxx from '/public/logo/pinksale-doxx.png'
import ApeOClock_Badge from '/public/logo/Featured-on-ApeOclock-Light.png'
import Audit_Badge from '/public/logo/audit_by_cs.svg'

const height = 90

const Badges = () => {
  return (
    <>
      {/* <div style={{
        display: "flex",
        flexDirection: "column",
        paddingRight: "16px",
      }}>
        <a target="_blank" rel="noreferrer" className="ml-3 btn-simple" href="https://pinksale.notion.site/">
          <Image src={PinkSale_KYC} width="216" height={height} alt="Passed KYC on PinkSale" /></a>
      </div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        paddingRight: "16px",
      }}>
        <a target="_blank" rel="noreferrer" className="btn-simple" href="https://www.youtube.com/watch?v=DVvSwsWMgvg">
          <Image src={PinkSale_AMA} width="216" height={height} alt="Watch AMA with PinkSale" /></a>
      </div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        paddingRight: "16px",
      }}>
        <a target="_blank" rel="noreferrer" className="btn-simple" href="https://beta.pinksale.finance/solana/launchpad/E5CRc2uHE9e1a3mA8NttfXVgLY3p2mSdgE24pPCF8VYZ">
          <Image src={PinkSale_Doxx} width="216" height={height} alt="PinkSale Doxx" /></a>
      </div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "black",
        borderRadius: "2em",
        marginRight: "10px",
        paddingRight: "16px",
      }}>
        <a target="_blank" rel="noreferrer" className="btn-simple" href="https://coinsult.net/projects/solanax/">
          <Image src="/logo/audit_by_cs.svg" width="244" height={height} alt="Audit by CS" /></a>
      </div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        padding: "4px",
      }}>
        <a target="_blank" rel="noreferrer" className="btn-simple" href="https://www.apeoclock.com/launch/solanax-presale">
          <Image src={ApeOClock_Badge} width="232" height={height} alt="Featured on Ape O'Clock" /></a>
      </div> */}
    </>
  );
};

export default Badges;
