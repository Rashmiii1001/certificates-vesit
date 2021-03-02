const router = require("express").Router();
const storage = require("../storage");
const multer = require("multer");
const papaparse = require("papaparse");
const fs = require("fs");
const dotenv = require("dotenv").config();
const admin = require("./../firebase-admin");
// Handle for Cloud Firsestore
const db = admin.firestore();

let certificates = []; // Initialize JSON array
let fileName;
let errors = [];
let flag = true;
let finalNums = [];
let rowNum = 0;
const uploadUID = async () => {
  finalNums = [];
  rowNum = 0;
  const csv = fs.readFileSync(`./uploads/${fileName}`, "utf-8");
  papaparse.parse(csv, {
    complete: (sheet) => {
      sheets = sheet.data.shift();
      sheets = sheet.data;
    },
  });
  flag = true;
  sheets.pop();
  sheets.forEach(async (c) => {
    rowNum++;
    let currentCerti = {
      email: c[5],
      UID: c[0],
      name: c[3],
      year: 2020,
    };
    if (!(c[5] && c[0] && c[3])) {
      flag = false;
      finalNums.push(rowNum + 1);
    } else if (c[5] == "" || c[0] == "" || c[3] == "") {
      flag = false;
      finalNums.push(rowNum + 1);
    }
    certificates.push(currentCerti);
  });
  if (flag) return certificates;
  return -1;
};

router.get("/", (req, res) => {
  res.render("csv");
});

router.post("/", (req, res) => {
  let uploadCertis = multer({
    storage: storage,
  }).single("csv");

  uploadCertis(req, res, async (err) => {
    const file = req.file;
    fileName = file.filename;
    certificates = await uploadUID();
    /*for (i=0;i<(certificates.length-1);i++) {
      
      const emailID = certificates[i].email;
      const certiUID = certificates[i].UID;
      const certiName = certificates[i].name;
      const certiYear = certificates[i].year;
      const link = [];

      db.collection("Users").get()
        .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            var certiRef = db.collection("Users").doc(doc.id);
              certiRef.update({
                certificates: firebase.firestore.FieldValue.arrayUnion({
                  "UID": certiUID,
                  "certiYear": certiYear,
                  "name": certiName,
                  "link": link
                })
              });    
          });
        });
    }*/
    if (flag) {
      fs.writeFileSync("count.txt", `${rowNum}`);
      errors.push({
        msg: `You are supposed to upload ${rowNum} certificates below`,
      });
      res.render("certis", { errors, count: rowNum });
      for (i = 0; i < certificates.length - 1; i++) {
        const link = `https://firebasestorage.googleapis.com/v0/b/vesit-bot-web.appspot.com/o/${certificates[i].UID}?alt=media`;

        // Send each row to firebase, under User/{emailID}/Certificates/{UID}
        const certi = await db
          .doc(
            `Users/${certificates[i].email}/Certificates/${certificates[i].UID}`
          )
          .set({
            name: certificates[i].name,
            year: certificates[i].year,
            link: `https://firebasestorage.googleapis.com/v0/b/certificates-vesit.appspot.com/o/${certificates[i].UID}.jpg?alt=media`,
          });
      }
    } else {
      console.log(rowNum);
      errors.push({ msg: `At Row Number(s) ${finalNums} value is missing` });
      res.render("csv", { errors });
    }
  });
});

module.exports = router;