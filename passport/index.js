const passport = require('passport')
const local = require('./localStrategy')
const { ObjectId } = require('mongodb')

const { client } = require('../database/index')
const db = client.db('lastTeamProject')

module.exports = () => { 
  passport.serializeUser((user, done) => {
    console.log('서버로그인 아이디1'+user);
    done(null, user._id)
  })

  passport.deserializeUser(async (id, done) => { 
    console.log('서버로그인 아이디2'+id);
    try {
      const user = await db.collection('userInfo').findOne({_id: new ObjectId(id)})
      done(null, user)
    } catch (err) {
      done(err)
    }
  })

  local()
}