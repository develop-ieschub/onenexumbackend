const { BetaAnalyticsDataClient } = require("@google-analytics/data");
require("dotenv").config();
const PROPERTY_ID = process.env.PROPERTY_ID;

// Using a default constructor instructs the client to use the credentials
// specified in GOOGLE_APPLICATION_CREDENTIALS environment variable.
const analyticsDataClient = new BetaAnalyticsDataClient();

// Runs a simple report.
const runReport = async (req, res) => {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [
        {
          startDate: "2022-10-31",
          endDate: "today",
        },
      ],
      /* 
      dimensions: [
        {
          name: "eventName",
        },

        {
          name: "country",
        },
      ], */
      metrics: [
        {
          name: "active28DayUsers",
        },
        {
          name: "sessions",
        },
        {
          name: "eventCount",
        },
        {
          name: "eventCountPerUser",
        },
        {
          name: "eventValue",
        },
        {
          name: "eventsPerSession",
        },
        {
          name: "totalUsers",
        },
        {
          name: "conversions",
        },
        {
          name: "bounceRate",
        },

        /*  {
          name: "engagedSessions",
        }, */
      ],
    });

    //console.log(response);
    const obj = [];
    response.rows.forEach((row) => {
      //console.log(row);
      obj.push(row);
    });
    console.log(obj);
    res.status(200).json(obj);
  } catch (error) {
    return res.status(500).json({ error: error });
  }
};

module.exports = {
  runReport,
};
