const express = require('express');
const { ObjectId, Long } = require('mongodb');

// S3
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');


const { client } = require('../database/index');
const db = client.db('lastTeamProject');

/**
 * @swagger
 * tags:
 *  name: Community
 *  description: 커뮤니티 정보 조회
 */




const router = express.Router();
// S3
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET
  },
  region: 'ap-northeast-2'
});

// S3 클라이언트
const upload = multer({
  storage: multerS3({
    s3,
    bucket: 'finaltp',
    key(req, file, cb) {
      cb(null, `original/${Date.now()}_${file.originalname}`)
    }
  }),
  limits: { fieldSize: 5 * 1024 * 1024 }
});

/**
 * @swagger
 * paths: 
 *  /community:
 *    get:
 *      summary: '커뮤니티 전체 정보 조회'
 *      description: '최다 조회수 게시글 5개, 최근 게시글 5개, 중고장터 게시글 10개'
 *      tags: [community]
 *      responses:
 *        '200':
 *          description: 전체 게시글 정보
 *          content:
 *            application/json:
 *              schema:
 *                  properties:
 *                    flag:
 *                      type: boolean
 *                    message: 
 *                      type: 'string'
 *                    community:
 *                      type: object
 *                      example:
 *                        [
 *                          bestViewPost: [
 *                          { title: 'string', content: '123' },
 *                          { title: 'qq', content: '123' },
 *                          { title: 'ww', content: '123' }
 *                          ],
 *                          recentPost: [
 *                          { title: 'ee', content: '123' },
 *                          { title: 'qq', content: '123' },
 *                          { title: 'ww', content: '123' }
 *                          ],
 *                          recentExchange: [
 *                          { title: 'ee', content: '123' },
 *                          { title: 'qq', content: '123' },
 *                          { title: 'ww', content: '123' }
 *                          ],
 *                        ]
 */

// 모든 커뮤니티 정보
router.get('/', async (req, res) => {
  try {
    const bestViewPost = await db.collection('community').find({}).sort({ view: -1 }).limit(5).toArray();
    const recentPost = await db.collection('community').find({ type: 'toktok' }).sort({ _id: -1 }).limit(5).toArray();
    const recentExchange = await db.collection('exchange').find({}).sort({ _id: -1 }).limit(10).toArray();
    res.json({
      flag: true,
      message: '데이터 불러오기 성공(커뮤니티)',
      bestViewPost,
      recentPost,
      recentExchange
    });
  } catch (err) {
    console.error(err);
  }
});

/**
 * @swagger
 * paths: 
 *  /community/daily:
 *    get:
 *      summary: '자랑 커뮤니티 정보 조회'
 *      description: '자랑 게시물 전체를 불러옵니다.'
 *      tags: [community]
 *      responses:
 *        '200':
 *          description: 자랑 게시글 정보
 *          content:
 *            application/json:
 *              schema:
 *                  properties:
 *                    flag:
 *                      type: boolean
 *                    message: 
 *                      type: 'string'
 *                    data: 
 *                      type: object
 *                      example:
 *                        [
 *                          { title: 'string', content: 'string' }
 *                        ]
 */

/**
 * @swagger
 * paths: 
 *  /community/daily/{postId}:
 *    get:
 *      summary: '자랑 게시물 디테일 정보 조회'
 *      description: '자랑 게시물의 id 값을 보낸다'
 *      tags: [community]
 *      parameters:
 *      - in: path
 *        name: postId
 *        required: true
 *        description: 게시글 아이디
 *        schema:
 *          type: string
 *      responses:
 *        '200':
 *          description: 자랑 게시글 디테일 정보
 *          content:
 *            application/json:
 *              schema:
 *                  properties:
 *                    flag:
 *                      type: boolean
 *                    message: 
 *                      type: 'string'
 *                    data: 
 *                      type: object
 *                      example:
 *                        [
 *                          { title: 'string', content: 'string' }
 *                        ]
 */







// DailyDog_List
router.get('/daily', async (req, res) => {
  try {
    const { perPage, page } = req.query
    const ListsPerPage = Number(perPage); 
    const currentPage = page || 1;

    const data = await db.collection('community').find({ type: 'daily' }).sort({ _id: -1 }).skip((currentPage - 1) * ListsPerPage).limit(ListsPerPage).toArray();
    const totalCount = await db.collection('community').countDocuments({ type: 'daily' });

    const numOfPage = Math.ceil(totalCount / ListsPerPage);
    
    if (currentPage > numOfPage) {
      return res.json({ flag: false, message: '없는 페이지 입니다.', data: [] });
    }

    res.json({
      flag: true,
      message: '데이터 불러오기 성공(커뮤니티)',
      data,
      numOfPage
    });
  } catch (err) {
    console.error(err);
  }
});

