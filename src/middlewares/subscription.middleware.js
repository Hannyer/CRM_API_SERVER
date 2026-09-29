const { requireEntitlement } = require('@puracodecr-max/subscription-client-sdk');
const { getSubscriptionClient, getSubscriptionContext } = require('../config/subscription.config');

function requireCrmEntitlement(requestedModule) {
  return requireEntitlement(
    {
      validateEntitlement(input) {
        return getSubscriptionClient().validateEntitlement(input);
      },
    },
    {
      resolveContext: () => getSubscriptionContext(requestedModule),
      failureMode: 'closed',
    }
  );
}

module.exports = {
  requireCrmEntitlement,
};
