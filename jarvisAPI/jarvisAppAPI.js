var request = require('request-promise')
var logger = require('../logger')
var errorlog = logger.errorlog
var successlog = logger.successlog

module.exports.proctoring = function () {
  ;(this.index = -1), (this.user_id = null), (this.person_id = null), (this.assessment_id = null), (this.course_id = null), (this.content_id = null), (this.timestamp = null), (this.assessment_minute = -1), (this.warnings = [
  ]), (this.alerts = []), (this.analyze = {
    // warnings are more severe then alerts, a warning can be no face detected or failed authentication //alerts are based on computer vision analisis (Phone,Book Detected)
    analyzed: false,
    tags: [],
    caption: null,
    confidence: -1
  }), (this.verify = {
    verified: false,
    authenticated: false,
    num_faces: -1,
    confidence_level: -1
  }), (this.img = null)
}

module.exports.verifyPicture = function (faceAPIKey, personId, buf) {
  return new Promise((resolve, reject) => {
    var verify = {
      verified: false,
      authenticated: false,
      num_faces: 0,
      confidence_level: 0
    }

    let detectFaceUrl =
      'https://eastus.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true'

    var options = {
      url: detectFaceUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': faceAPIKey
      },
      body: buf
    }

    console.log('detecting....')
    request(options)
      .then(response => JSON.parse(response))
      .then(data => {
        console.log('image detected, ready to verify')

        verify.verified = true

        console.log(data)
        console.log(data.length)

        if (data.length > 0) {
          verify.num_faces = data.length

          var index = 0
          var lastIndex = -1
          var maxLength = data.length

          var facesInterval = setInterval(function () {
            if (index < maxLength) {
              if (lastIndex != index) {
                lastIndex = index

                let faceObj = data[index]
                let faceId = faceObj.faceId

                let verifyUrl =
                  'https://eastus.api.cognitive.microsoft.com/face/v1.0/verify'

                let bodyData = {
                  faceId: faceId,
                  personId: personId,
                  personGroupId: 'group1'
                }

                console.log('verifying')

                options = {
                  url: verifyUrl,
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Ocp-Apim-Subscription-Key': faceAPIKey
                  },
                  body: JSON.stringify(bodyData)
                }

                request(options)
                  .then(response => JSON.parse(response))
                  .then(data => {
                    // document.getElementById("canvasDiv").style.display = 'none';
                    // document.getElementById("videoDiv").style.display = 'none';
                    // console.log(data);
                    console.log('FACE ID:' + faceId)
                    if (Object.keys(data).length !== 0) {
                      verify.confidence_level = data.confidence

                      if (data.isIdentical == true && data.confidence > 0.5) {
                        // camera.pause();
                        // camera.src = "";
                        console.log('Authenticated!!!')
                        verify.authenticated = true
                        // skipping all other faces since we already have a successful validation
                        index = maxLength
                      } else {
                        console.log('Fail Authentication!!')
                      }
                    } else {
                      console.log('No face detected')
                    }
                  })
                  .catch(err => {
                    console.log(err)
                  })
                  .then(() => {
                    console.log(
                      'finished verifying face num ' + (lastIndex + 1) + '\n'
                    )
                    index++
                  })
              }
            } else {
              clearInterval(facesInterval)
              resolve(verify)
              console.log('\nFinished verifying all faces')
            }
          }, 500)
        } else {
          resolve(verify)
          console.log('\nface not detected')
        }
      })
      .catch(err => {
        console.log(err)
        reject(err)
      })
  })
}

module.exports.getWarningsFromVerification = function (verify) {
  var warnings = []
  var alerts = []

  var comments = []

  if (!verify.verified) {
    warnings.push('Error de verificación')
  }

  if (!verify.authenticated) {
    warnings.push('Autenticación fallida')
  }

  if (parseInt(verify.num_faces) > 1) {
    alerts.push('Más de una persona')
  }

  if (parseInt(verify.num_faces) < 1) {
    warnings.push('No se detectó ninguna persona')
  }

  var all = {
    warnings: warnings,
    alerts: alerts
  }

  return all
}

