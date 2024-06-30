import { ReactNode, useEffect, useMemo, useState } from "react";
import { twMerge } from "tailwind-merge";
import axios from "axios";
import useAppSettings from "@/application/common/useAppSettings";
import useFarms from "@/application/farms/useFarms";
import useStaking, { IStakeInfo } from "@/application/staking/useStaking";
import useToken from "@/application/token/useToken";
import useWallet from "@/application/wallet/useWallet";
import AutoBox from "@/components/AutoBox";
import Button from "@/components/Button";
import Col from "@/components/Col";
import Collapse from "@/components/Collapse";
import CyberpunkStyleCard from "@/components/CyberpunkStyleCard";
import Grid from "@/components/Grid";
import Icon from "@/components/Icon";
import PageLayout from "@/components/PageLayout";
import RefreshCircle from "@/components/RefreshCircle";
import Row from "@/components/Row";
import { StakingPageStakeLpDialog } from "../pageComponents/dialogs/StakingPageStakeLpDialog";
import txHarvest from "@/application/staking/txHarvest";
import { web3 } from "@project-serum/anchor";
import { BN } from "bn.js";
import toTotalPrice from "@/functions/format/toTotalPrice";
import toUsdVolume from "@/functions/format/toUsdVolume";
import {
  customBalanceOf,
  getLpPrice,
  getRGamesPriceFromLP,
} from "@/application/staking/getSignMessage";
import formatNumber from "@/functions/format/formatNumber";
import { toString } from "@/functions/numberish/toString";
import Image from "next/image";
import LogoAndBackground from "@/components/LogoAndBackground";
import Badges from "@/components/Badges";
import { RGAMELpAddress, RGAMETokenAddress } from "@/types/constants";
import { info } from "console";

export default function StakingPage() {
  return (
    <PageLayout
      mobileBarTitle="Staking"
      metaTitle="Staking - Pepedex"
      contentButtonPaddingShorter
    >
      <div className="flex justify-center -mt-0 py-6">
        <Image
          src="/logo/wifdex.png"
          width="240"
          height="240"
          alt="logo"
          style={{ borderRadius: "20px 20px 20px 20px" }}
        />
      </div>
      <div className="ResponsiveLayout">
        <StakingHeader />
        <StakingCard />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div className="badges-scroll-container mt-3">
            <div
              className="badges mt-4 mb-4"
              style={{
                display: "flex",
                whiteSpace: "nowrap",
                alignItems: "center",
              }}
            >
              <Badges />
              <Badges />
            </div>
          </div>
        </div>

        {/* <div className="text-6xl font-semibold text-center justify-center text-color">Coming Soon</div> */}
      </div>
    </PageLayout>
  );
}

function StakingHeader() {
  const refreshFarmInfos = useFarms((s) => s.refreshFarmInfos);
  return (
    <>
      <div className="text-center justify-center mb-2">
        {/* <h1 className="text-6xl">Staking</h1>
        <br /> */}
        <p className="text-xl text-color">Boost your rewards by depositing tokens.</p>
      </div>

      {/* <Grid className="grid-cols-[1fr,1fr] items-center gap-y-8 pb-4 pt-2">
        <div className="justify-self-end">
          <RefreshCircle
            refreshKey="staking"
            popPlacement="left"
            className="justify-self-end"
            freshFunction={refreshFarmInfos}
          />
        </div>
      </Grid> */}
    </>
  );
}

function StakingCard() {
  const isMobile = useAppSettings((s) => s.isMobile);
  const rawInfos = useStaking((s) => s.info);
  const infos = rawInfos.filter(
    (info, index) => info.poolData?.isFarmLP == false
  );
  return (
    <CyberpunkStyleCard
      wrapperClassName="flex-1 overflow-hidden flex flex-col h-full"
      className="grow p-10 pt-6 pb-4 mobile:px-3 mobile:py-3 w-full flex flex-col h-full"
      key="1"
    >
      <Row type="grid" className="gap-3 text-color  rounded-xl">
        {infos &&
          infos.map((info, index) => (
            <div key={String(index)}>
              <Collapse>
                <Collapse.Face>
                  {/* {({ isOpen }) => (
                    <StakingCardCollapseItemFace open={isOpen} info={info} />
                  )} */}
                  <StakingCardCollapseItemFace open={true} info={info} />
                  <StakingCardCollapseItemContent info={info} />
                </Collapse.Face>
                <Collapse.Body>
                  {/* <StakingCardCollapseItemContent info={info} /> */}
                </Collapse.Body>
              </Collapse>
            </div>
          ))}
        <StakingPageStakeLpDialog />
      </Row>
    </CyberpunkStyleCard>
  );
}

