const crypto = require('crypto')

let storage = require('azure-storage')

let connectionString =
  'DefaultEndpointsProtocol=https;AccountName=lmsblobstorage;AccountKey=Oh37+OJ+kQBj4y5fLzkb9rbsSzi8LOEfW3JW+fgqMsSe+PCIeMNdP3pIzV9z5hq4FwHDTk62xbWK9hGCoZ7orw==;EndpointSuffix=core.windows.net'
let blobService = storage.createBlobService(connectionString)

const containerName = 'jarvisimages'
const containerUrl =
  'https://lmsblobstorage.blob.core.windows.net/jarvisimages/'

const generateRamdomString = imageInfo => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(16, (err, buf) => {
      if (err) {
        return reject(err)
      }
      const filename = buf.toString('hex') + '_' + imageInfo
      resolve(filename)
    })
  })
}

module.exports.upload = function (blob, imageInfo, courseId) {
  return new Promise((resolve, reject) => {
    generateRamdomString(imageInfo)
      .then(fileName => {
        blobService.createBlockBlobFromText(
          containerName,
          courseId + '/' + fileName + '.jpg',
          blob,
          { contentType: 'image/jpeg' },
          err => {
            err ? reject(err) : resolve(fileName)
          }
        )
      })
      .catch(err => reject(err))
  })
}
