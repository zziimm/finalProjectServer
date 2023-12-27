const express = require('express');
const { ObjectId } = require('mongodb');

// 해당 게시글에서 "채팅하기" 버튼 누르면
// 해당 게시글 상품 정보 (사진, 제목, 가격) 가져와지고 글쓴이랑 1대 1 채팅 되게

// + 일정 잡기(캘린더)