const IgfController = artifacts.require("IgfController");

var emptyAddress = '0x0000000000000000000000000000000000000000';

contract('IgfController', async (accounts) => {
    var controller;
var owner = accounts[0];
var investor1 = accounts[1];
var investor2 = accounts[2];
var genesisBlock=0x0000000000000000000000000000000000000000;
var purchaseAmount = 1000;

var delegateTokensAmount1 = 100;
var delegateTokensAmount2 = 50;


IgfController.deployed().then(function(inst) {
    controller = inst;
});


//console.log(('General Tests');

it("Token should be assigned to Controller", function() {
    return controller.getToken().then(function(address) {
        assert.notEqual(address, emptyAddress, "Token address is not empty");
    });
});

it("TokenCrowdsale should be assigned to Controller", function() {
    return controller.getTokenCrowdsale().then(function(address) {
        assert.notEqual(address, emptyAddress, "TokenCrowdsale address is not empty");
    });
});

it("InvestorRepository should be assigned to Controller", function() {
    return controller.getInvestorRepository().then(function(address) {
        assert.notEqual(address, emptyAddress, "InvestorRepository address is not empty");
    });
});

it("Cashier should be assigned to Controller", function() {
    return controller.getCashier().then(function(address) {
        assert.notEqual(address, emptyAddress, "Cashier address is not empty");
    });
});


it("Controller has an owner", function() {
    return controller.owner().then(function(address) {
        assert.notEqual(address, emptyAddress, "Owner address is not empty");
        assert.equal(address, owner, "Owner is defaultAccount");
    });
});

it("should return IGF token symbol", function() {
    return controller.getTokenSymbol().then(function(symbol) {
        assert.equal(web3.toAscii(symbol.valueOf()), 'IGF', "Token name is not Igf");
    });
});

it("should return IGF token rate", function() {
    return controller.getTokenRate().then(function(rate) {
        assert.notEqual(rate.toNumber(), 0, "Could not get token rate");
    });
});


//console.log(('Purchase Test: ');
it("Buy tokens", async () => {
    let tokenBalance = await controller.getInvestorBalance(investor1);
let tokenSupply = await controller.getTokenTotalSupply();

await controller.buyTokens({
    from: investor1,
    value: purchaseAmount
});
let rate = await controller.getTokenRate();
let newTokenBalance = await controller.getInvestorBalance(investor1);
await assert.equal(newTokenBalance.toNumber(), tokenBalance.toNumber() + purchaseAmount * rate, "Investor Token Balance isn't equal to Purchase Amount");

let newTokenSupply = await controller.getTokenTotalSupply();
await assert.equal(newTokenSupply.toNumber(), tokenSupply.toNumber() + purchaseAmount * rate, "Token Total Supply was incremented wrong");
});


it('Should not allow overlimit purchase', async () => {
    let tokenBalance = await controller.getInvestorBalance(investor1);
let tokenCap = await controller.getTokenCap();
let overlimitPurchaseAmount = await tokenCap.toNumber() + 100;
await console.log(overlimitPurchaseAmount);
await controller.buyTokens({
    from: investor1,
    value: overlimitPurchaseAmount
});
let newTokenBalance = await controller.getInvestorBalance(investor1);
await assert.equal(newTokenBalance.toNumber(), tokenBalance.toNumber(), "Investor Token Balance changed after overlimit purchase"+newTokenBalance.toNumber()+' | '+tokenBalance.toNumber());
});


it('Should not allow overbalance purchase', async () => {
    let clientWei = await web3.eth.getBalance(investor1);
let tokenBalance = await controller.getInvestorBalance(investor1);
var overbalancePurchaseAmount = clientWei.toNumber() + 100;
try {
    await controller.buyTokens({
        from: investor1,
        value: overbalancePurchaseAmount
    });
    await throwError('Overbalance purchase did not throw error');
} catch (e) {
    let newTokenBalance = await controller.getInvestorBalance(investor1);
    await assert.equal(newTokenBalance.toNumber(), tokenBalance.toNumber(), "Investor Token Balance changed after overbalance purchase");
}

});

it('Should not allow less-than-minimum purchase', async () => {
    let minimumPurchase = await controller.getMinimumPurchase();
let tokenBalance = await controller.getInvestorBalance(investor1);
var underMinimumPurchaseAmount = minimumPurchase.toNumber() - 10;
await controller.buyTokens({
    from: investor1,
    value: underMinimumPurchaseAmount
});
let newTokenBalance = await controller.getInvestorBalance(investor1);
await assert.equal(newTokenBalance.toNumber(), tokenBalance.toNumber(), "Investor Token Balance changed after under-minimum purchase");
});



//console.log(('Allowance Test: ');
it("Increase allowance of " + investor1 + " to " + investor2 + " by " + delegateTokensAmount2 + " tokens", async () => {
    let increaseAllowance = delegateTokensAmount2;
    let oldAllowance = await controller.getAllowedTransfer(investor1, investor2);
    let oldTotalAllowed = await controller.getTotalAllowed(investor1);

    await controller.increaseAllowance(investor2, increaseAllowance, {
        from: investor1
    });
    let newAllowance = await controller.getAllowedTransfer(investor1, investor2);
    assert.equal(newAllowance.toNumber(), oldAllowance.toNumber() + increaseAllowance, "Allowance is not properly increased.");

    let newTotalAllowed = await controller.getTotalAllowed(investor1);

    assert.equal(newTotalAllowed.toNumber(), oldTotalAllowed.toNumber()+increaseAllowance, "Total allowance wasnt changed accordingly.");

});

it("Decrease allowance of " + investor1 + " to " + investor2 + " by " + delegateTokensAmount2 + " tokens", async () => {
    let decreaseAllowance = delegateTokensAmount2 - 10;

    let oldTotalAllowed = await controller.getTotalAllowed(investor1);

    let oldAllowance = await controller.getAllowedTransfer(investor1, investor2);
    await controller.decreaseAllowance(investor2, decreaseAllowance, {
        from: investor1
    });

    let newAllowance = await controller.getAllowedTransfer(investor1, investor2);

    let newTotalAllowed = await controller.getTotalAllowed(investor1);

    assert.equal(newAllowance.toNumber(), oldAllowance.toNumber() - decreaseAllowance, "Allowance is not properly decreased.");

    assert.equal(newTotalAllowed.toNumber(), oldTotalAllowed.toNumber()-decreaseAllowance, "Total allowance wasnt changed accordingly.");
});

//console.log(('Transfer Test: ');
var allowedTransfer = 200;

it("Allow transfer of " + allowedTransfer + " tokens", async () => {
    let oldAllowance = await controller.getAllowedTransfer(investor1, investor2);

    let oldTotalAllowed = await controller.getTotalAllowed(investor1);

    await controller.allowTransfer(investor2, allowedTransfer, {
        from: investor1
    });

    let newAllowance = await controller.getAllowedTransfer(investor1, investor2);

    let newTotalAllowed = await controller.getTotalAllowed(investor1);

    let allowance = await controller.getAllowedTransfer(investor1, investor2);

    await assert.equal(newAllowance.toNumber(), allowedTransfer, "Allowance is not equal to amount of tokens delegated");

    assert.equal(newTotalAllowed.toNumber(), allowedTransfer, "Total allowance wasnt changed accordingly.");
});

it("Should not allow to spend more tokens than owned", async () => {
    let investorTokenBalance = await controller.getInvestorBalance(investor1);

    let oldAllowance = await controller.getAllowedTransfer(investor1, investor2);

    let tryToAllow = investorTokenBalance.toNumber()+100;

    let oldTotalAllowed = await controller.getTotalAllowed(investor1);

    await controller.allowTransfer(investor2, tryToAllow, {
        from: investor1
    });

    let newAllowance = await controller.getAllowedTransfer(investor1, investor2);

    let newTotalAllowed = await controller.getTotalAllowed(investor1);

    assert.equal(newAllowance.toNumber(), oldAllowance.toNumber(), "Allowed to spend more tokens than is owned.");

    assert.equal(newTotalAllowed.toNumber(), oldTotalAllowed.toNumber(), "Total allowance was changed anyway.");
});

it("Should not be able to allow to themselves", async () => {

    let oldTotalAllowed = await controller.getTotalAllowed(investor1);

    await controller.allowTransfer(investor1, allowedTransfer, {
        from: investor1
    });

    let newTotalAllowed = await controller.getTotalAllowed(investor1);

    let allowance = await controller.getAllowedTransfer(investor1, investor1);

    await assert.equal(allowance.toNumber(), 0, "Allowance to themselves should remain be zero");

    assert.equal(newTotalAllowed.toNumber(), oldTotalAllowed.toNumber(), "Total allowance was changed anyway.");
});

it("Should not be able to allow to genesis block", async () => {

    let oldTotalAllowed = await controller.getTotalAllowed(investor1);

    await controller.allowTransfer(genesisBlock, allowedTransfer, {
    from: investor1
});

    let newTotalAllowed = await controller.getTotalAllowed(investor1);

    let allowance = await controller.getAllowedTransfer(investor1, genesisBlock);

    await assert.equal(allowance.toNumber(), 0, "Allowance to genesis block should remain zero");

    assert.equal(newTotalAllowed.toNumber(), oldTotalAllowed.toNumber(), "Total allowance was changed anyway.");
});



var transferTokens = 100;
var oldAllowance;
var newAllowance;
var investor1OldBalance, investor1NewBalance;
var investor2OldBalance, investor2NewBalance;

it("Transfer " + transferTokens + " tokens by " + investor2 + " from " + investor1, async () => {
    let oldAllowance = await controller.getAllowedTransfer(investor1, investor2);

let investor1OldBalance = await controller.getInvestorBalance(investor1);

let investor2OldBalance = await controller.getInvestorBalance(investor2);

await controller.transferFrom(investor1, investor2, transferTokens, {
    from: investor2
});

let newAllowance = await controller.getAllowedTransfer(investor1, investor2);

let investor1NewBalance = await controller.getInvestorBalance(investor1);

let investor2NewBalance = await controller.getInvestorBalance(investor2);
await assert.equal(investor1NewBalance.toNumber(), investor1OldBalance.toNumber() - transferTokens, 'Investor1 balance did not properly decrease');
await assert.equal(investor2NewBalance.toNumber(), investor2OldBalance.toNumber() + transferTokens, 'Investor2 balance did not properly increase');
await assert.equal(newAllowance.toNumber(), oldAllowance.toNumber() - transferTokens, 'Allowance did not properly decrease');
});

it("Should not be able to transfer more tokens than owned by allower", async () => {
    let oldAllowance = await controller.getAllowedTransfer(investor1, investor2);
let investor1OldBalance = await controller.getInvestorBalance(investor1);
let investor2OldBalance = await controller.getInvestorBalance(investor2);
var tooMuchTransfer = investor1OldBalance+1;

await controller.transferFrom(investor1, investor2, tooMuchTransfer, {
    from: investor2
});

let newAllowance = await controller.getAllowedTransfer(investor1, investor2);
let investor1NewBalance = await controller.getInvestorBalance(investor1);
let investor2NewBalance = await controller.getInvestorBalance(investor2);
await assert.equal(investor1NewBalance.toNumber(), investor1OldBalance.toNumber(), 'Investor1 balance decreased');
await assert.equal(investor2NewBalance.toNumber(), investor2OldBalance.toNumber(), 'Investor2 balance increased');
await assert.equal(newAllowance.toNumber(), oldAllowance.toNumber(), 'Allowance changed');
});


it("Should not be able to transfer more tokens than allowed", async () => {
    let oldAllowance = await controller.getAllowedTransfer(investor1, investor2);
let investor1OldBalance = await controller.getInvestorBalance(investor1);
let investor2OldBalance = await controller.getInvestorBalance(investor2);
var tooMuchTransfer = oldAllowance+1;

await controller.transferFrom(investor1, investor2, tooMuchTransfer, {
    from: investor2
});

let newAllowance = await controller.getAllowedTransfer(investor1, investor2);
let investor1NewBalance = await controller.getInvestorBalance(investor1);
let investor2NewBalance = await controller.getInvestorBalance(investor2);
await assert.equal(investor1NewBalance.toNumber(), investor1OldBalance.toNumber(), 'Investor1 balance decreased');
await assert.equal(investor2NewBalance.toNumber(), investor2OldBalance.toNumber(), 'Investor2 balance increased');
await assert.equal(newAllowance.toNumber(), oldAllowance.toNumber(), 'Allowance changed');
});

it("Should not be able to transfer tokens to themselves", async () => {
let oldAllowance = await controller.getAllowedTransfer(investor1, investor1);
let investor1OldBalance = await controller.getInvestorBalance(investor1);
var transferAmount = 50;

await controller.transferFrom(investor1, investor1, transferAmount, {
    from: investor1
});

let newAllowance = await controller.getAllowedTransfer(investor1, investor1);
let investor1NewBalance = await controller.getInvestorBalance(investor1);
await assert.equal(investor1NewBalance.toNumber(), investor1OldBalance.toNumber(), 'Investor1 balance changed');
await assert.equal(newAllowance.toNumber(), oldAllowance.toNumber(), 'Allowance changed');
});

it("Should not be able to transfer tokens to genesis block", async () => {
let oldAllowance = await controller.getAllowedTransfer(investor1, genesisBlock);
let investor1OldBalance = await controller.getInvestorBalance(investor1);
var transferAmount = 50;

await controller.transferFrom(investor1, genesisBlock, transferAmount, {
    from: investor1
});

let newAllowance = await controller.getAllowedTransfer(investor1, genesisBlock);
let investor1NewBalance = await controller.getInvestorBalance(investor1);
let genesisBalance = await controller.getInvestorBalance(genesisBlock);

await assert.equal(genesisBalance.toNumber(), 0, 'Genesis block balance changed');

await assert.equal(investor1NewBalance.toNumber(), investor1OldBalance.toNumber(), 'Investor1 balance changed');

await assert.equal(newAllowance.toNumber(), oldAllowance.toNumber(), 'Allowance changed');
});

//console.log(('Dividends Flow Test: ');
it('Should be able to deposit ether on Cashier', async () => {
    var weiToDeposit = 10000000000000000;
let cashierBalance = await controller.getCashierBalance();
await controller.depositDividends({
    value: weiToDeposit,
    gasLimit: 21000,
    from: owner,
    gas: 3000000
});
let newCashierBalance = await controller.getCashierBalance();
await assert.equal(newCashierBalance.toNumber(), cashierBalance.toNumber() + weiToDeposit, 'Cashier`s balance is smaller than should be')
});

it('Should pay dividends to chosen investor', async () => {
    let dividends = 10000000000000000;
let investorBalance = await web3.eth.getBalance(investor2);
let cashierBalance = await controller.getCashierBalance();

await controller.payDividends(investor2, dividends);
let newInvestorBalance = await web3.eth.getBalance(investor2);
//await
//console.log(("Investor balance: was "+investorBalance.toNumber()+", received "+dividends+" dividends, became "+newInvestorBalance.toNumber());
await assert.equal(investorBalance.toNumber() + dividends, newInvestorBalance.toNumber(), 'Investor received wrong amount of dividends');

let newCashierBalance = await controller.getCashierBalance();
await assert.equal(newCashierBalance.toNumber(), cashierBalance.toNumber() - dividends, 'Cashier`s balance is smaller than should be')
//await 
//console.log(("Cashier balance: was "+cashierBalance.toNumber()+", substracted "+dividends+" dividends, became "+newCashierBalance.toNumber());
});
});