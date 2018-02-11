'use strict';
const config = require("./config");
const phin = require("phin");
const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();
const response = (callback, status, body) => {
  callback(null, {
    statusCode: status,
    body: JSON.stringify(body)
  });
};

const sendError = (message) => {
  phin({
    url: config.lineUrl,
    method: "POST",
    data: {
      type: "house",
      allthrough: true,
      message: message
    }
  });
};

module.exports.handler = (event, context, callback) => {
  console.log(event.body);
  const body = JSON.parse(event.body);
  const category = body.category.replace(/\s+/g, "");
  const price = body.price;

  if (config.categories.includes(category)) {
    const now = Math.round(new Date().getTime() / 1000);
    const params = {
      TableName: config.tableName,
      Item: {
        category: category,
        createdAt: now,
        price: price,
        ttl: now + 35 * 24 * 60 * 60
      }
    };
    dynamo.put(params, (err, data) => {
      if (err) {
        sendError(`${category} ${price}円の登録に失敗してもーたわ。もう一回言うてみてくれるか。\n For SEIYA: ${err}`);
      }
    });
  } else {
    sendError(`いまのところ、カテゴリとして許可してんのは「${config.categories.join("、")}」だけやねん。すまんな。`);
  }

  response(callback, 200, {});
};