function StakingCardCollapseItemFace({
  open,
  info,
}: {
  open: boolean;
  info: IStakeInfo;
}) {
  const isMobile = useAppSettings((s) => s.isMobile);
  // const [apiLpPrice, setApiLpPrice] = useState(0);
  const [rewardTokenPrice, setRewardTokenPrice] = useState(0);
  const [quoteTokenPrice, setQuoteTokenPrice] = useState(0);
  // const prices = useToken((s) => s.tokenPrices)
  // const price = prices["36PWqKTHo8tCXu8NZ9cP7acLsceTQnpkz2ZdPE4Xish8"]
  // const apr = info.stakePoolData?.rewardsPerSecond && rewardTokenPrice && info.stakePoolData?.balance ? info.stakePoolData?.rewardsPerSecond
  const apr =
    info.stakePoolData?.rewardsPerSecond &&
    rewardTokenPrice &&
    quoteTokenPrice &&
    info.stakePoolData?.balance
      ? (info.stakePoolData?.rewardsPerSecond *
          rewardTokenPrice *
          31536000 *
          100) /
        (info.stakePoolData?.balance *
          quoteTokenPrice *
          10 **
            ((info?.poolData?.reward.decimals ?? 9) -
              (info?.poolData?.quote.decimals ?? 9)))
      : 0;
  useEffect(() => {
    async function fetchRewardTokenPrice(tokenMint: string) {
      try {
        if (info.poolData?.reward.address !== RGAMETokenAddress) {
          const resp = await axios.get(
            `https://price.jup.ag/v4/price?ids=${tokenMint}&vsToken=USDT`
          );
          if (resp.status == 200) {
            setRewardTokenPrice(resp.data.data[tokenMint].price);
          }
        } else {
          const price = await getRGamesPriceFromLP(RGAMELpAddress);
          setRewardTokenPrice(price ?? 0);
        }
      } catch (error) {
        console.error("Error while fetching token price::", error);
      }
    }

    async function fetchQuoteTokenPrice(tokenMint: string) {
      try {
        if (info.poolData?.quote.address !== RGAMETokenAddress) {
          const resp = await axios.get(
            `https://price.jup.ag/v4/price?ids=${tokenMint}&vsToken=USDT`
          );
          if (resp.status == 200) {
            setQuoteTokenPrice(resp.data.data[tokenMint].price);
          }
        } else {
          const price = await getRGamesPriceFromLP(RGAMELpAddress);
          setQuoteTokenPrice(price ?? 0);
        }
      } catch (error) {
        console.error("Error while fetching token price::", error);
      }
    }

    if (info.poolData?.reward.address) {
      fetchRewardTokenPrice(info.poolData?.reward.address);
    }

    if (info.poolData?.quote.address) {
      fetchQuoteTokenPrice(info.poolData?.quote.address);
    }
  }, [info]);

  const pcCotent = (
    <Row
      type="grid-x"
      className={`border-1 border-soild border-[#7aed9c7d] py-5 px-8 mobile:py-4 bg-[#052e1677] mobile:px-5 gap-2 items-stretch grid-cols-[1fr,1fr,1fr,1fr,1fr,auto] mobile:grid-cols-[1fr,1fr,1fr,1fr,auto] rounded-t-3xl mobile:rounded-t-lg ${
        open ? "" : "rounded-b-3xl mobile:rounded-b-lg"
      }`}
    >
      <Row className="font-medium text-color text-sm items-center no-clicable-transform-effect">
        <img
          src={`/tokens/${info.poolData?.quote.address}.png`}
          style={{ width: "32px", height: "32px" }}
        />
        <span style={{ marginLeft: "8px" }}>{info.poolData?.name}</span>
      </Row>

      <TextInfoItem
        name="Pending Reward"
        value={
          info.stakeEntryData &&
          new Intl.NumberFormat().format(info?.stakeEntryData?.pendingReward) +
            " Pepewifhat"
        }
      />

      <TextInfoItem
        name="Locked"
        value={
          info.stakeEntryData &&
          new Intl.NumberFormat().format(info?.stakeEntryData?.stakeBalance)
        }
      />

      <TextInfoItem
        name="APR"
        value={formatNumber(apr, { fractionLength: 3 }) + "%"}
      />

      <TextInfoItem
        name="TVL"
        value={
          info.stakePoolData && quoteTokenPrice
            ? toUsdVolume(quoteTokenPrice * info.stakePoolData?.balance, {
                decimalPlace: 3,
              })
            : "--"
        }
        subValue={
          info.stakePoolData && info.stakePoolData.balance
            ? `${formatNumber(
                toString(info.stakePoolData.balance, { decimalLength: 3 })
              )} ${info.poolData?.name}`
            : "--"
        }
      />

      {/* <Grid className="w-20 h-14 place-items-center self-center">
        <div className="btn " style={{ display: "flex", alignItems: "center" }}>
          <Icon
            size="sm"
            className="justify-self-end text-[#01ff00] mr-1.5"
            heroIconName={`${open ? "chevron-up" : "chevron-down"}`}
          />
          <span className="text-[#01ff00]">View</span>
        </div>
      </Grid> */}
    </Row>
  );

  const mobileContent = (
    <Collapse open={open}>
      <Collapse.Face>
        <Row
          type="grid-x"
          className={`border-1 border-soild border-[#7aa8ed7d] py-4 px-5 items-center gap-2 grid-cols-[1fr,1fr,auto] mobile:rounded-t-lg ${
            open ? "" : "rounded-b-3xl mobile:rounded-b-lg"
          }`}
        >
          <Row className="font-medium text-color text-sm items-center no-clicable-transform-effect">
            <img
              src={`/tokens/${info.poolData?.quote.address}.png`}
              style={{ width: "32px", height: "32px" }}
            />
            <span style={{ marginLeft: "8px" }}>{info.poolData?.name}</span>
          </Row>

          <TextInfoItem
            name="APR"
            value={
              formatNumber(apr, { fractionLength: apr > 1000 ? 0 : 3 }) + "%"
            }
          />

          <Grid className="h-14 place-items-center">
            <div
              className="btn -ml-16"
              style={{ display: "flex", alignItems: "center" }}
            >
              <Icon
                size="sm"
                className="justify-self-end mr-1.5"
                heroIconName={`${open ? "chevron-up" : "chevron-down"}`}
              />
              View
            </div>
          </Grid>
        </Row>
      </Collapse.Face>

      <Collapse.Body>
        <Row
          type="grid-x"
          className="py-4 px-5 relative items-stretch gap-2 grid-cols-[1fr,1fr,1fr,auto]"
        >
          <div className="absolute top-0 left-5 right-5 border-[rgba(171,196,255,.2)] border-t-1.5"></div>

          <TextInfoItem
            name="Locked"
            value={
              info.stakeEntryData &&
              new Intl.NumberFormat().format(info.stakeEntryData?.stakeBalance)
            }
          />

          <TextInfoItem
            name="Pending Reward"
            value={
              info.stakeEntryData &&
              new Intl.NumberFormat().format(info.stakeEntryData?.pendingReward)
            }
          />
          <TextInfoItem
            name="Total Locked"
            value={
              info.stakePoolData &&
              new Intl.NumberFormat().format(info.stakePoolData.balance)
            }
          />
          <div></div>

          <Grid className="w-6 h-6 place-items-center"></Grid>
        </Row>
      </Collapse.Body>
    </Collapse>
  );

  return isMobile ? mobileContent : pcCotent;
}

