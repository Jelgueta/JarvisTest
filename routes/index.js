var express = require('express')
var router = express.Router()
let blobStorageApi = require('../blobStorageApi/blobStorageApi')
const crypto = require('crypto')
const containerUrl =
  'https://lmsblobstorage.blob.core.windows.net/jarvisimages/'
var request = require('request-promise')

// connection strings for Azure enviroments
var conn_strings = require('../config/db/db.config')
var db

// Connecting using mongoose
var mongoose = require('mongoose')
var isConnectedBefore = false

// logger for loggin system
var logger = require('../logger')
var errorlog = logger.errorlog
var successlog = logger.successlog

// Face and Computer Vision API Configs
var apiConfig = require('../config/app/app.config')

// loading jarvisAPI
let jarvisDbAPI = require('../jarvisAPI/jarvisDbAPI')
let jarvisAppAPI = require('../jarvisAPI/jarvisAppAPI')

let environment = 'staging'
let environmentConfig = 'url_' + environment
let connectionString = conn_strings[environmentConfig]

// let dotenv = require('dotenv/config')

// let CONNECTION_STRING = process.env.CONNECTION_STRING
// var numCPUs = require('os').cpus().length
// establish connection to dev db
db = mongoose.connect(connectionString, {
  useMongoClient: true
})

mongoose.connection.on('error', function (e) {
  errorlog.error('Could not connect to MongoDB')
  errorlog.error(e)
})

mongoose.connection.on('disconnected', function () {
  errorlog.error('Lost MongoDB connection...')
  if (!isConnectedBefore) {
    db = mongoose.connect(CONNECTION_STRING, { useMongoClient: true })
  }
})

mongoose.connection.on('connected', function () {
  isConnectedBefore = true
  successlog.info(
    'Connection established to MongoDB => ' + environment + ' db:jarvis\n'
  )
})

mongoose.connection.on('reconnected', function () {
  successlog.info('Reconnected to MongoDB')
})

router.get('/:course_id/:assessment_id/:user_id', function (req, res, next) {
  var page = req.query.page

  var courseId = req.params.course_id
  var assessmentId = req.params.assessment_id
  var userId = req.params.user_id

  var data = {}
  data.courseId = courseId
  data.assessmentId = assessmentId
  data.userId = userId
  data.page = page

  res.render('index', data)
})

router.get('/', function (req, res, next) {
  res.json({ message: `Server running on ${req.app.get('port')}` })
})

router.get('/selectAll', function (req, res, next) {
  jarvisDbAPI
    .selectAll(db)
    .then(result => res.json(result))
    .catch(err => res.json(err))
})

router.get('/deleteAll', function (req, res, next) {
  jarvisDbAPI
    .deleteAll(db)
    .then(result => res.json(result))
    .catch(err => res.json(err))
})

router.get('/deleteAllAttempts/:user_id', function (req, res, next) {
  var userId = req.params.user_id

  console.log('Deleting all attempts from user: ' + userId)

  if (userId != null && userId != '') {
    jarvisDbAPI
      .deleteAllAttempts(db, userId)
      .then(result => res.send(result))
      .catch(err => res.send(err))
  }
})

router.post('/ping', function (req, res, next) {
  try {
    var proctoring = new jarvisAppAPI.proctoring()

    proctoring.index = req.headers.index
    proctoring.user_id = req.headers.user_id
    proctoring.assessment_id = req.headers.assessment_id
    proctoring.course_id = req.headers.course_id
    proctoring.content_id = req.headers.content_id
    proctoring.timestamp = req.headers.timestamp
    proctoring.assessment_minute = req.headers.assessment_minute
    proctoring.person_id = req.headers.person_id

    var personId = proctoring.person_id

    var computerVisionKey = apiConfig.computerVisionKey
    var faceAPIKey = apiConfig.faceAPIKey

    var buf = new Buffer(req.body.blob, 'base64') // decode

    const imageInfo = `${proctoring.course_id}_${proctoring.assessment_id}_${proctoring.user_id}`

    proctoring.img = ''
    jarvisAppAPI
      .verifyPicture(faceAPIKey, personId, buf)
      .then(result => {
        console.log(result)

        proctoring.verify = result
        var all = jarvisAppAPI.getWarningsFromVerification(result)
        proctoring.warnings = proctoring.warnings.concat(all.warnings)
        proctoring.alerts = proctoring.alerts.concat(all.alerts)
      })
      .catch(err => console.log(err))
      .then(() => {
        jarvisAppAPI
          .analyzePicture(computerVisionKey, buf)
          .then(result => {
            proctoring.analyze = result
            var all = jarvisAppAPI.getWarningsFromAnalysis(result)

            // proctoring.comments = proctoring.comments.concat(all.comments);
            proctoring.warnings = proctoring.warnings.concat(all.warnings)
            proctoring.alerts = proctoring.alerts.concat(all.alerts)
          })
          .catch(err => console.log(err))
          .then(() => {
            // RETURN WARNINGS AND ALERTS ALMOST ON REAL TIME TO STUDENT
            /* res.send({
          warnings:proctoring.warnings,
          alerts:proctoring.alerts
        }); */
            blobStorageApi
              .upload(buf, imageInfo, proctoring.course_id)
              .then(imageUri => {
                console.log('imageUri', imageUri)

                proctoring.img =
                  containerUrl + proctoring.course_id + '/' + imageUri + '.jpg'

                jarvisDbAPI
                  .storeProctoring(proctoring, db)
                  .then(result => {
                    console.log(result)
                    console.log(
                      '-------------------- Finished All --------------------'
                    )
                    res.send(result)
                  })
                  .catch(err => console.log(err))
              })
              .catch(err => console.log('Error', err))
          })
      })
  } catch (err) {
    errorlog.error('Exception when receiving blob')
    errorlog.error(err)
    res.send(err)
  }

  // res.send("Processed");
})

