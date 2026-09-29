const { SubscriptionClient } = require('@puracodecr-max/subscription-client-sdk');

let client;

function numberFromEnv(name, fallback) {
  const rawValue = process.env[name];
  if (rawValue == null || rawValue === '') return fallback;

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a positive number or zero`);
  }

  return value;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required for subscription validation`);
  }
  return value.trim();
}

function getSubscriptionClient() {
  if (!client) {
    client = new SubscriptionClient({
      baseUrl: requireEnv('SUBSCRIPTION_API_URL'),
      serviceToken: requireEnv('SUBSCRIPTION_SERVICE_TOKEN'),
      timeoutMs: numberFromEnv('SUBSCRIPTION_TIMEOUT_MS', 15000),
      cacheTtlMs: numberFromEnv('SUBSCRIPTION_CACHE_TTL_MS', 300000),
      deniedCacheTtlMs: numberFromEnv('SUBSCRIPTION_DENIED_CACHE_TTL_MS', 30000),
    });
  }

  return client;
}

function getSubscriptionContext(requestedModule) {
  return {
    customerId: requireEnv('SUBSCRIPTION_CUSTOMER_ID'),
    applicationCode: (process.env.SUBSCRIPTION_APPLICATION_CODE || 'CRM').trim(),
    requestedModule,
  };
}

module.exports = {
  getSubscriptionClient,
  getSubscriptionContext,
};