module.exports.analyzePicture = function (computerVisionKey, buf) {
  return new Promise((resolve, reject) => {
    var analyze = {
      analyzed: false,
      tags: [],
      caption: null,
      confidence: null
    }

    console.log('analyzing')

    // var visualFeatures = "ImageType,Faces,Adult,Categories,Color,Tags,Description";
    var visualFeatures = 'Description'

    var analyzeURL =
      'https://eastus.api.cognitive.microsoft.com/vision/v1.0/analyze?language=en&'

    analyzeURL += 'visualFeatures=' + visualFeatures

    var options = {
      url: analyzeURL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': computerVisionKey
      },
      body: buf
    }

    request(options)
      .then(response => JSON.parse(response))
      .then(data => {
        // console.log(data)
        analyze.analyzed = true

        var captions = data.description.captions[0].text
        var confidence = data.description.captions[0].confidence

        analyze.caption = captions
        analyze.confidence = confidence

        console.log('\n\n')
        console.log('Caption: ' + captions)
        console.log('Confidence: ' + confidence)
        console.log('\n')

        var tags = 'Tags\n\n'

        data.description.tags.forEach(function (e) {
          tags += '\t-' + e + '\n'
          analyze.tags.push(e)
        })

        console.log(tags)
        // spanPicInfo

        resolve(analyze)
      })
      .catch(err => {
        console.log(err)
        reject(err)
      })
  })
}

module.exports.getWarningsFromAnalysis = function (analyze) {
  var warnings = []
  var alerts = []

  var comments = []

  // Some tags computer vision return (not sure if valuable to trigger warnings)
  /* holding
  using
  looking */

  var phone = [
    'phone',
    'telephone',
    'smartphone',
    'cellphone',
    'mobile phone',
    'mobile',
    'cell phone',
    'car phone',
    'radio-telephone',
    'cordless phone',
    'videophone',
    'speakerphone'
  ]
  var book = [
    'reading',
    'printed work',
    'publication',
    'novel',
    'storybook',
    'manual',
    'handbook',
    'paperback',
    'hardback',
    'softback',
    'notepad',
    'notebook',
    'pad',
    'memo pad',
    'binder',
    'ledger',
    'log',
    'logbook',
    'chronicle',
    'journal',
    'diary'
  ]

  var tags = analyze.tags

  var phoneDetected = false
  var bookDetected = false

  var tag

  for (var i = 0; i < tags.length; i++) {
    tag = tags[i]

    if (!phoneDetected) {
      if (phone.indexOf(tag) != -1) {
        phoneDetected = true
        // alerts.push('Teléfono detectado');
        // comments.push('Teléfono detectado');
      }
    }
    if (!bookDetected) {
      if (book.indexOf(tag) != -1) {
        bookDetected = true
        // alerts.push('Libro detectado');
        // comments.push('Libro detectado');
      }
    }

    if (bookDetected && phoneDetected) {
      break
    }
  }

  var all = {
    warnings: warnings,
    alerts: alerts
  }

  return all
}

module.exports.createPerson = function (faceAPIKey, userId, groupId) {
  return new Promise((resolve, reject) => {
    let personGroupId2 = groupId
    let personName = userId
    let description = ''

    let personUrl =
      'https://eastus.api.cognitive.microsoft.com/face/v1.0/persongroups/{personGroupId}/persons'

    personUrl = personUrl.replace('{personGroupId}', personGroupId2)
    let data = {
      name: personName,
      userData: description
    }

    var options = {
      url: personUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': faceAPIKey
      },
      body: JSON.stringify(data)
    }

    var personId = null

    request(options)
      .then(function (parsedBody) {
        personId = JSON.parse(parsedBody).personId

        // console.log("personId: " + personId);
        resolve(personId)
      })
      .catch(function (err) {
        console.log(err)
        reject(err)
      })
  })
}