// Detailed Report Per Student
router.get('/detailedReport/:course_id/:assessment_id/:user_id', function (
  req,
  res
) {
  /// detailedReport/_7402_1/_1486_1/laur.rnarvaez

  var courseId = req.params.course_id
  var assessmentId = req.params.assessment_id
  var userId = req.params.user_id

  let page = req.query.page
  let params = {
    courseId,
    assessmentId,
    userId,
    page
  }
  jarvisDbAPI
    .detailedReport(params, db)
    .then(result => res.json(result))
    .catch(err => res.json(err))
})

// High Level Report Student
router.get('/detailed_report/:course_id/:assessment_id/', function (req, res) {
  var courseId = req.params.course_id
  var assessmentId = req.params.assessment_id
  var userId = req.params.user_id

  /* load_by_search_term(search_term, dt_from, dt_to)
    .then(search_term => {
      res.send(search_term).status(200);
    })
    .catch(err => {
      res.send(err).status(500);
    }); */
})

// https://jarvis-app-dev.azurewebsites.net/isAssessmentProctored/_8957_1/_8018_1/Laur
// Get Is Assessment Proctored
router.get(
  '/isAssessmentProctored/:course_id/:assessment_id/:institution_id/',
  function (req, res) {
    var courseId = req.params.course_id
    var assessmentId = req.params.assessment_id
    var institutionId = req.params.institution_id

    jarvisDbAPI
      .isAssessmentProctored(courseId, assessmentId, institutionId, db)
      .then(result => {
        res.send(result)
      })
      .catch(err => console.log(err))
  }
)

// https://jarvis-app-dev.azurewebsites.net/getProctoringConfigurations/_8957_1/_8018_1/Laur/laur.rnarvaez
// Get Assessment Proctoring Configurations Plus User Settings
router.get(
  '/getProctoringConfigurations/:course_id/:assessment_id/:institution_id/:user_id',
  function (req, res) {
    var courseId = req.params.course_id
    var assessmentId = req.params.assessment_id
    var institutionId = req.params.institution_id
    var userId = req.params.user_id

    // "personId":"3a1bc65b-4344-4600-8946-14113274c4a5"

    // var configs = {"minutesPerPhoto":0.16666666666666666,"millisecondsPerPhoto":10000,"index":6,"assessmentMinute":7,"userId":"laur.rnarvaez","personId":"","assessmentId":"_8018_1","courseId":"_8957_1","contentId":"_279223_1"};
    // res.send(configs);

    var configs = {
      minutesPerPhoto: 0,
      millisecondsPerPhoto: 0,
      index: 0,
      assessmentMinute: 0,
      userId: null,
      personId: null,
      numFaces: 0,
      assessmentId: null,
      courseId: null,
      contentId: null,
      institutionId: null,
      isProctored: false
    }

    configs.userId = userId
    configs.courseId = courseId
    configs.assessmentId = assessmentId
    configs.institutionId = institutionId

    jarvisDbAPI
      .isAssessmentProctored(courseId, assessmentId, institutionId, db)
      .then(result => {
        console.log('isAssessmentProctored: ' + result.isProctored)

        if (!result.isProctored) {
          configs.isProctored = result.isProctored

          res.send(configs)
        } else {
          configs.isProctored = result.isProctored
          configs.minutesPerPhoto = result.minutes
          // configs.minutesPerPhoto = 0.16666666666666666666666666666667; // 10seconds;
          configs.minutesPerPhoto = 0.5
          configs.millisecondsPerPhoto = configs.minutesPerPhoto * 60 * 1000

          jarvisDbAPI
            .getUser(userId, institutionId, db)
            .then(result => {
              console.log('hasPersonId:' + (result != null))

              if (result != null) {
                configs.personId = result.faceAPI_id
                configs.numFaces = result.num_faces

                res.send(configs)
              } else {
                var faceAPIKey = apiConfig.faceAPIKey
                var groupId = 'group1'

                jarvisAppAPI
                  .createPerson(faceAPIKey, userId, 'group1')
                  .then(personId => {
                    console.log('create Person: ' + personId)

                    configs.personId = personId
                    configs.numFaces = 0

                    res.send(configs)

                    var user = {
                      user_id: userId,
                      faceAPI_id: personId,
                      user_email: '',
                      institution_id: institutionId,
                      num_faces: 0
                    }

                    jarvisDbAPI
                      .storeUser(user, db)
                      .then(result => {
                        console.log('store Person: ' + result)
                      })
                      .catch(err => console.log(err))
                  })
                  .catch(err => console.log(err))
              }
            })
            .catch(err => console.log(err))
        }
      })
      .catch(err => console.log(err))
  }
)