// DailyDog_List_Number
router.get('/daily/number', async (req, res) => {
  try {
    const data = await db.collection('community').find({ type: 'daily' }).sort({ _id: -1 }).skip(0).limit(1).toArray();
    res.json({
      flag: true,
      id: data[0].id
    });
  } catch (err) {
    console.error(err);
  }
});

// * 해당 글의 댓글과 함께 불러오게 수정 필요
// DailyDog_Detail_List
router.get('/daily/detail/:postId', async (req, res) => {
  const postData = await db.collection('community').findOne({ id: Number(req.params.postId) });
  res.json({
    flag: true,
    message: '데이터 불러오기 성공(상세보기)',
    postData,
  });
});

// DailyDog_Write
router.post('/daily/insert', async (req, res) => {

  const { id, title, content, author, authorId, date } = req.body

  let imgUrl = req.body.imgUrl || '';
  let imgKey = req.body.imgKey || '';
  
  // s3_delete
  if (imgKey) {
    const deleteImgKey = imgKey.filter(key => !content.includes(key));

    deleteImgKey.forEach(image => {
      const bucketParams = { Bucket: 'finaltp', Key: image };

      const run = async () => {
        try {
          const data = await s3.send(new DeleteObjectCommand(bucketParams))
          console.log('성공', data);
        } catch (err) {
          console.error(err);
        }
      };
      run();
    });

    imgUrl = imgUrl.filter(url => content.includes(url));
    imgKey = imgKey.filter(key => content.includes(key));
  }
  
  try {
    await db.collection('community').insertOne({ 
      id, 
      title, 
      content, 
      imgUrl, 
      imgKey, 
      author, 
      authorId: new ObjectId(authorId), 
      date, 
      type: 'daily', 
      view: 0, 
      like: [],
      dislike: []
    });
    res.json({
      flag: true,
      message: '데이터 저장 성공(커뮤니티_자랑)',
    });
  } catch (err) {
    console.error(err);
  }
});

// DailyDog_Write_Image
router.post('/daily/insert/image', upload.single('img'), async (req, res) => {
  const imgUrl = req.file?.location || '';
  const imgKey = req.file?.key || '';

  res.json({
    flag: true,
    message: '이미지 삽입 성공',
    fileName: imgUrl,
    fileKey: imgKey,
  });
});

// DailyDog_Delete
router.delete('/daily/delete/:id', async (req, res) => {
  try {
    const data = await db.collection('community').findOne({ id: Number(req.params.id) });

    const deleteImgKey = data.imgKey;
    
    // s3_delete
    if (deleteImgKey) {

      deleteImgKey.forEach(image => {
        const bucketParams = { Bucket: 'finaltp', Key: image };

        const run = async () => {
          try {
            const data = await s3.send(new DeleteObjectCommand(bucketParams))
            console.log('성공', data);
          } catch (err) {
            console.error(err);
          }
        };
        run();
      });
    }

  await db.collection('community').deleteOne({ id: Number(req.params.id) });
  res.json({
    flag: true,
    message: '데이터 삭제 성공'
  });
  } catch (err) {
    console.error(err);
  }
}); 

// DailyDog_Edit_List
router.get('/daily/edit/:postId', async (req, res) => {
  try {
    const data = await db.collection('community').findOne({ _id: new ObjectId(req.params.postId) });
    res.json({
      flag: true,
      message: '데이터 불러오기 성공',
      data
    });
  } catch (err) {
    console.error(err);
  }
});

