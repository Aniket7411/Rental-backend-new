[INFO] Email:null duplicate error for phone 7275061192, finding user by phone...
[WARN] Email:null duplicate but user not found. Using upsert to create user for phone 7275061192
Upsert also failed, user still not found: MongoServerError: Updating the path 'name' would create a conflict at 'name'       
    at Connection.sendCommand (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\cmap\connection.js:306:27)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async Connection.command (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\cmap\connection.js:334:26)
    at async Server.command (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\sdam\server.js:194:29)
    at async tryOperation (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\operations\execute_operation.js:213:32)   
    at async executeOperation (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\operations\execute_operation.js:78:16)
    at async Collection.findOneAndUpdate (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\collection.js:544:16)      
    at async model.Query._findOneAndUpdate (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongoose\lib\query.js:3536:13)       
    at async model.Query.exec (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongoose\lib\query.js:4627:63)
    at async exports.verifySignupOTP (C:\Users\Naman\Desktop\rnt\acb\controllers\authController.js:794:18) {
  errorLabelSet: Set(0) {},
  errorResponse: {
    ok: 0,
    errmsg: "Updating the path 'name' would create a conflict at 'name'",
    code: 40,
    codeName: 'ConflictingUpdateOperators',
    '$clusterTime': {
      clusterTime: new Timestamp({ t: 1768383451, i: 3 }),
      signature: [Object]
    },
    operationTime: new Timestamp({ t: 1768383451, i: 3 })
  },
  ok: 0,
  code: 40,
  codeName: 'ConflictingUpdateOperators',
  '$clusterTime': {
    clusterTime: new Timestamp({ t: 1768383451, i: 3 }),
    signature: {
      hash: Binary.createFromBase64('sOZ6t4HVOcUwpbcWqlwI4qbObbc=', 0),
      keyId: new Long('7542608650821435394')
    }
  },
  operationTime: new Timestamp({ t: 1768383451, i: 3 })
}
[INFO] User not found, creating with minimal data for phone 7275061192
All user creation attempts failed: MongoServerError: Plan executor error during findAndModify :: caused by :: E11000 duplicate key error 
collection: test.users index: email_1 dup key: { email: null }
    at Connection.sendCommand (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\cmap\connection.js:306:27)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async Connection.command (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\cmap\connection.js:334:26)
    at async Server.command (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\sdam\server.js:194:29)
    at async tryOperation (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\operations\execute_operation.js:213:32)
    at async executeOperation (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\operations\execute_operation.js:78:16)
    at async Collection.findOneAndUpdate (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\collection.js:544:16)
    at async model.Query._findOneAndUpdate (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongoose\lib\query.js:3536:13)
    at async model.Query.exec (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongoose\lib\query.js:4627:63)
    at async exports.verifySignupOTP (C:\Users\Naman\Desktop\rnt\acb\controllers\authController.js:996:29) {
  errorLabelSet: Set(0) {},
  errorResponse: {
    ok: 0,
    errmsg: 'Plan executor error during findAndModify :: caused by :: E11000 duplicate key error collection: test.users index: email_1 dup key: { email: null }',
    code: 11000,
    codeName: 'DuplicateKey',
    keyPattern: { email: 1 },
    keyValue: { email: null },
    '$clusterTime': {
      clusterTime: new Timestamp({ t: 1768383451, i: 3 }),
      signature: [Object]
    },
    operationTime: new Timestamp({ t: 1768383451, i: 3 })
  },
  ok: 0,
  code: 11000,
  codeName: 'DuplicateKey',
  keyPattern: { email: 1 },
  keyValue: { email: null },
  '$clusterTime': {
    clusterTime: new Timestamp({ t: 1768383451, i: 3 }),
    signature: {
      hash: Binary.createFromBase64('sOZ6t4HVOcUwpbcWqlwI4qbObbc=', 0),
      keyId: new Long('7542608650821435394')
    }
  },
  operationTime: new Timestamp({ t: 1768383451, i: 3 })
}
Error in verifySignupOTP: MongoServerError: Plan executor error during findAndModify :: caused by :: E11000 duplicate key error collection: test.users index: email_1 dup key: { email: null }
    at Connection.sendCommand (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\cmap\connection.js:306:27)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async Connection.command (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\cmap\connection.js:334:26)
    at async Server.command (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\sdam\server.js:194:29)
    at async tryOperation (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\operations\execute_operation.js:213:32)
    at async executeOperation (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\operations\execute_operation.js:78:16)
    at async Collection.findOneAndUpdate (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongodb\lib\collection.js:544:16)
    at async model.Query._findOneAndUpdate (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongoose\lib\query.js:3536:13)
    at async model.Query.exec (C:\Users\Naman\Desktop\rnt\acb\node_modules\mongoose\lib\query.js:4627:63)
    at async exports.verifySignupOTP (C:\Users\Naman\Desktop\rnt\acb\controllers\authController.js:699:14) {
  errorLabelSet: Set(0) {},
  errorResponse: {
    ok: 0,
    errmsg: 'Plan executor error during findAndModify :: caused by :: E11000 duplicate key error collection: test.users index: email_1 dup key: { email: null }',
    code: 11000,
    codeName: 'DuplicateKey',
    keyPattern: { email: 1 },
    keyValue: { email: null },
    '$clusterTime': {
      clusterTime: new Timestamp({ t: 1768383451, i: 2 }),
      signature: [Object]
    },
    operationTime: new Timestamp({ t: 1768383451, i: 2 })
  },
  ok: 0,
  code: 11000,
  codeName: 'DuplicateKey',
  keyPattern: { email: 1 },
  keyValue: { email: null },
  '$clusterTime': {
    clusterTime: new Timestamp({ t: 1768383451, i: 2 }),
    signature: {
      hash: Binary.createFromBase64('sOZ6t4HVOcUwpbcWqlwI4qbObbc=', 0),
      keyId: new Long('7542608650821435394')
    }
  },
  operationTime: new Timestamp({ t: 1768383451, i: 2 })
}
Error details: {
  code: 11000,
  message: 'Plan executor error during findAndModify :: caused by :: E11000 duplicate key error collection: test.users index: email_1 dup key: { email: null }',
  phoneDigits: '7275061192',
  phone: '+91 7275061192'
}
 