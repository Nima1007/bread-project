//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import {
    SuperBread, ISuperToken, IConstantFlowAgreementV1, ISuperfluid
} from "./SuperBread.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/* Hello and welcome to your first Super App!
* In order to deploy this contract, you'll need a few things
* Get the deployed SF addresses here: https://docs.superfluid.finance/superfluid/resources/networks
* or using the js-sdk as shown here https://docs.superfluid.finance/superfluid/protocol-tutorials/setup-local-environment
*/


contract TradeableCashflow is ERC721, SuperBread {

  constructor (
    address owner,
    string memory _name,
    string memory _symbol,
    ISuperfluid host,
    IConstantFlowAgreementV1 cfa,
    ISuperToken acceptedToken
  )
    ERC721 ( _name, _symbol )
    SuperBread (
      host,
      cfa,
      acceptedToken,
      owner
     )
      {

      _mint(owner, 1);
  }

  //now I will insert a nice little hook in the _transfer, including the RedirectAll function I need
  function _beforeTokenTransfer(
    address /*from*/,
    address to,
    uint256 /*tokenId*/
  ) internal override {
      _changeReceiver(to);
  }
}