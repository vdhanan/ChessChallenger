'use strict'
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const compression = require('compression')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const app = express()
const router = express.Router()
const AWS = require('aws-sdk')
const jwt = require('jsonwebtoken');
const fetch = require("node-fetch")
const moment = require('moment')
const dotenv = require('dotenv')

dotenv.config()

const dynamodb = new AWS.DynamoDB.DocumentClient({region: process.env.AWS_REGION})
const tableName = process.env.DYNAMODB_TABLE_NAME
const secret = Buffer.from(process.env.SECRET_KEY, 'base64')
const ext_UID = process.env.EXTENSION_USER_ID
const ext_clientID = process.env.EXTENSION_CLIENT_ID

if (process.env.NODE_ENV === 'test') {
  // NOTE: aws-serverless-express uses this app for its integration tests
  // and only applies compression to the /sam endpoint during testing.
  router.use('/sam', compression())
} else {
  router.use(compression())
}

app.use(cors())
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: true }))
router.use(awsServerlessExpressMiddleware.eventContext())

app.use(function(req, res, next) {
  try{
    let token = req.headers.authorization.split(" ")[1]
    console.log(token)
    jwt.verify(token, secret, (err, payload) => {
      if (err) {
        console.log('ERROR: Could not connect to the protected route')
        res.sendStatus(403)
      }
      else {
        console.log('Success')
        next()
      }
    })
  }
  catch(e){
    console.log("Unable to find JWT")
    res.sendStatus(403)
  }
})

router.get('/queue', async (req, res) => {
  let queue = await getQueueByChannel(req.query.channel_id);
  res.json(queue);
})

router.put('/queue', async (req, res) => {
  let queueUpdate = await updateQueue(req.body);
  if (queueUpdate == 409 || queueUpdate == 400) {
    res.sendStatus(queueUpdate)
  }
  else{
    res.json(queueUpdate)
  }
})

router.post('/queue', async (req, res) => {
  let queue = await createQueue(req.body)
  res.json(queue)
})

const createQueue = async (reqBody) => {
  var params = {
    TableName: tableName,
    Item: {
      ChallengeQueue: [],
      ChannelId: reqBody.channelId,
      IsActive: false,
      LastModified: moment().toISOString()
    }
  }
  try{
    let data = await dynamodb.put(params).promise()
    return data
  }
  catch(error){
    console.log(error)
  }
}

const getQueueByChannel = async (channelId) => {
  var params = {
    TableName: tableName,
    // IndexName: 'ChannelId',
    KeyConditionExpression: "ChannelId = :channelid",
    ProjectionExpression: "ChallengeQueue, IsActive",
    ExpressionAttributeValues: {
      ":channelid": channelId,
    }
  };

  try{
    let data = await dynamodb.query(params).promise()
    console.log(data)
    return data
  }
  catch(error){
    console.log(error)
  }
}

const updateQueue = async (reqBody) => {
  var update
  if (reqBody.updateType === 'clear') {
    update = await clearQueue(reqBody)
  }
  else if (reqBody.updateType === 'push') {
    update = await pushToQueue(reqBody)
  }
  else if (reqBody.updateType === 'pop') {
    update = await popFromQueue(reqBody)
  }
  else if (reqBody.updateType === 'activate') {
    update = await activateQueue(reqBody)
  }
  else {
    console.log("INVALID UPDATE TYPE")
    update = 400
  }

  if (update == 400 || update == 409) {
    return update
  }

  try{
    var pubSubMessage
    let channelInfo = await getQueueByChannel(reqBody.channelId)
    if (reqBody.updateType === 'activate'){
      pubSubMessage = {isActive: channelInfo.Items[0].IsActive}
    }
    else{
      pubSubMessage = {updatedQueue: channelInfo.Items[0].ChallengeQueue}
    }
  }
  catch(err){
    console.log(err)
  }

  try{
    let res = await fetch(`https://api.twitch.tv/extensions/message/${reqBody.channelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${makeServerToken(reqBody.channelId)}`,
        'Client-Id': ext_clientID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content_type: 'application/json',
        message: JSON.stringify(pubSubMessage),
        targets: ['broadcast']
      })
    })
    console.log(res.status)
  }
  catch(err) {
    console.log(err)
  }
  return update
}

const clearQueue = async (reqBody) => {
  var params = {
    TableName: tableName,
    Key: {ChannelId: reqBody.channelId},
    ExpressionAttributeValues: {
      ":emptyQueue": [],
    },
    UpdateExpression: "set ChallengeQueue = :emptyQueue",
  }
  try{
    let data = await dynamodb.update(params).promise()
    console.log(data)
    return data
  }
  catch(error){
    console.log(error)
  }
}

const pushToQueue = async (reqBody) => {
  let channelInfo = await getQueueByChannel(reqBody.channelId)
  let channelQueue = channelInfo.Items[0].ChallengeQueue
  for(let i = 0; i < channelQueue.length; i++){
    console.log(channelQueue[i][2], reqBody.twitchId)
    if (channelQueue[i][2] == reqBody.twitchId) {
      return 409
    }
  }
  console.log(reqBody.twitchId)
  let userInfo = await fetch(`https://api.twitch.tv/helix/users?id=${reqBody.twitchId}`, {
    method: 'GET',
    headers: {
      'Client-Id': ext_clientID
    }
  })
  let userInfoJson = await userInfo.json()
  let challenger = [[userInfoJson.data[0].display_name, reqBody.chessDisplayName, reqBody.twitchId]]
  var params = {
    TableName: tableName,
    Key: {ChannelId: reqBody.channelId},
    ExpressionAttributeValues: {
      // ":channelid": reqBody.channelId,
      ":newList": challenger
    },
    UpdateExpression: "set ChallengeQueue = list_append(ChallengeQueue, :newList)",
    // ConditionExpression: "ChannelId = :channelid"
  }
  try{
    let data = await dynamodb.update(params).promise()
    console.log(data)
    return data
  }
  catch(error){
    console.log(error)
  }
}

const popFromQueue = async (reqBody) => {
  var params = {
    TableName: tableName,
    Key: {ChannelId: reqBody.channelId},
    UpdateExpression: "remove ChallengeQueue[0]",
  }
  try{
    let data = await dynamodb.update(params).promise()
    console.log(data)
    return data
  }
  catch(error){
    console.log(error)
  }
}

const activateQueue = async (reqBody) => {
  var params = {
    TableName: tableName,
    Key: {ChannelId: reqBody.channelId},
    ExpressionAttributeValues: {
      ":isactive": !reqBody.isActive
    },
    UpdateExpression: "set IsActive = :isactive",
  }
  try{
    let data = await dynamodb.update(params).promise()
    return data
  }
  catch(error){
    console.log(error)
  }
}

function makeServerToken(channelId) {
  const payload = {
      exp: Math.floor(Date.now() / 1000) + 30,
      channel_id: channelId,
      user_id: ext_UID,
      role: 'external',
      pubsub_perms: {
          send: ['broadcast']
      }
  };
  return jwt.sign(payload, secret, { algorithm: 'HS256' });
}

// The aws-serverless-express library creates a server and listens on a Unix
// Domain Socket for you, so you can remove the usual call to app.listen.
// app.listen(3000)
app.use('/', router)

// Export your express server so you can import it in the lambda function.
module.exports = app
