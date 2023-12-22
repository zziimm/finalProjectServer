// 1. 중고장터 커뮤니티 만들기
// 2. 해당 게시글에 "채팅하기" 버튼 만들기
// 3. "채팅하기" 버튼 누르면 게시글 글쓴이와 1대1 채팅
// 4. 1대 1 채팅 : 대화 내용 날아가지 않게

const express = require('express')
const { client } = require('../database/index')
const db = client.db('lastTeamProject')

const router = express.Router();

router.get('/', async (req, res) => {
  const communityData = await db.collection()
})

router.post('/smCommunity', async (req,res) => {
  const 
})