// Receives a Blob (user Face) and persists it using Azures Face API and a person Id
router.post('/persistUserFace', function (req, res, next) {
  try {
    var personId = req.headers.person_id
    var institutionId = req.headers.institution_id
    var numFaces = req.headers.num_faces

    var buf = new Buffer(req.body.blob, 'base64') // decode
    var faceAPIKey = apiConfig.faceAPIKey

    var userId = req.headers.user_id

    console.log('numFaces', numFaces)
    var user = {
      user_id: userId,
      faceAPI_id: personId,
      user_email: '',
      institution_id: institutionId,
      num_faces: 1
    }
    if (numFaces == 4) {
      jarvisDbAPI
        .storeUser(user, db)
        .then(result => {
          console.log('store Person: ' + result)
        })
        .catch(err => console.log(err))
    } else {
      console.log(`Missing ${4 - numFaces} profile images`)
    }
    jarvisAppAPI
      .persistUserFace(personId, 'group1', buf, faceAPIKey)
      .then(isSuccess => {
        res.send(isSuccess)

        // if (isSuccess && numFaces == 0) {
        //   console.log('updating user face status')

        //   var user = {
        //     user_id: userId,
        //     faceAPI_id: personId,
        //     user_email: '',
        //     institution_id: institutionId,
        //     num_faces: 1
        //   }
        // }
      })
      .catch(error => res.send(error))
  } catch (err) {
    errorlog.error('Exception when receiving blob')
    errorlog.error(err)
    res.send(err)
  }
})

// Store Assessment
router.post('/storeAssessment', function (req, res) {
  var assessment = req.body

  jarvisDbAPI
    .storeAssessment(assessment, db)
    .then(result => {
      console.log(result)
      res.send(result)
    })
    .catch(err => console.log(err))
})

// Delete Assessment
router.post('/deleteAssessment', function (req, res) {
  var assessment = req.body

  jarvisDbAPI
    .deleteAssessment(assessment, db)
    .then(result => {
      console.log(result)
      res.send(result)
    })
    .catch(err => console.log(err))
})

router.get('/home', (req, res) => {
  res.render('home')
})
// ---------------------------------------------------------------------

/*
//verify and analyze at the same time

var doneVerifying = false;
    var doneAnalyzing = false;

    jarvisAppAPI.verifyPicture(faceAPIKey,personId,buf)
    .then(result => {

      proctoring.verify = result;
    })
    .catch(err => console.log(err))
    .then(() => {

      doneVerifying = true;
    });

    jarvisAppAPI.analyzePicture(computerVisionKey,buf)
    .then(result => {

      proctoring.analyze = result;
    })
    .catch(err => console.log(err))
    .then(() => {

      doneAnalyzing = true;
    });

    var proctoringInterval = setInterval(function(){

      if(doneVerifying && doneAnalyzing){

        clearInterval(proctoringInterval);

        console.log(JSON.stringify(proctoring));
        res.send(proctoring);
        console.log("-------------------- Finished All --------------------");
      }
    },500);

*/

module.exports = router
