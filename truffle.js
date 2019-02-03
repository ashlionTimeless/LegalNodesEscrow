const Web3 = require('web3');
module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // for more about customizing your Truffle configuration!
    networks: {
        development: {
//           provider: new Web3.providers.HttpProvider('http://127.0.0.1:7545'),
            host: "127.0.0.1",
            port: 5545,
            network_id: "*"
        },

        geth: {
            host: "127.0.0.1",
            port: 5545,
            network_id: "1994",
            gas:3000000,
            gasPrice:1000,
            from: "0x3a13f64e5ee8ee65249be648406ddecc8f238d61"
        },
    },
    // mocha:{
    //     reporter: 'eth-gas-reporter',
    //     reporterOptions : {
    //     currency: 'CHF',
    //     gasPrice: 21
    // }
//    }
};