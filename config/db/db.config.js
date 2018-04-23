var config = {
  prod: {
    username: 'incubation-cosmos-prod',
    password:
      'm8ETQKPovI7Rm0UGzCXdcQgblvBz5geGxcNM8ANyS3ARdyisjZpT0NA6Km2p5pLvQoSQI8RnLJKQo8hcIRRvJw==',
    host: 'incubation-cosmos-prod.documents.azure.com',
    port: '10255',
    db: 'jarvis',
  },
  dev: {
    username: 'incubation-cosmos-dev',
    password:
      'IPaF00xYzuPZSTRg0RaaY69UzTUJIv9XVwzHsbge0LIclU9eqKVEEaAkvkmm2zLwouZ1sB6DVKXITK54xBXxVQ==',
    host: 'incubation-cosmos-dev.documents.azure.com',
    port: '10255',
    db: 'jarvis',
  },
  staging: {
    username: 'incubation-cosmos-staging',
    password:
      '4gqE8pCxblyBKdltYgmNlwkaJ0CKyDNI6VPQJMlssg6puOQcGqTvrxrcrQgLa8U3IKjxMaLNogEZWHeVukJYLw==',
    host: 'incubation-cosmos-staging.documents.azure.com',
    port: '10255',
    db: 'jarvis',
  },
  localhost: {
    username: 'localhost',
    password:
      'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
    host: 'localhost',
    port: '10255',
    db: 'jarvis',
  },
};

var url_dev = `mongodb://${config.dev.username}:${config.dev.password}@${
  config.dev.host
}:${config.dev.port}/${config.dev.db}?ssl=true`;
var url_staging = `mongodb://${config.staging.username}:${
  config.staging.password
}@${config.staging.host}:${config.staging.port}/${
  config.staging.db
}?ssl=true&replicaSet=globaldb`;
var url_prod = `mongodb://${config.prod.username}:${config.prod.password}@${
  config.prod.host
}:${config.prod.port}/${config.prod.db}?ssl=true&replicaSet=globaldb`;
var url_localhost = `mongodb://${config.localhost.username}:${
  config.localhost.password
}@${config.localhost.host}:${config.localhost.port}/${
  config.localhost.db
}?ssl=true&replicaSet=globaldb`;

var conn_strings = {
  url_dev,
  url_staging,
  url_prod,
  url_localhost,
};

module.exports = conn_strings;
