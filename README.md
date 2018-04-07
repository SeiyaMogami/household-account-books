## about
GoogleAssistantに「家計簿 食費 1000円」のように伝えると、`IFTTT(Webhook) -> APIGW -> Lambda -> DynamoDB`という流れで保存してくれる、API部分のソースコードです。

## config.js
微妙に外に見せたくない情報が、`./config.js`に書いてあったので、ignoreしています。下記のようになっているので参考にしてください。

```javascript:config.js
module.exports = {
  "tableName": "household-account-books",
  "summaryTableName": "household-account-summaries",
  "categories": ["食費", "生活費", "光熱費"],
  "lineUrl": "My LINEBot URL"
}
```

## 変更
- 2018/04/07
  - 稼働停止
