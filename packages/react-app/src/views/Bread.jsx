import React, { useState } from "react";
import { Card, Space, Row, Col, notification, Statistic, Select, Typography, Button, Divider, Steps, Skeleton, Table, Radio } from "antd";
import { formatUnits } from "@ethersproject/units";
import { ethers } from "ethers";
import { abi as IErc20 } from '../components/Lend/abis/erc20.json'
import { Address } from "../components";
import { abi as IStableDebtToken } from '../components/Lend/abis/StableDebtToken.json'
import { useContractLoader, useEventListener } from "../hooks";
import { usePoller } from "eth-hooks";
import { useAaveData } from "../components/Lend/AaveData";
import AccountSummary from "../components/Lend/AccountSummary";
import AccountSettings from "../components/Lend/AccountSettings";

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

function Bread({ selectedProvider }) {

  // use our custom Aave data hook to get protocol information
  const { reserveTokens, assetData, userAccountData, userConfiguration,  userAssetList, userAssetData } = useAaveData({ selectedProvider })

  const [borrowAsset, setBorrowAsset] = useState('DAI')
  const [debtType, setDebtType] = useState('v')

  let debtLookup = {
    's': "1",
    'v': "2"
  }

  const [creditDelegated, setCreditDelegated] = useState()
  const [aTokenAllowance, setATokenAllowance] = useState()

  const [delegating, setDelegating] = useState(false)
  const [allowing, setAllowing] = useState(false)
  const [runningBread, setRunningBread] = useState(false)

  const writeContracts = useContractLoader(selectedProvider)
  const [apeEvents, setApeEvents] = useState([]);

  const findAsset = (_asset) => {
    return assetData.find(obj => { return obj.underlyingAsset.toLowerCase() === _asset.toLowerCase()})
  }

  const eventRowKey = (value) => {
    return (value.bread + value.action + value.blockNumber + value.apeAmount + value.borrowAsset + value.borrowAmount)
  }

  const eventColumns = [
  {
    title: 'Bread',
    key: 'bread',
    render: value => value&&<Address value={value.args.bread}  fontSize={16}/>,
  },
  {
    title: 'Block',
    dataIndex: 'blockNumber',
  },
  {
    title: 'Action',
    key: 'action',
    render: value => value.args.action
  },
  {
    title: 'Borrow',
    key: 'borrowAsset',
    render: value => `${parseFloat(formatUnits(value.args.borrowAmount, findAsset(value.args.borrowAsset).decimals)).toFixed(3)} ${findAsset(value.args.borrowAsset).symbol}`,
  },
  {
    title: 'Price',
    key: 'price',
    render: value =>  (parseFloat(formatUnits(value.args.borrowAmount, findAsset(value.args.borrowAsset).decimals)) / parseFloat(formatUnits(value.args.apeAmount, findAsset(value.args.apeAsset).decimals))).toFixed(4),
  },
];

  let signer = selectedProvider.getSigner()


  let borrowAssetData = assetData.find(obj => {
    return obj.symbol === borrowAsset
  })

  const getCreditAllowance = async () => {
    if(reserveTokens&&borrowAssetData&&writeContracts&&writeContracts['BreadProtocol']) {
    //let borrowTokensAddresses = await dataProviderContract.getReserveTokensAddresses(borrowAssetData[`${debtType}Token`].id);
    let debtContract = new ethers.Contract(borrowAssetData[`${debtType}Token`].id, IStableDebtToken, signer);

    let address = await signer.getAddress()
    let breadProtocolAddress = writeContracts['BreadProtocol'].address

    let _creditAllowance = await debtContract.borrowAllowance(address, breadProtocolAddress)
    setCreditDelegated(_creditAllowance)

  }
  }

  usePoller(getCreditAllowance, 6000)

  const setFullCreditAllowance = async () => {
    if(reserveTokens&&assetData&&borrowAssetData&&writeContracts&&writeContracts['BreadProtocol']) {
    try {
      setDelegating(true)
      //let borrowTokensAddresses = await dataProviderContract.getReserveTokensAddresses(borrowAssetData.tokenAddress);
      let debtContract = new ethers.Contract(borrowAssetData[`${debtType}Token`].id, IStableDebtToken, signer);

      let breadProtocolAddress = writeContracts['BreadProtocol'].address

      let _approveDelegation = await debtContract.approveDelegation(breadProtocolAddress, ethers.constants.MaxUint256)
      console.log(_approveDelegation)
      notification.open({
        message: `You delegated credit! 🦍`,
        description:
        <><Text>{`The ape can now borrow ${borrowAssetData.symbol} on your behalf`}</Text></>,
      });
      setDelegating(false)
    }
    catch(e) {
      console.log(e)
      setDelegating(false)
    }
  }
  }

  let hasDelegatedCredit = creditDelegated&&creditDelegated.gt(ethers.constants.MaxUint256.div(ethers.BigNumber.from("10"))) ? true : false

  return (
    <>
    <Row justify="center" align="middle" gutter={16}>
    <Card title={<Space>
                    <Text>{`🍞 Bread Protocol`}</Text>{
                    (writeContracts&&writeContracts['BreadProtocol']) ?
                    <Address
                        value={writeContracts['BreadProtocol'].address}
                        fontSize={16}
                    /> :
                    <Text type="warning">Has the bread been baked?</Text>}
                  </Space>}
          style={{ width: 600, textAlign: 'left'  }}
    extra={
      <AccountSettings userAccountData={userAccountData} userConfiguration={userConfiguration} userAssetList={userAssetList} />}
    >
    {(writeContracts&&writeContracts['BreadProtocol']) ?
      <>
      {userAccountData?<AccountSummary userAccountData={userAccountData}/>:<Skeleton active/>}
      <Divider/>
      {userAccountData&&formatUnits(userAccountData.availableBorrowsETH,18)==="0.0"?<Text>You need a borrow allowance bake the bread, have you deposited any bread? 🍞</Text> :
      <>
        <Title level={4}>Select your borrow asset</Title>
        <Row justify="center" align="middle" gutter={16}>
        <Col>
          <Select showSearch value={borrowAsset} style={{width: '120px'}} size={'large'} onChange={(value) => {
            console.log(value)
            setBorrowAsset(value)
          }} filterOption={(input, option) =>
          option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          } optionFilterProp="children">
          {assetData&&assetData.filter(function(asset) {return asset.borrowingEnabled;}).map(token => (
            <Option key={token.symbol} value={token.symbol}>{token.symbol}</Option>
          ))}
          </Select>
        </Col>
        <Col>
        {(assetData&&userAssetData&&userAssetData[borrowAsset]&&borrowAssetData)&&<Statistic title={`Variable debt`} value={(userAssetData&&userAssetData[borrowAsset]['currentVariableDebt'])?parseFloat(formatUnits(userAssetData[borrowAsset]['currentVariableDebt'], borrowAssetData.decimals)).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 5}):"0"} suffix={borrowAssetData.symbol}/>}
        {(assetData&&userAssetData&&userAssetData[borrowAsset]&&borrowAssetData)&&<Statistic title={`Stable debt`} value={(userAssetData&&userAssetData[borrowAsset]['currentStableDebt'])?parseFloat(formatUnits(userAssetData[borrowAsset]['currentStableDebt'], borrowAssetData.decimals)).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 5}):"0"} suffix={borrowAssetData.symbol}/>}
        </Col>
        </Row>
        {(borrowAssetData)&&<><Divider/><Statistic title={`Current ${borrowAsset} price`} value={ethers.utils.formatUnits(borrowAssetData['price']['priceInEth'], 18).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 5})} suffix={borrowAsset}/><Divider/></>}
        <Title level={4}>How to go bake bread 🍞</Title>
        <Steps>
          <Step status={hasDelegatedCredit?'finish':'wait'} title="Delegate credit" description={creditDelegated&&(hasDelegatedCredit?<p>You have delegated credit to the Bread Protocol </p>:<Button loading={delegating} onClick={setFullCreditAllowance}>{"Delegate!"}</Button>)} />
          <Step status={hasDelegatedCredit?'finish':'wait'} title="Bake Bread 🍞"
            description={creditDelegated&&(hasDelegatedCredit&&<>
              <Paragraph>{`Borrow ${borrowAsset} and deposit to Aave`}</Paragraph>
              <Button loading={runningBread} type="primary" onClick={async () => {
              try {
              setRunningBread(true)
              console.log(borrowAssetData.underlyingAsset, debtLookup[debtType])
              let _bread_borrow = await writeContracts.BreadProtocol['breadBorrow'](borrowAssetData.underlyingAsset, debtLookup[debtType])
              console.log(_bread_borrow)
              notification.open({
                message: `Bread has been baked!`,
                description:
                <><Text>{`Congrats, you have opened a loan in AAVE and designated your Superfluid money stream to pay it back.`}</Text></>,
              });
              setRunningBread(false)
            } catch(e) {
              notification.open({
                message: `Error baking 🍞`,
                description:
                <><Text>{`${e.message}`}</Text></>,
              });
              console.log(e)
              setRunningBread(false)
            }
          }}>{"Bake Bread!"}</Button></>)} />
        </Steps>
        <Divider/>
        </>}
        </>:<Skeleton avatar paragraph={{ rows: 4 }} />}
    </Card>
    </Row>
    </>
  );
}

export default Bread;