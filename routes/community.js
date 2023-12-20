const express = require('express');
const { ObjectId } = require('mongodb');


const { client } = require('../database/index');
const db = client.db('lastTeamProject');

const router = express.Router();

// 모든 커뮤니티 정보
router.get('/', async (req, res) => {
  try {
    const data = await db.collection('community').find({}).toArray();
    res.json({
      flag: true,
      message: '데이터 불러오기 성공(커뮤니티)',
      data
    });
  } catch (err) {
    console.error(err);
  }
});

router.get('/detail/:postId', async (req, res) => {
  const postId = req.params.postId
  const postData = await db.collection('community').findOne({ _id: new ObjectId(postId) });
  const userData = await db.collection('userInfo').findOne({ _id: postData._id });
  res.json({
    flag: true,
    message: '데이터 불러오기 성공(상세보기)',
    postData,
    userData
  });
});

// 커뮤니티 삽입
router.post('/insert', async (req, res) => {
  const userId = req.user._id;
  const inputdata = req.body.inputdata;
  try {
    await db.collection('community').insertOne({...inputdata, userId});
    res.json({
      flag: true,
      message: '데이터 저장 성공(커뮤니티)'
    });
  } catch (err) {
    console.error(err);
  }
});


// 커뮤니티 수정
router.patch('/edit/:postId', async (req, res) => {
  const postId = req.params.postId;
  const editContent = req.body.inputdata;
  try {
    await db.collection('community').updateOne({ _id: new ObjectId(postId) },{ $set: { ...editContent } });
  } catch (err) {
    console.error(err);
  }
});

router.delete('/delete/:postId', async (req, res) => {
  const postId = req.params.postId;
  try {
    await db.collection('community').deleteOne({ _id: new ObjectId(postId) });
    res.json({
      flag: true,
      message: '데이터를 성공적으로 지웠습니다.'
    });
  } catch (err) {
    console.error(err);
  }
});


module.exports = router;