module.exports.persistUserFace = function (personId, groupId, blob, faceAPIKey) {
  console.log('Persisting User Face')

  return new Promise((resolve, reject) => {
    let personGroupId2 = groupId

    let saveFaceUrl =
      'https://eastus.api.cognitive.microsoft.com/face/v1.0/persongroups/{personGroupId}/persons/{personId}/persistedFaces'

    saveFaceUrl = saveFaceUrl
      .replace('{personGroupId}', personGroupId2)
      .replace('{personId}', personId)

    var options = {
      url: saveFaceUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': faceAPIKey
      },
      body: blob
    }

    request(options)
      .then(response => JSON.parse(response))
      .then(response => {
        console.log('Face Persist response: ' + JSON.stringify(response))

        if (response.persistedFaceId != null) {
          console.log('Face Saved Successfully')
          resolve(true)
        } else {
          resolve(false)
        }
      })
      .catch(err => {
        console.log('Exception at Save Face: ' + err)
        reject(false)
      })
  })
}

/*
module.exports.loadConfigByInstitution = function(institutionId, db) {
    return new Promise((resolve, reject) => {
      db
        .collection('config')
        .findOne({ institutionId: institutionId }, function(
          err,
          result
        ) {
          if (err) {
            reject(err);
          } else if (result === null) {
            var response = {
              response: `No configuration found for => ${institutionId}`,
            };
            reject(response);
          } else {
            resolve(result); //result from querying mongo
          }
        });
    });
  };

module.exports.loadTemplate = function(config){
  return config.eventTemplate;
}

module.exports.loadSettingArray = function(institution_id, array_user_id, db) {
  var result_array = [];
  return new Promise((resolve, reject) => {
    var cursor = db.collection('user_settings').find({
      institution_id: institution_id,
      'user.user_id': { $in: array_user_id },
    });
    cursor.forEach(
      function(doc, err) {
        result_array.push(doc);
      },
      function() {
        resolve(result_array);
      }
    );
  });
};

module.exports.loadSettingById = function(user_id, db) {
  //var user_settings = {};
  return new Promise((resolve, reject) => {
    db
      .collection('user_settings')
      .findOne({ 'user.user_id': user_id }, function(err, result) {
        if (err) {
          reject(err);
        }
        if (result === null) {
          reject(null);
        }
        resolve(result); //result from querying mongo
      });
  });
};

module.exports.loadSettingByInstitution = function(
  institution_id,
  user_id,
  db
) {
  //var user_settings = {};
  return new Promise((resolve, reject) => {
    db
      .collection('user_settings')
      .findOne(
        { institution_id: institution_id, 'user.user_id': user_id },
        function(err, result) {
          if (err) {
            reject(err);
          }
          if (result === null) {
            reject('User Not found');
          }
          resolve(result); //result from querying mongo
        }
      );
  });
};

module.exports.storeUserSettings = function(settings, db) {
  return new Promise((resolve, reject) => {
    db.collection('user_settings').updateMany({
      'user.user_id': settings.user.user_id,
    },
    {
      $set: {
        'user.username': settings.user.username,
        'user.firstname': settings.user.firstname,
        'user.lastname': settings.user.lastname,
        'email.email': settings.email.email,
        'email.email_enable': settings.email.email_enable,
        'sms.sms_number': settings.sms.sms_number,
        'sms.sms_enable': settings.sms.sms_enable,
        'messenger.messenger_enable': settings.messenger.messenger_enable,
        institution_id: settings.institution_id,
      },
    },
    { upsert: true },
    function(err, result) {
      if (err) {
        reject(err);
      }
      resolve(`Stored Settings.\n${result}`);
    });
  });
};

//Store Events
module.exports.storeEvent = function(event, db) {
    return new Promise((resolve, reject) => {
      db.collection("events").insertOne(event, function(err, result) {
        if (err) {
          reject(`Error:\n${err}`);
        }
        resolve(`Event stored.${result}`);
      });
    });
  } */
