# helloQlik
Connects to Qlik Sense server, from an Express.js server, using enigma.js. Using Qlik Engine APIs to open app, get fields, variables and objects.

First time setup
1. Clone project
2. Run `npm install`
3. Run `npm start`

1. Express.js
2. Enigma.js - A library to make a concnection to Qlik Sense engine
  * Authentication using cerificates. You can also use JWT or ticket authentication. See runnable examples here: LINK
3. Qlik Engine API
  * openDoc
  * getField
  * getLayout
  * getObject
  * getVariableByName
4. Printing API - not documented, recreated the way it is done under the 'exportImg' capability API method
  * GetEffectiveProperties
  * POST to QSSERVER/VP/printing/export/image?requestId=xxx-yyy-zzz-123-456
  * Check image status with GET from QSSERVER/VP/printing/export/image?requestId=xxx-yyy-zzz-123-456
  * Once status is 'Completed', use callback url to download image