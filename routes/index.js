var express = require('express');
var router = express.Router();
const axios = require('axios');

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

// add certs to later axios requests
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  ca: [readCert('root.pem')],
  key: readCert('client_key.pem'),
  cert: readCert('client.pem')
});

async function downloadFile(fileUrl, outputLocationPath) {
  const writer = fs.createWriteStream(outputLocationPath);

  return axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
    headers: {'X-Requested-With': 'XMLHttpRequest'},
    httpsAgent: httpsAgent
  }).then(response => {

    //ensure that the user can call `then()` only when the file has
    //been downloaded entirely.

    console.log('download: ', response);

    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      let error = null;
      writer.on('error', err => {
        error = err;
        writer.close();
        reject(err);
      });
      writer.on('close', () => {
        if (!error) {
          resolve(true);
        }
        //no need to call the reject here, as it will have been called in the
        //'error' stream;
      });
    });
  });
}

function sleep(length) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, length);
  });
};


/* GET home page. */
router.get('/', function(req, res, next) {
  // req will hold the field and variable parameter you'll pass to the app for the user
  userParams = {
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
              "qText": userParams.industry
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
            "qVal": userParams.reveneue
          });
          v.getLayout().then(layout => console.log(layout));

          
          // get object with an ID 'RxUXtK' ('Actions Causing Cyber Incidents Since 2009')
          app.getObject({
            "qId": "RxUXtK"
          }).then(o => {
            console.log("got object");

            o.getEffectiveProperties().then(props => {
                // QS printing feature is not exposed on the engine level. There is no documented way of printing a chart
                // An attempt to recreate the 'exportPng' capability API method below:
                // 1. get object 'getEffectiveProperties' to pass to printing service
              console.log('props ID is: ', props);
              var payload = {
                "imageType": "Png",
                "captureSize": {
                    "width": 600,
                    "height": 600,
                    "dpi": 96
                },
                "objTree": {
                    "id": props.qInfo.qId,
                    "type": "piechart",
                    "snapshotData": JSON.stringify({
                      "data": props
                    }),
                    "area": {
                      "left": 0,
                      "top": 0,
                      "width": 1,
                      "height": 1
                  },
                  "children": [],
                  "isExtension": false,
                  "title": props.title
                },
                "appName": "Cyber Index",
                "appId": app.id,
                "appStylingInfo": {
                    "sheetLogoPosition": "",
                    "sheetLogoThumbnail": {
                        "qStaticContentUrl": {}
                    },
                    "sheetTitleBgColor": "",
                    "sheetTitleColor": "",
                    "sheetTitleGradientColor": "",
                    "rtl": false
                },
                "localeInfo": {
                    "qDecimalSep": ".",
                    "qThousandSep": ",",
                    "qListSep": ";",
                    "qMoneyDecimalSep": ".",
                    "qMoneyThousandSep": ",",
                    "qCurrentYear": 2019,
                    "qMoneyFmt": "$#,##0.00;-$#,##0.00",
                    "qTimeFmt": "h:mm:ss TT",
                    "qDateFmt": "M/D/YYYY",
                    "qTimestampFmt": "M/D/YYYY h:mm:ss[.fff] TT",
                    "qCalendarStrings": {
                        "qDayNames": [
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                            "Sun"
                        ],
                        "qMonthNames": [
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec"
                        ],
                        "qLongDayNames": [
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                            "Sunday"
                        ],
                        "qLongMonthNames": [
                            "January",
                            "February",
                            "March",
                            "April",
                            "May",
                            "June",
                            "July",
                            "August",
                            "September",
                            "October",
                            "November",
                            "December"
                        ]
                    },
                    "qFirstWeekDay": 6,
                    "qBrokenWeeks": true,
                    "qReferenceDay": 0,
                    "qFirstMonthOfYear": 1,
                    "qCollation": "en-US",
                    "qNumericalAbbreviation": "3:k;6:M;9:G;12:T;15:P;18:E;21:Z;24:Y;-3:m;-6:μ;-9:n;-12:p;-15:f;-18:a;-21:z;-24:y"
                },
                "themeName": "sense"
              };
              
              var axiosPostConfig = {
                baseURL: `https://${engineHost}/`,
                path: `printing/export/object/image`,
                method: `post`,
                headers: {'X-Requested-With': 'XMLHttpRequest'},
                httpsAgent: httpsAgent,
                data: payload,
                params: {
                  requestId: `xxx-yyy-zzz-123-456789`
                }
              };

              console.log('POST with AXIOS');
              
                  // 2. POST to QSSERVER/VP/printing/export/image?requestId=xxx-yyy-zzz-123-456
                    // with payload that includes object props among other things
                    // example in payloadExample.json

              axios(axiosPostConfig)
                .then((res) => {
                    console.log(`Chart POST response Status: ${res.status}`);
                    console.log('Chart POST response Body: ', res.data);
                  
                  var axiosGetConfig = {
                    baseURL: `https://${engineHost}/`,
                    path: `printing/export/object/image`,
                    method: `get`,
                    headers: {'X-Requested-With': 'XMLHttpRequest'},
                    httpsAgent: httpsAgent,
                    params: {
                      requestId: `xxx-yyy-zzz-123-456789`
                    }
                  };
                  // 3. GET from QSSERVER/VP/printing/export/image?requestId=xxx-yyy-zzz-123-456
                  var checkImageStatus = async function() {
                    try {
                      var checkResponse = await axios(axiosGetConfig);
                      console.log('check response', checkResponse);
                      checkResponse = await checkResponse.json();
                      // res.data is undefined right now... expecting something like this:
                          //   {
                          //     "status": "Completed", // "Processing"
                          //     "error": null,
                          //     "qUrl": "../tempcontent/430ed146-4acd-408b-a777-b720fb61f9b6/b1b4b486fc4341f994fe5fa113bd1cc1.png?serverNodeId=2ba72ff6-0c43-4c58-ad9e-7244d5335ca0"
                          //    }
                          // will need to keep making GET requests until res.data.status is "Completed"
                      if(pollResponse.data.status === 'Processing') {
                        await sleep(1000)
                      return checkImageStatus();
                    } else if (pollResponse.data.status === 'Completed') {}
                      // 4. GET image file and save it
                      // downloadFile(`https://${engineHost}/${res.data.qUrl}`, './chart.png');
                          
                    }  catch(err) {
                      // Handle error
                      console.log(err.data);
                    }
                  }
                  checkImageStatus();


                }).catch((err) => {
                  console.error(err);
                });
            });

          });
            
            

        });
      })

       
    })






  }).catch((error) => {
    console.log('Failed to open session and/or retrieve the app list:', error);
    process.exit(1);
  });
  
});

module.exports = router;