// DailyDog_Edit
router.patch('/daily/edit/:postId', async (req, res) => {
  try {
    const { title, content } = req.body

    let imgUrl = req.body.imgUrl || '';
    let imgKey = req.body.imgKey || '';

    // s3_delete 
    if (imgKey) {
      const prevImageItem = await db.collection('community').findOne({ _id: new ObjectId(req.params.postId) });
      const prevImages = prevImageItem.imgKey.map(key => { return key });
      
      imgUrl = imgUrl.filter(url => content.includes(url));
      imgKey = imgKey.filter(key => content.includes(key));
      
      const deleteImgKey = prevImages.filter(key => !imgKey.includes(key));

      deleteImgKey.forEach(image => {
        const bucketParams = { Bucket: 'finaltp', Key: image };

        const run = async () => {
          try {
            const data = await s3.send(new DeleteObjectCommand(bucketParams))
            console.log('성공', data);
          } catch (err) {
            console.error(err);
          }
        };
        run();
      });
    }

    await db.collection('community').updateOne({
      _id: new ObjectId(req.params.postId) 
    }, {
      $set: { title, content, imgUrl, imgKey }
    });

    res.json({
      flag: true,
      message: '데이터 수정 성공',
    });
  } catch (err) {
    console.error(err);
  }
});

// DailyDog_View
router.patch('/daily/view/:id', async (req, res) => {
  try {
    await db.collection('community').updateOne({ _id: new ObjectId(req.params.id)}, { $inc: { view: 1 }});
    res.json({
      flag: true,
      message: '조회수 증가'
    });
  } catch (err) {
    console.error(err);
  }
});

// DailyDog_Like_Up
router.patch('/daily/likeup/:type', async (req, res) => {
  const { postId, authorId } = req.body

  console.log(req.params.type);

  try {
    if (req.params.type === 'up') {
      await db.collection('community').updateOne({ _id: new ObjectId(postId) }, { $push: { like: new ObjectId(authorId) } });
      const result = await db.collection('community').findOne({ _id: new ObjectId(postId) });
      
      res.json({
        flag: true,
        count: result.like.length,
        message: '좋아요 증가',
      });
    } else {
      await db.collection('community').updateOne({ _id: new ObjectId(postId) }, { $pull: { like: new ObjectId(authorId) } });
      const result = await db.collection('community').findOne({ _id: new ObjectId(postId) });
      
      res.json({
        flag: true,
        count: result.like.length,
        message: '좋아요 감소',
      });
    }
  } catch (err) {
    console.error(err);
  }
});

// DailyDog_Like_Down
router.patch('/daily/likedown/:type', async (req, res) => {
  const { postId, authorId } = req.body

  try {
    if (req.params.type === 'up') {
      await db.collection('community').updateOne({ _id: new ObjectId(postId) }, { $push: { dislike: new ObjectId(authorId) } });
      const result = await db.collection('community').findOne({ _id: new ObjectId(postId) });
      
      res.json({
        flag: true,
        count: result.dislike.length,
        message: '좋아요 증가',
      });
    } else {
      await db.collection('community').updateOne({ _id: new ObjectId(postId) }, { $pull: { dislike: new ObjectId(authorId) } });
      const result = await db.collection('community').findOne({ _id: new ObjectId(postId) });
      
      res.json({
        flag: true,
        count: result.dislike.length,
        message: '좋아요 감소',
      });
    }
  } catch (err) {
    console.error(err);
  }
});

// DailyDog_Comment_List
router.get('/daily/comment/:postId', async (req, res) => {
  try {
    const commentList = await db.collection('comment').find({ postId: new ObjectId(req.params.postId) }).toArray();
    res.json(commentList)  
  } catch (err) {
    console.error(err);
  }
});

// DailyDog_Comment_Write
router.post('/daily/comment/insert', async (req, res) => {
  const { postId, comment, date, author, authorId } = req.body

  try {
    await db.collection('comment').insertOne({
      author,
      authorId: new ObjectId(authorId),
      comment,
      date,
      postId: new ObjectId(postId),
      type: 'daily'
    });
    res.json({
      flag: true,
      message: '성공적으로 댓글이 등록되었습니다.'
    });
  } catch (err) {
    console.error(err);
  }
});

// DailyDog_Comment_Delete
router.delete('/daily/comment/delete/:id', async (req, res) => {
  try {
    await db.collection('comment').deleteOne({ _id: new ObjectId(req.params.id) });

    res.json({
      flag: true,
      message: '댓글 삭제 성공'
    });
  } catch (err) {
    console.error(err);
  }
}); 











