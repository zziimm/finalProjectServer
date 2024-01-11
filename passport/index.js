const passport = require('passport')
const local = require('./localStrategy')
const { ObjectId } = require('mongodb')

const { client } = require('../database/index')
const db = client.db('lastTeamProject')

module.exports = () => { 
  passport.serializeUser((user, done) => {
    done(null, user._id)
  })

  passport.deserializeUser(async (id, done) => { 
    try {
      const user = await db.collection('userInfo').findOne({_id: new ObjectId(id)});
      done(null, user)
    } catch (err) {
      done(err)
    }
  })

  local();
};