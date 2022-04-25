var express = require('express');
var router = express.Router();

const enigma = require('enigma.js');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const https = require('https');

// log to file
const util = require('util');
var logFile = fs.createWriteStream('log.txt', { flags: 'a' });
var logStdout = process.stdout;

console.log = function () {
  logFile.write(util.format.apply(null, arguments) + '\r\n');
  logStdout.write(util.format.apply(null, arguments) + '\r\n');
}
console.error = console.log;

const schema = require('enigma.js/schemas/12.20.0.json');

const secure = true;

// Your Sense Enterprise installation hostname:
const engineHost = 'qmi-qs-54cc';

// Make sure the port below is accessible from the machine where this example
// is executed. If you changed the QIX Engine port in your installation, change this:
const enginePort = 4747;

// 'engineData' is a special "app id" that indicates you only want to use the global
// QIX interface or session apps, change this to an existing app guid if you intend
// to open that app:
const cyberApp = '676ba7b1-2edc-4452-86d8-2a3df9ef381a';
const appId = 'engineData';

// The Sense Enterprise-configured user directory for the user you want to identify
// as:
const userDirectory = 'internal';
// const userDirectory = 'qmi-qs-54cc';

// The user to use when creating the session:
const userId = 'sa_repository';
// const userId = 'qmi';

// Path to a local folder containing the Sense Enterprise exported certificates:
const certificatesPath = '../qlik_certs/';

// Helper function to read the contents of the certificate files:
const readCert = (filename) => fs.readFileSync(path.resolve(__dirname, certificatesPath, filename));



/* GET home page. */
router.get('/', function(req, res, next) {
  // req will hold the field and variable parameter you'll pass to the app for the user
  userData = {
    industry: "Education",
    revenue: 999
  }

  // create the session
  const session = enigma.create({
    schema,
    url: `wss://${engineHost}:${enginePort}/app/${appId}`,
    // Notice the non-standard second parameter here, this is how you pass in
    // additional configuration to the 'ws' npm library, if you use a different
    // library you may configure this differently:
    createSocket: (url) => new WebSocket(url, {
      ca: [readCert('root.pem')],
      key: readCert('client_key.pem'),
      cert: readCert('client.pem'),
      headers: {
        'X-Qlik-User': `UserDirectory=${encodeURIComponent(userDirectory)}; UserId=${encodeURIComponent(userId)}`,
      },
    }),
  });

  // open the session
  session.open().then((global) => {
    console.log('Session was opened successfully');
    // non relevant example code
    // return global.getDocList().then((list) => {
    //   const apps = list.map((app) => `${app.qDocId} (${app.qTitle || 'No title'})`).join(', ');
    //   console.log(`Apps on this Engine that the configured user can open: ${apps}`);
    //   session.close();
    // });

    // open the cyber app
    global.openDoc(cyberApp).then((app) => {
      console.log(`Opened app ${app.id}`);
      console.log(app);

      // get field 
      app.getField({
        "qFieldName": "Industry"
      }).then((f) => {
        console.log('field is:');
        console.log(f);
        // and apply selections to it 
        f.selectValues({
          "qFieldValues": [
            {
              "qIsNumeric": false,
              "qText": userData.industry
            }
          ]
        });
        // can I see if field has changed?

        // get 'vQRevenue' variable
        app.getVariableByName({
          "qName": "vQRevenue"
        }).then((v) => {
          // Apply value to a variable
          v.setNumValue({
            "qVal": userData.reveneue
          });
          v.getLayout().then(response => console.log(response));


          // get object with an ID 'RxUXtK' ('Actions Causing Cyber Incidents Since 2009')
          app.getObject({
            "qId": "RxUXtK"
          }).then(o => {
            console.log("got object");
            console.log(o)});
            
            // get image of an object, using the printing service?
            // 1. prep the image


                // example: POST https://qmi-qs-54cc/jwt/printing/export/object/image?requestId=9bac5664-5bed-422f-8ea1-293a7faf1d01
                // we have https included (line 9)
                // payload example: 
                  // const payload = {
                  //   "appId": cyberApp,
                  //   "imageType": "Png",
                  //   "captureSize": {
                  //       "width": 600,
                  //       "height": 600,
                  //       "dpi": 96
                  //   },
                  //   "objTree": {
                  //     "id": "RxUXtK",
                  //     "type": "piechart",
                  //     "snapshotData": "...",
                  //     "area": {
                  //       "left": 0,
                  //       "top": 0,
                  //       "width": 1,
                  //       "height": 1
                  //     },
                  //     "children": [],
                  //     "isExtension": false,
                  //     "title": "Actions Causing Cyber Incidents Since 2009"
                  //   },
                  // "localeInfo": {...},
                  // "themeName": "sense"
                  // };

              // 2. get the image
              // then GET https://qmi-qs-54cc/jwt/printing/export/object/image?requestId=9bac5664-5bed-422f-8ea1-293a7faf1d01




        });
      })

       
    })






  }).catch((error) => {
    console.log('Failed to open session and/or retrieve the app list:', error);
    process.exit(1);
  });
  
});

module.exports = router;