// 수정 (이미지)_데일리톡(일상)
router.patch('/daily/edit/:postId', upload.single('img'), async (req, res) => {
  const thisPost = await db.collection('community').findOne({ _id: req.params.postId });
  console.log(req.file);
  const title = req.body.title;
  const content = req.body.content;
  const author = req.body.author;
  const imgUrl = req.file?.location || '';
  const imgKey = req.file?.key || '';
  const like = req.body.like;
  const view = req.body.view;

  // aws에서 데이터 삭제
  const bucketParams = { Bucket: 'finaltp', Key: thisPost.imgKey };
  const run = async () => {
    try {
      const data = await s3.send(new DeleteObjectCommand(bucketParams))
      console.log('성공', data);
    } catch (err) {
      console.error(err);
    }
  };
  try {
    // await db.collection('community').insertOne({...inputdata, userId, imgUrl});
    await db.collection('community').updateOne({ _id: thisPost._id }, { $set: { title, content, author, imgUrl, imgKey } });
    run();
    res.json({
      flag: true,
      message: '데이터 수정 성공(커뮤니티_데일리톡(일상))'
    });
  } catch (err) {
    console.error(err);
  }
});
// 삭제_데일리톡(일상)
// router.delete('/daily/delete/:postId', async (req, res) => {
//   const postId = req.params.postId;
//   try {
//     const thisPost = await db.collection('community').findOne({ _id: req.params.postId });
//     const bucketParams = { Bucket: 'finaltp', Key: thisPost.imgKey };
//     const run = async () => {
//       try {
//         const data = await s3.send(new DeleteObjectCommand(bucketParams))
//         console.log('성공', data);
//       } catch (err) {
//         console.error(err);
//       }
//     };
//     await db.collection('community').deleteOne({ _id: new ObjectId(postId) });
//     run();
//     res.json({
//       flag: true,
//       message: '데이터를 성공적으로 지웠습니다.'
//     });
//   } catch (err) {
//     console.error(err);
//   }
// });

// 테스트 더미---- 
router.get('/test', async (req, res) => {
  const post = await db.collection('community').findOne({ title: '123' });
  res.render('write.ejs', { post });
});
// 좋아요 버튼이 토글이 아닐 때
router.post('/test/like', async (req, res) => {
  const id = '더미'
  const thisPost = await db.collection('community').findOne({ title: '123' });

  try {
    if (thisPost.like?.find(liked => liked === id)) {
      throw new Error('이미 좋아요 누름')
    } else {
      await db.collection('community').updateOne({ title: '123' }, { $push: { like: id } });
      res.json({
        flag: true,
        message: '성공'
      })
    }

  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: err.message
    });
  }
});
// 테스트 끝----




// 육아톡톡 커뮤니티
router.get('/toktok', async (req, res) => {
  try {
    const data = await db.collection('community').find({ type: 'toktok' }).toArray();
    res.json({
      flag: true,
      message: '데이터 불러오기 성공(육아톡톡)',
      data
    });
  } catch (err) {
    console.error(err);
  }
});

// 육아톡톡 상세페이지
router.get('/toktok/detail/:postId', async (req, res) => {
  const postId = req.params.postId
  const postData = await db.collection('community').findOne({ _id: new ObjectId(postId) });
  // const userData = await db.collection('userInfo').findOne({ _id: postData._id });
  const commentData = await db.collection('comment').find({ postId: new ObjectId(postId) }).toArray();
  res.json({
    flag: true,
    message: '데이터 불러오기 성공(상세보기)',
    postData,
    // userData,
    commentData
  });
});

// 커뮤니티 삽입_육아톡톡
router.post('/toktok/insert', upload.single('imgUrl'), async (req, res) => {
  const mydate = new Date();
  // const userId = req.user._id;
  // const inputdata = req.body.inputdata;
  const title = req.body.title;
  const content = req.body.content;
  const author = req.body.author || '';
  const imgUrl = req.file?.location || '';
  const imgKey = req.file?.key || '';
  const like = req.body.like;
  const view = req.body.view;
  const user = req.body.user;
  const date = mydate;

  try {
    // await db.collection('community').insertOne({...inputdata, userId, imgUrl});
    await db.collection('community').insertOne({ title, content, author, imgUrl, imgKey, like, view, date, user, type: 'toktok' });
    res.json({
      flag: true,
      message: '데이터 저장 성공(커뮤니티_육아톡톡)',
    });
  } catch (err) {
    console.error(err);
  }
});

