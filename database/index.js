const { MongoClient } = require('mongodb');

// MongoDB 연결 설정하기
// DB 주소 찾는법: Database > Connect > Drivers
// mongodb+srv://root:<password>@cluster0.kafipby.mongodb.net/?retryWrites=true&w=majority   ?retryWrites=true&w=majority 이건 옵션임 넣어도되고 안넣어도됨

const { MONGO_ID, MONGO_PASSWORD } = process.env;
const url = `mongodb+srv://${MONGO_ID}:${MONGO_PASSWORD}@cluster0.hqitiuj.mongodb.net/?retryWrites=true&w=majority`;


// const url = `mongodb+srv://${MONGO_ID}:${MONGO_PASSWORD}@cluster0.kafipby.mongodb.net/`;
const client = new MongoClient(url);

const connect = async () => {
  try {
    await client.connect(); // MongoDB 서버에 연결
    console.log('몽고디비 연결 성공');
  } catch (err) {
    console.error('몽고디비 연결 에러', err);
  }
};

module.exports = { connect, client };