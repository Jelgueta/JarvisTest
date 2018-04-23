/* //Returns all search terms in the collection
router.get("/search_term", function (req, res) {
  var search_terms = {};
  var result = db
    .collection("search_term")
    .find({})
    .toArray((err, result) => {
      if (err) {
        res.send(err).status(500);
      } else {
        search_terms = result;
        console.log(search_terms);
        res.send(search_terms).status(200);
      }
    });
}); */

// Returns all documents in the collection
module.exports.selectAll = function (db) {
  return new Promise((resolve, reject) => {
    db.collection('proctoring').find({}).toArray((err, result) => {
      if (err) {
        reject(err)
      } else if (result === null) {
        var response = {
          response: 'collection is empty'
        }
        reject(response)
      } else {
        resolve(result) // result from querying mongo
      }
    })
  })
}

// db.inventory.deleteMany({})

// Deletes all documents in the collection
module.exports.deleteAll = function (db) {
  return new Promise((resolve, reject) => {
    db.collection('proctoring').deleteMany({}, function (err, result) {
      if (err) {
        reject(err)
      } else if (result === null) {
        var response = {
          response: 'collection is empty'
        }
        reject(response)
      } else {
        resolve(result) // result from querying mongo
      }
    })
  })
}

// Delete all attempt from user in the collection
module.exports.deleteAllAttempts = function (db, userId) {
  return new Promise((resolve, reject) => {
    db
      .collection('proctoring')
      .remove({
        user_id: userId
      })
      .then(result => result.result)
      .then(result => {
        console.log(result)

        if (result.ok == 1) {
          console.log('Number of records deleted: ' + result.n)
          resolve('Number of records deleted: ' + result.n)
        } else {
          console.log('There was an error deleting the attempts')
          reject('Error deleting attempts')
        }
      })
  })
}

// Store Proctoring
module.exports.storeProctoring = function (proctoring, db) {
  return new Promise((resolve, reject) => {
    db.collection('proctoring').insertOne(proctoring, function (err, result) {
      if (err) {
        reject(`Error:\n${err}`)
      }
      resolve(`Proctoring stored.${result}`)
    })
  })
}

// Store User
module.exports.storeUser = function (user, db) {
  console.log('storing new user')

  var query = JSON.parse(JSON.stringify(user))
  delete query.faceAPI_id
  delete query.user_email
  delete query.num_faces
  // remove minutes from the query to fix where condition

  return new Promise((resolve, reject) => {
    db.collection('users').update(query, user, {
      // query(search whole document) //new document (replace whole document with new json)
      upsert: true // create document if not exists
    }, function (err, result) {
      if (err) {
        reject(err)
      }
      resolve(result)
    })
  })
}

// get User
module.exports.getUser = function (userId, institutionId, db) {
  console.log('getting user')

  return new Promise((resolve, reject) => {
    db.collection('users').findOne({
      user_id: userId,
      institution_id: institutionId
    }, {
      faceAPI_id: 1,
      num_faces: 1
    }, function (err, result) {
      resolve(result)
    })
  })
}

// Store Assessment
module.exports.storeAssessment = function (assessment, db) {
  console.log('storing new assessment')

  var query = JSON.parse(JSON.stringify(assessment))
  delete query.minutes
  delete query.assessment_name
  // remove minutes from the query to fix where condition

  return new Promise((resolve, reject) => {
    db.collection('assessments').update(query, assessment, {
      // query(search whole document) //new document (replace whole document with new json)
      upsert: true // create document if not exists
    }, function (err, result) {
      if (err) {
        reject(err)
      }
      resolve(result)
    })
  })
}

// Delete assessment
module.exports.deleteAssessment = function (assessment, db) {
  console.log('deleting assessment')

  var query = JSON.parse(JSON.stringify(assessment))
  delete query.minutes
  delete query.assessment_name

  return new Promise((resolve, reject) => {
    db
      .collection('assessments')
      .remove(query, {
        justOne: true
      })
      .then(result => result.result)
      .then(result => {
        resolve(result)
      })
  })
}

// return assessment proctored status
module.exports.isAssessmentProctored = function (
  courseId,
  assessmentId,
  institutionId,
  db
) {
  return new Promise((resolve, reject) => {
    db.collection('assessments').findOne({
      course_id: courseId,
      assessment_id: assessmentId,
      institution_id: institutionId
    }, {
      minutes: 1
    }, function (err, result) {
      if (result == null) {
        result = {
          isProctored: false
        }
      } else {
        result.isProctored = true
      }

      resolve(result)
    })
  })
}

// detailed report per student
module.exports.detailedReport = function (params, db) {
  return new Promise((resolve, reject) => {
    let perPage = 15

    let page = params.page ? params.page : 1
    let value = perPage * page - perPage
    let pagination

    db
      .collection('proctoring')
      .find(
      {
        course_id: params.courseId,
        assessment_id: params.assessmentId,
        user_id: params.userId
      },
      {
        index: 1,
        timestamp: 1,
        assessment_minute: 1,
        warnings: 1,
        alerts: 1,
        img: 1,
        verify: 1
      }
      )
      .skip(perPage * page - perPage)
      .limit(perPage)
      .toArray((err, result) => {
        if (err) {
          reject(err)
        } else if (result === null) {
          var response = {
            response: 'collection is empty'
          }

          reject(response)
        } else {
          let proctoring = db.collection('proctoring').count({
            course_id: params.courseId,
            assessment_id: params.assessmentId,
            user_id: params.userId
          })

          proctoring.then(proctoringCount => {
            console.log('proctoringCount', proctoringCount)
            // if (proctoringCount == 0) {
            //   proctoringCount = 1;
            // }
            pagination = {
              pagination: {
                currentPage: page,
                pages: Math.ceil(proctoringCount / perPage)
              }
            }
            result.push(pagination)

            resolve(result) // result from querying mongo
          })
        }
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