// 수정 (이미지)_육아톡톡
router.patch('/toktok/edit/:postId', upload.single('img'), async (req, res) => {
  const thisPost = await db.collection('community').findOne({ _id: req.params.postId });
  console.log(req.file);
  const title = req.body.title;
  const content = req.body.content;
  const author = req.body.author;
  const imgUrl = req.file?.location || '';
  const imgKey = req.file?.key || '';

  // aws에서 데이터 육아톡톡
  const bucketParams = { Bucket: 'finaltp', Key: thisPost.imgKey };
  const run = async () => {
    try {
      const data = await s3.send(new DeleteObjectCommand(bucketParams))
      console.log('성공', data);
    } catch (err) {
      console.error(err);
    }
  };
  try {
    // await db.collection('community').insertOne({...inputdata, userId, imgUrl});
    await db.collection('community').updateOne({ _id: thisPost._id }, { $set: { title, content, author, imgUrl, imgKey } });
    run();
    res.json({
      flag: true,
      message: '데이터 수정 성공(커뮤니티_육아톡톡)'
    });
  } catch (err) {
    console.error(err);
  }
});

// 삭제_육아톡톡
router.delete('/toktok/delete/:postId', async (req, res) => {
  const postId = req.params.postId;
  try {
    const thisPost = await db.collection('community').findOne({ _id: req.params.postId });
    const bucketParams = { Bucket: 'finaltp', Key: thisPost.imgKey };
    const run = async () => {
      try {
        const data = await s3.send(new DeleteObjectCommand(bucketParams))
        console.log('성공', data);
      } catch (err) {
        console.error(err);
      }
    };
    await db.collection('community').deleteOne({ _id: new ObjectId(postId) });
    run();
    res.json({
      flag: true,
      message: '데이터를 성공적으로 지웠습니다.'
    });
  } catch (err) {
    console.error(err);
  }
});

// 댓글달기_육아톡톡
router.post('/toktok/comment/:postId', async (req, res) => {
  const mydate = new Date();
  const postId = req.params.postId;
  const user = req.body.user;
  // const user = req.user._id;
  // const userId = req.user.userId;
  const comment = req.body.comment;
  const date = mydate;
  try {
    await db.collection('comment').insertOne({
      user,
      // userId,
      comment,
      date,
      postId: new ObjectId(postId),
      type: 'toktok'
    });
    res.json({
      flag: true,
      message: '성공적으로 댓글이 등록되었습니다.'
    });
  } catch (err) {
    console.error(err);
  }
});

router.get('/Toktok/ddd', async (req, res) => { // 톡톡 다 삭제ㅁㅁㅇㄴㅇㄴㅁㅇ???????????????이건 왜 안되니
  await db.collection('community').deleteMany({ type: "toktok" });
});

// 조회수 육아톡톡 ddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
router.post('/toktok/view', async (req, res) => {
  // const postId = req.params.postId;
  console.log(req.body);
  const postId = req.body.postId;
  const userId = req.body._id;
  console.log(req.body.user);
  try {
    // const thisPost = await db.collection('community').findOne({ _id: new ObjectId(postId) });
    // thisPost.like?.find();
    await db.collection('community').updateOne({ _id: new ObjectId(postId) }, { $push: { view: userId._id } });
    const post = await db.collection('community').findOne({ _id: new ObjectId(postId) });
    res.json({
      flag: true,
      message: '성공',
      post
    });
  } catch (err) {
    console.error(err);
  }
});

// 좋아요_+_육아톡톡
router.post('/toktok/like', async (req, res) => {
  // const postId = req.params.postId;
  const postId = req.body.postId;
  const userId = req.user.userId;
  try {
    const thisPost = await db.collection('community').findOne({ _id: new ObjectId(postId) });
    thisPost.like?.find();
    await db.collection('community').updateOne({ _id: new ObjectId(postId) }, { $push: { like: userId } });
    const post = await db.collection('community').findOne({ _id: new ObjectId(postId) });
    res.json({
      flag: true,
      message: '성공',
      post
    });
  } catch (err) {
    console.error(err);
  }
});
// 좋아요_-_육아톡톡
router.post('/toktok/dislike', async (req, res) => {
  // const postId = req.params.postId;
  const postId = req.body.postId;
  const userId = req.user.userId;
  try {
    await db.collection('community').updateOne({ _id: new ObjectId(postId) }, { $pull: { like: userId } });
    const post = await db.collection('community').findOne({ _id: new ObjectId(postId) });
    res.json({
      flag: true,
      message: '성공',
      post
    });
  } catch (err) {
    console.error(err);
  }
});



