'use strict';
const config = require("./config");
const phin = require("phin");
const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();

const sendMessage = (message) => {
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

exports.handler = (event, context, callback) => {
  const today = new Date();
  const firstDateOfLastMonth = Math.floor(new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0).getTime() / 1000);
  const lastDateOfLastMonth = Math.floor(new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0).getTime() / 1000) - 1;
  const lastMonth = new Date(firstDateOfLastMonth * 1000);

  let params = [];
  config.categories.forEach(category => {
    params.push({
      TableName: config.tableName,
      ExpressionAttributeNames: {
        "#category": "category",
        "#createdAt": "createdAt"
      },
      ExpressionAttributeValues: {
        ":category": category,
        ":first": firstDateOfLastMonth,
        ":last": lastDateOfLastMonth
      },
      KeyConditionExpression: "#category = :category AND #createdAt BETWEEN :first AND :last"
    });
  });

  Promise.all(params.map(param => dynamo.query(param).promise()))
    .then(results => {
      // Queryの結果をカテゴリごとに集計
      return results.map(result => {
          if (result.Count > 0) {
            let sum = 0;
            result.Items.forEach(item => {
              sum += item.price;
            });
            return {
              category: result.Items[0].category,
              price: sum
            };
          }
        })
        .filter(v => v); // undefined削除
    })
    .then(results => {
      // summaryテーブルに追加
      let requests = [];
      results.forEach(result => {
        requests.push({
          PutRequest: {
            Item: {
              yearMonth: `${lastMonth.getFullYear()}/${lastMonth.getMonth() + 1}`,
              category: result.category,
              price: result.price
            }
          }
        });
      });
      if (requests.length > 0) {
        let params = {
          RequestItems: {}
        };
        params.RequestItems[config.summaryTableName] = requests;
        dynamo.batchWrite(params, (err) => {
          if (err) {
            sendMessage(`集計データの記録に失敗してしもたわ。\nFOR SEIYA: ${err}`);
          }
        });
      }
      return results;
    })
    .then(results => {
      // メッセージの整形
      let message = `${lastMonth.getMonth()}月分の支出は\n`;
      results.forEach(result => {
        message += `・${result.category}: ${result.price}円\n`
      })
      message += "やったわ〜。あんまり使いすぎひんようにな。";
      return message;
    })
    .then(message => {
      // LINEに通知
      sendMessage(message);
    })
    .catch(err => {
      sendMessage(`集計に失敗したわ〜。\nFOR SEIYA: ${err}`);
    });
};
