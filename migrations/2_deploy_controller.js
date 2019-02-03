const LegalNodesEscrow = artifacts.require("LegalNodesEscrow");
const SafeMath = artifacts.require("SafeMath");

//const EcroTokenCrowdsale = artifacts.require("./TokenCrowdsaleInterface.sol");

module.exports = function(deployer, network, accounts) {

    return deployer.deploy(SafeMath).then(function()
        {
            return deployer.deploy(LegalNodesEscrow).then(function()
            {
                    deployer.link(SafeMath, LegalNodesEscrow)
                    return LegalNodesEscrow.deployed().then(function(inst)
                        {
                            inst.setWithdrawalTax(15);
                            inst.setKycPrice(35);
                        });
            });            
        });

};

