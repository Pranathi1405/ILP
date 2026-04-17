const AnalyticsModel = require('../models/analytics.model');

exports.storeAnalytics = async (attemptId, total, score) => {

  const percentage = (score / total) * 100;

  await AnalyticsModel.insertAnalytics({
    attemptId,
    total,
    score,
    percentage
  });
};