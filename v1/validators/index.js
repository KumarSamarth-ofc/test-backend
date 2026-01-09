// Export all validators
const otpValidators = require("./otpValidators");
const passwordValidators = require("./passwordValidators");
const profileValidators = require("./profileValidators");
const campaignValidators = require("./campaignValidators");
const applicationValidators = require("./applicationValidators");
const paymentValidators = require("./paymentValidators");
const mouValidators = require("./mouValidators");

module.exports = {
  ...otpValidators,
  ...passwordValidators,
  ...profileValidators,
  ...campaignValidators,
  ...applicationValidators,
  ...paymentValidators,
  ...mouValidators,
};