function StakingCardCollapseItemContent({ info }: { info: IStakeInfo }) {
  const prices = useToken((s) => s.tokenPrices);
  const price = prices["EAvKa9kGRMcQ44Eg3MPbXUP8ZEpfxgd5dToHBRF8m8ui"];
  const isMobile = useAppSettings((s) => s.isMobile);
  const connected = useWallet((s) => s.connected);
  const connecting = useWallet((s) => s.connecting);
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown);
  // const [apiLpPrice, setApiLpPrice] = useState(0);
  const [rewardTokenPrice, setRewardTokenPrice] = useState(0);
  const [quoteTokenPrice, setQuoteTokenPrice] = useState(0);
  // useEffect(() => {
  //   async function fetchLP() {
  //     try {
  //       if (!info.poolData?.poolId) return;
  //       const tempLpPrice = await getLpPrice(info.poolData?.poolId);
  //       if (tempLpPrice) {
  //         setApiLpPrice(tempLpPrice);
  //       }
  //     } catch (error) {
  //       console.log('Error: while fetching LP Price', error)
  //     }
  //   }
  //   fetchLP();
  // })

  useEffect(() => {
    async function fetchTokenPrice(tokenMint: string) {
      try {
        const resp = await axios.get(
          `https://price.jup.ag/v4/price?ids=${tokenMint}&vsToken=USDT`
        );
        if (resp.status == 200) {
          setRewardTokenPrice(resp.data.data[tokenMint].price);
        }
      } catch (error) {
        console.error("Error while fetching token price::", error);
      }
    }
    async function fetchQuoteTokenPrice(tokenMint: string) {
      try {
        const resp = await axios.get(
          `https://price.jup.ag/v4/price?ids=${tokenMint}&vsToken=USDT`
        );
        if (resp.status == 200) {
          setQuoteTokenPrice(resp.data.data[tokenMint].price);
        }
      } catch (error) {
        console.error("Error while fetching token price::", error);
      }
    }
    if (info.poolData?.reward.address) {
      fetchTokenPrice(info.poolData?.reward.address);
    }
    if (info.poolData?.quote.address) {
      fetchQuoteTokenPrice(info.poolData?.quote.address);
    }
  }, [info]);

  let rewardTokenAddress, stakePoolAddress;
  let rewardTokenDecimal, amount;
  if (info && info.poolData) {
    amount = info.stakeEntryData?.rewards;
    rewardTokenAddress = info.poolData.reward.address;
    stakePoolAddress = info.poolData.poolAddress;
    rewardTokenDecimal = info.poolData.reward.decimals;
  }

  return (
    <AutoBox
      is={isMobile ? "Col" : "Row"}
      className={`gap-8 mobile:gap-3 flex-grow px-8 py-5 mobile:px-4 mobile:py-3 bg-gradient-to-br bg-[#052e1677] rounded-b-3xl mobile:rounded-b-lg`}
    >
      <Row className="p-6 mobile:py-3 mobile:px-4 flex-grow ring-inset ring-1.5 mobile:ring-1 bg-[#052e1677] ring-[rgba(171,255,182,0.5)] rounded-3xl mobile:rounded-xl items-center gap-3">
        <div className="flex-grow">
          <div className="text-gray-300 font-medium text-sm mobile:text-2xs mb-1">
            Deposited
          </div>
          <div className="text-color font-medium text-base mobile:text-xs">
            {quoteTokenPrice && info.stakeEntryData?.stakeBalance
              ? toUsdVolume(
                  quoteTokenPrice * info.stakeEntryData?.stakeBalance,
                  { decimalPlace: 3 }
                )
              : "--"}
          </div>
          <div className="text-gray-300 font-medium text-sm mobile:text-xs">
            {info.stakeEntryData?.stakeBalance} {info.poolData?.name}
          </div>
        </div>
        <Row className="gap-3">
          {!(info.stakeEntryData && info.stakeEntryData.stakeBalance > 0) ? (
            <Button
              className="connect-btn mobile:py-2 mobile:text-xs"
              onClick={() => {
                if (connected) {
                  useStaking.setState({
                    isStakeDialogOpen: true,
                    stakeDialogMode: "deposit",
                  });
                  useStaking.setState({ stakeDialogInfo: info });
                } else {
                  useAppSettings.setState({
                    isWalletSelectorShown: !connecting,
                  });
                }
              }}
            >
              <span className="">
                {connected
                  ? "Earn"
                  : connecting
                  ? "Connecting..."
                  : "Connect Wallet"}
              </span>
            </Button>
          ) : (
            <>
              {/* <Button
                className="frosted-glass-teal mobile:px-6 mobile:py-2 mobile:text-xs"
                onClick={() => {
                  if (connected) {
                    useStaking.setState({
                      isStakeDialogOpen: true,
                      stakeDialogMode: 'deposit'
                    })
                    useStaking.setState({ stakeDialogInfo: info })
                  } else {
                    useAppSettings.setState({ isWalletSelectorShown: true })
                  }
                }}
              >
                Stake
              </Button> */}
              <Icon
                size={isMobile ? "sm" : "smi"}
                heroIconName="plus"
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,255,182,0.5)] rounded-xl mobile:rounded-lg text-color-secondary clickable clickable-filter-effect"
                onClick={() => {
                  if (connected) {
                    useStaking.setState({
                      isStakeDialogOpen: true,
                      stakeDialogMode: "deposit",
                    });
                    useStaking.setState({ stakeDialogInfo: info });
                  } else {
                    useAppSettings.setState({ isWalletSelectorShown: true });
                  }
                }}
              />
              <Icon
                size={isMobile ? "sm" : "smi"}
                heroIconName="minus"
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(178,255,171,0.5)] rounded-xl mobile:rounded-lg text-color-secondary clickable clickable-filter-effect"
                onClick={() => {
                  if (connected) {
                    useStaking.setState({
                      isStakeDialogOpen: true,
                      stakeDialogMode: "withdraw",
                    });
                    useStaking.setState({ stakeDialogInfo: info });
                  } else {
                    useAppSettings.setState({ isWalletSelectorShown: true });
                  }
                }}
              />
            </>
          )}
        </Row>
      </Row>

      <AutoBox
        is={isMobile ? "Col" : "Row"}
        className={twMerge(
          "p-6 mobile:py-3 mobile:px-4 bg-[#052e1677] flex-grow ring-inset ring-1.5 mobile:ring-1 ring-[rgba(174,255,171,0.5)] rounded-3xl mobile:rounded-xl items-center gap-3"
        )}
      >
        <Row className="flex-grow divide-x-1.5 w-full">
          <div className={`px-4 pl-0 'pr-0' border-[rgba(181,255,171,0.5)]`}>
            <div className="text-gray-300 font-medium text-sm mobile:text-2xs mb-1">
              Pending rewards
            </div>
            <div className="text-gray-300 font-medium text-sm mobile:text-2xs mb-1">
              (10% Claim Fee)
            </div>
            <div className="text-color font-medium text-base mobile:text-xs">
              {rewardTokenPrice && info.stakeEntryData?.pendingReward
                ? Number(
                    rewardTokenPrice * info.stakeEntryData?.pendingReward
                  ) > 0
                  ? `$${Number(
                      rewardTokenPrice * info.stakeEntryData?.pendingReward
                    ).toFixed(3)}`
                  : "0"
                : "--"}
            </div>
            {/* <div className="text-color font-medium text-base mobile:text-xs">
              {new Intl.NumberFormat().format(info.stakeEntryData?.pendingReward ?? 0)} {`Pepewifhat`}
            </div> */}
            <div className="text-gray-300 font-medium text-sm mobile:text-2xs">
              {Number(info.stakeEntryData?.pendingReward) > 0
                ? new Intl.NumberFormat().format(
                    info.stakeEntryData?.pendingReward ?? 0
                  )
                : "0"}{" "}
              {`Pepewifhat`}
            </div>
          </div>
        </Row>
        <span className="text-[#01ff00]">
          <Button
            disabled={
              !(
                info.stakeEntryData?.pendingReward &&
                info.stakeEntryData?.pendingReward > 0
              )
            }
            className="rounded-xl mobile:w-full mobile:py-2 mobile:text-xs whitespace-nowrap connect-btn"
            isLoading={isApprovePanelShown}
            onClick={() => {
              txHarvest(
                new web3.PublicKey(stakePoolAddress),
                parseFloat(info.rewardTokenBalance.toString()),
                new web3.PublicKey(rewardTokenAddress),
                rewardTokenDecimal
              );
            }}
            validators={[
              {
                should: connected,
                forceActive: true,
                fallbackProps: {
                  onClick: () =>
                    useAppSettings.setState({ isWalletSelectorShown: true }),
                  children: connecting ? "Connecting..." : "Connect Wallet",
                },
              },
              {
                should:
                  info.stakeEntryData?.pendingReward &&
                  info.stakeEntryData?.pendingReward > 0,
              },
            ]}
          >
            Harvest
          </Button>
        </span>
      </AutoBox>
    </AutoBox>
  );
}

function TextInfoItem({
  name,
  value,
  subValue,
  className,
}: {
  name: string;
  value?: ReactNode;
  subValue?: ReactNode;
  className?: string;
}) {
  return (
    <Col className={twMerge("w-max", className)}>
      <div className="mb-1 text-gray-300 font-medium text-sm mobile:text-2xs">
        {name}
      </div>
      <Col className="flex-grow justify-center">
        <div className="text-base mobile:text-xs">{value || "--"}</div>
        {subValue && (
          <div className="text-sm mobile:text-2xs text-gray-300">
            {subValue}
          </div>
        )}
      </Col>
    </Col>
  );
}
