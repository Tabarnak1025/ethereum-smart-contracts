const BigNumber = web3.BigNumber

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

import moment from 'moment'

import latestTime from './helpers/latestTime'
import increaseTime from './helpers/increaseTime'

const MintableToken = artifacts.require('MintableToken')
const TokenTimelock = artifacts.require('TokenTimelock')

contract('TokenTimelock', function ([_, owner, beneficiary]) {

  const amount = new BigNumber(100)

  beforeEach(async function () {
    this.token = await MintableToken.new({from: owner})
    this.releaseTime = latestTime().add(1, 'year').unix()
    this.timelock = await TokenTimelock.new(this.token.address, beneficiary, this.releaseTime)
    await this.token.mint(this.timelock.address, amount, {from: owner})
  })

  it('cannot be claimed before time limit', async function () {
    await this.timelock.claim({from: beneficiary}).should.be.rejected
  })

  it('cannot be claimed just before time limit', async function () {
    await increaseTime(moment.duration(0.99, 'year'))
    await this.timelock.claim({from: beneficiary}).should.be.rejected
  })

  it('can be claimed just after limit', async function () {
    await increaseTime(moment.duration(1.01, 'year'))
    await this.timelock.claim({from: beneficiary}).should.be.fulfilled
    const balance = await this.token.balanceOf(beneficiary)
    balance.should.be.bignumber.equal(amount)
  })

  it('can be claimed after time limit', async function () {
    await increaseTime(moment.duration(2, 'year'))
    await this.timelock.claim({from: beneficiary}).should.be.fulfilled
    const balance = await this.token.balanceOf(beneficiary)
    balance.should.be.bignumber.equal(amount)
  })

  it('cannot be claimed twice', async function () {
    await increaseTime(moment.duration(2, 'year'))
    await this.timelock.claim({from: beneficiary}).should.be.fulfilled
    await this.timelock.claim({from: beneficiary}).should.be.rejected
    const balance = await this.token.balanceOf(beneficiary)
    balance.should.be.bignumber.equal(amount)
  })

})