// 중고인데 vintage 에 작성이 되어있어서 안쓸예정인 라우터
router.get('/exchange', async (req, res) => {
  try {
    const exchangePost = await db.collection('exchange').find({}).toArray();
    res.json({
      flag: true,
      message: '불러오기 성공(중고)',
      exchangePost
    });
  } catch (err) {
    console.error(err);
  }
});

// 중고 인데 vintage 에 작성이 되어있어서 안쓸예정인 라우터
router.get('/exchange/detail/:postId', async (req, res) => {
  const exchangePostId = req.params.postId
  const postData = await db.collection('exchange').findOne({ _id: new ObjectId(exchangePostId) });
  // const userData = await db.collection('userInfo').findOne({ _id: postData._id });
  const commentData = await db.collection('comment').find({ postId: new ObjectId(postId) }).toArray();
  res.json({
    flag: true,
    message: '데이터 불러오기 성공(상세보기)',
    postData,
    // userData,
    commentData
  });
});

// 커뮤니티 삽입_중고아이템 (관리자)
router.post('/exchange/insert', upload.single('img'), async (req, res) => {
  // const userId = req.user._id;
  // const inputdata = req.body.inputdata;
  const title = req.body.title;
  const content = req.body.content;
  const price = req.body.price;
  const author = req.body.author;
  const imgUrl = req.file?.location || '';
  const imgKey = req.file?.key || '';

  try {
    // await db.collection('community').insertOne({...inputdata, userId, imgUrl});
    await db.collection('exchange').insertOne({ title, content, price, author, imgUrl, imgKey });
    res.json({
      flag: true,
      message: '데이터 저장 성공(중고)'
    });
  } catch (err) {
    console.error(err);
  }
});


// 쇼핑몰아이템 삽입 (관리자)
router.post('/insertShopItem', upload.array('img'), async (req, res) => {
  // const userId = req.user._id;
  // const inputdata = req.body.inputdata;
  const brand = req.body.brand;
  const title = req.body.title;
  const price = req.body.price;
  const age = req.body.age;
  const size = req.body.size;
  const tag = req.body.tag;
  console.log(req.files);
  const imgUrl = req.files.map(url => url.location) || '';
  const imgKey = req.files.map(url => url.key) || '';
  console.log(imgUrl);
  console.log(imgKey);
  // const imgUrl = req.file?.location || '';
  // imgUrl 뒤에 키값이 있으니까 
  // 앞의 값은 env 에 저장해서 꺼내쓰고 키값만 imgUrl에 저장해도되고
  // 두개를 따로 나눠서 저장해도되고 선택!
  // const imgKey = req.file?.key || '';

  try {
    await db.collection('shop').insertOne({ brand, title, price, age, size, tag, imgUrl, imgKey });
    res.json({
      flag: true,
      message: '데이터 저장 성공(쇼핑)'
    });
  } catch (err) {
    console.error(err);
  }
});

// 쇼핑몰아이템 수정 (이미지)
router.post('/daily/editShopItem/:itemId', upload.single('img'), async (req, res) => {
  const thisItem = await db.collection('shop').findOne({ _id: req.params.itemId });
  console.log(req.file);
  const brand = req.body.brand;
  const title = req.body.title;
  const price = req.body.price;
  const age = req.body.age;
  const size = req.body.size;
  const tag = req.body.tag;
  const imgUrl = req.file?.location || '';
  const imgKey = req.file?.key || '';

  // aws에서 데이터 삭제
  // const bucketParams = { Bucket: 'finaltp', Key: 'original/1703139078070_feed_01.jpg' };
  const bucketParams = { Bucket: 'finaltp', Key: thisItem.imgKey };
  const run = async () => {
    try {
      const data = await s3.send(new DeleteObjectCommand(bucketParams))
      console.log('성공', data);
    } catch (err) {
      console.error(err);
    }
  };
  try {
    // await db.collection('community').insertOne({...inputdata, userId, imgUrl});
    await db.collection('shop').updateOne({ _id: thisItem._id }, { $set: { brand, title, price, age, size, tag, imgUrl, imgKey } });
    run();
    res.json({
      flag: true,
      message: '데이터 수정 성공(쇼핑)'
    });
  } catch (err) {
    console.error(err);
  }
});



// 채팅 테스트
router.get('/testChat', async (req, res) => {
  res.render('chat.ejs');
});




module.exports = router;