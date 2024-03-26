const syncCafeRegistration = require("../../modals/cafeRegistration/cafeRegistration");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const sendEmail = require("../../utils/sendEmail");
const sendToken = require("../../utils/jwtToken");
const syncRegistration = require("../../modals/registration/syncRegistration");
const syncAdminRegistration = require("../../modals/registration/syncAdminRegistration");
const { errFunc } = require("../../utils/sendResponse");
const AdmZip = require("adm-zip");
const fs = require("fs");
const sharp = require("sharp");
const admin = require("../../utils/firebaseConnection");
// const ExifImage = require('exif').ExifImage
const aws = require("aws-sdk");
const axios = require("axios");

// get all email
exports.getAllEmail = catchAsyncErrors(async (req, res, next) => {
  const cafes = await syncCafeRegistration.find({}, { _id: 0, email: 1 });
  res.status(200).json({
    success: true,
    cafes,
  });
});

// create cafe registration
exports.createCafe = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration
    .findOne({ email: req.body.email })
    .select("+password");
  const admin = await syncAdminRegistration
    .findOne({ email: req.body.email })
    .select("+password");
  const cafes = await syncCafeRegistration
    .find({ email: req.body.email, role: "cafe" })
    .select("+password");
  console.log(cafes, "cafes");
  if (user || admin || cafes?.length > 0) {
    if (cafes?.length > 0) {
      const filterCafe = cafes?.filter((z) => z.isVerified === false);
      if (filterCafe?.length > 0) {
        await syncCafeRegistration.updateOne(
          { _id: filterCafe[0]._id },
          req.body
        );
        if (req.body.password) {
          filterCafe[0].password = req.body.password;
        }
        const otp = Math.floor(100000 + Math.random() * 900000);
        const message = `Thanks so much for signing up to claim your free business profile on Sync! We're really excited to have you as part of our community. Please verify your email using below code: \n\n ${otp}`;
        filterCafe[0].otp = otp;
        await filterCafe[0].save();
        res.status(200).json({
          success: true,
          message: `OTP sent to ${filterCafe[0].email} successfully`,
          cafe: filterCafe[0]._id,
        });

        await sendEmail({
          email: filterCafe[0].email,
          subject: "Welcome to Sync! Please verify your email ",
          message,
        });
      } else {
        const cafe = await syncCafeRegistration.create(req.body);
        const otp = Math.floor(100000 + Math.random() * 900000);
        const message = `Thanks so much for signing up to claim your free business profile on Sync! We're really excited to have you as part of our community. Please verify your email using below code: \n\n ${otp}`;
        cafe.otp = otp;
        await cafe.save({ validateBeforeSave: false });
        res.status(200).json({
          success: true,
          message: `OTP sent to ${cafe.email} successfully`,
          cafe: cafe._id,
        });

        await sendEmail({
          email: cafe.email,
          subject: "Welcome to Sync! Please verify your email ",
          message,
        });
      }
    }
  } else {
    const cafe = await syncCafeRegistration.create(req.body);
    const otp = Math.floor(100000 + Math.random() * 900000);
    const message = `Thanks so much for signing up to claim your free business profile on Sync! We're really excited to have you as part of our community. Please verify your email using below code: \n\n ${otp}`;
    cafe.otp = otp;
    await cafe.save({ validateBeforeSave: false });
    res.status(200).json({
      success: true,
      message: `OTP sent to ${cafe.email} successfully`,
      cafe: cafe._id,
    });

    await sendEmail({
      email: cafe.email,
      subject: "Welcome to Sync! Please verify your email ",
      message,
    });
  }
});

// verify cafe
exports.verifyCafe = catchAsyncErrors(async (req, res, next) => {
  const cafe = await syncCafeRegistration.findById(req.body.cafeId);
  if (cafe.isVerified === true) {
    return res.status(200).json({
      success: true,
      message: "Email already verified",
    });
  }
  if (cafe.otp === req.body.otp) {
    cafe.isVerified = true;
    cafe.status = true;
    cafe.fcmToken.push(req?.body?.fcmToken);
    await cafe.save();
    sendToken(cafe, 200, res);
  } else {
    res.status(403).json({
      success: false,
      message: "Entered OTP is wrong",
    });
  }
});

exports.submittedAllForms = catchAsyncErrors(async (req, res, next) => {
  const allCafe = await syncCafeRegistration.findByIdAndUpdate(
    req.user.id,
    req.body,
    {
      new: true,
    }
  );
  if (!allCafe) {
    return next(
      errFunc(res, 401, false, `Cafe does not exist with Id: ${req.user.id}`)
    );
  }
  if (req?.body?.name) {
    allCafe.isSubmitted = true;
    await allCafe.save();
  }
  res.status(200).json({
    success: true,
    message: "Cafe is submitted successfully",
    allCafe,
  });
});

exports.addCafeByOwner = catchAsyncErrors(async (req, res, next) => {
  await syncCafeRegistration.create({
    ...req.body,
    status: true,
    isVerified: true,
    isSubmitted: true,
  });
  res.status(200).json({
    success: true,
    message: "Cafe is submitted successfully",
  });
});

exports.allCafeData = catchAsyncErrors(async (req, res, next) => {
  if (req.params.id) {
    const allCafe = await syncCafeRegistration
      .findById(req.params.id)
      .populate([
        {
          path: "ratingReviews",
          populate: [
            {
              path: "cafeData",
              model: syncCafeRegistration,
              select: "establishmentName pictures streetAddress city",
            },
            {
              path: "userProfile",
              model: syncRegistration,
              select: "name profileImage position country city",
            },
          ],
        },
        {
          path: "ratingFilters",
          populate: [
            {
              path: "cafeData",
              model: syncCafeRegistration,
              select: "establishmentName pictures streetAddress city",
            },
            {
              path: "userProfile",
              model: syncRegistration,
              select: "name profileImage position country city",
            },
          ],
        },
      ])
      .exec();
    if (!allCafe) {
      return next(
        errFunc(
          res,
          401,
          false,
          `Cafe does not exist with Id: ${req.params.id}`
        )
      );
    }
    res.status(200).json({
      success: true,
      allCafe,
    });
  } else {
    const allCafe = await syncCafeRegistration.find({ role: "cafe" });

    res.status(200).json({
      success: true,
      allCafe: allCafe.reverse(),
    });
  }
});

exports.cafeResolution = catchAsyncErrors(async (req, res, next) => {
  const cafe = await syncCafeRegistration.findById(req.body.id);
  if (!cafe) {
    return next(
      errFunc(res, 401, false, `Cafe does not exist with Id: ${req.body.id}`)
    );
  }
  cafe.isAccepted = req.body.resolution;
  await cafe.save();
  res.status(200).json({
    success: true,
    message: `${cafe.establishmentName} is ${req.body.resolution} successfully.`,
  });
  await sendEmail({
    email: cafe.email,
    subject:
      req.body.resolution === "Approved"
        ? "Welcome aboard! Your business listing access is approved"
        : "Update on your business profile",
    message: req.body.message,
  });
});

exports.updateCafeStatus = catchAsyncErrors(async (req, res, next) => {
  const cafe = await syncCafeRegistration.findById(req.params.id);

  if (!cafe) {
    return next(
      errFunc(res, 404, false, `cafe does not exist with Id: ${req.params.id}`)
    );
  }

  cafe.status = !cafe.status;

  res.status(200).json({
    success: true,
    message: `${cafe.name} is ${
      cafe.status === true ? "Unarchive" : "Archive"
    }`,
  });

  await cafe.save();
});

exports.isFirstOnCafe = catchAsyncErrors(async (req, res, next) => {
  const cafe = await syncCafeRegistration.findById(req.params.id);

  if (!cafe) {
    return next(
      errFunc(res, 404, false, `cafe does not exist with Id: ${req.params.id}`)
    );
  }

  cafe.isFirst = false;

  res.status(200).json({
    success: true,
  });

  await cafe.save();
});

exports.updateCafeDetails = catchAsyncErrors(async (req, res, next) => {
  if (!req.params.id) {
    const user = await syncCafeRegistration.findByIdAndUpdate(
      req.user.id,
      req.body,
      {
        new: true,
      }
    );
    if (!user) {
      return next(
        errFunc(res, 404, false, `Cafe does not exist with Id: ${req.user.id}`)
      );
    }
    res.status(200).json({
      success: true,
      message: "Cafe updated successfully",
      user,
    });
  } else {
    const user = await syncCafeRegistration.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    if (!user) {
      return next(
        errFunc(res, 404, false, `Cafe does not exist with Id: ${req.user.id}`)
      );
    }
    res.status(200).json({
      success: true,
      message: "Cafe updated successfully",
      user,
    });
  }
});

exports.updateReviews = catchAsyncErrors(async (req, res, next) => {
  const user = await syncRegistration.findById(req.body.userId);
  const cafe = await syncCafeRegistration.findById(req.user.id);
  if (user && cafe) {
    const ratingReview = user.ratingReviews.filter(
      (e) => e.uniqueId === req.body.reviewId
    );
    const ratingReviewCafe = cafe.ratingReviews.filter(
      (e) => e.uniqueId === req.body.reviewId
    );
    if (ratingReview.length > 0 && ratingReviewCafe.length > 0) {
      // Update the desired fields of the ratingReview object
      ratingReview[0].reply = req.body.message;

      // Save the changes
      await user.save();
      ratingReviewCafe[0].reply = req.body.message;
      await cafe.save();
      res.status(200).json({
        success: true,
        message: "Rating review updated successfully",
        ratingReview,
      });
      if (user?.fcmToken?.length > 0) {
        user?.fcmToken.forEach((a) => {
          const message = {
            data: {
              title: "New Message",
              body: `${cafe?.establishmentName} replied to your comment`,
            },
            token: a,
          };
          admin
            .messaging()
            .send(message)
            .then((response) => {
              console.log("Message sent successfully:", response);
            })
            .catch(async (error) => {
              console.error("Error sending message:", error);
            });
        });
        user?.notification?.push({
          body: `${cafe?.establishmentName} replied to your comment`,
          userId: cafe?._id,
          data: {
            name: cafe?.establishmentName,
            pictures: cafe?.pictures,
            images: cafe?.images,
          },
          role: "cafe",
          status: false,
        });
        await user.save();
      }
    } else {
      res.status(404).json({
        success: false,
        message: "Rating review not found",
      });
    }
  } else {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
});

exports.bulkUpload = catchAsyncErrors(async (req, res, next) => {
  req.body.cafeLists?.forEach(async (item) => {
    const cafe = await syncCafeRegistration.findOne({ poi_id: item.poi_id });
    if (!cafe) {
      const aminities = [];
      Object.keys(item).forEach((e) => {
        if (item[e] === true) {
          aminities.push(e);
        }
      });
      await syncCafeRegistration.create({
        ...item,
        email: `${Date.now()}example@gmail.com`,
        facilities: aminities,
        isAccepted: "Approved",
        status: true,
      });
    }
  });
  res.status(200).json({
    success: true,
    message: "Cafes created successfully",
  });
});

exports.bulkImageUpload = catchAsyncErrors(async (req, res, next) => {
  const zipFile = req.file;
  if (!zipFile) {
    return res.status(400).send("No ZIP file provided");
  }
  console.log(zipFile, "zipFile");
  const response = await axios.get(zipFile.location, {
    responseType: "arraybuffer",
  });
  console.log(response, "response");
  const buffer = Buffer.from(response.data);
  console.log(buffer, "buffer");

  const extractionPath = "./extracted_folder";
  const zip = new AdmZip(buffer);
  console.log(zip, "zip");

  zip.extractAllTo(extractionPath, true);

  const extractedFiles = zip.getEntries().map((entry) => entry.entryName);

  for (const extractedFile of extractedFiles) {
    console.log(extractedFile, "extractedFile");
    const folderName = extractedFile.split("/");
    if (folderName[1]) {
      const renamePath = extractedFile.split(".");
      console.log(extractedFile, renamePath, "extractedFile");
      // const fileContent = fs.readFileSync(`${extractionPath}/${extractedFile}`)
      // console.log(fileContent, 'fileContent')
      // let orientation = 1 // Default orientation (no rotation)

      // try {
      //   const exifData = await new Promise((resolve, reject) => {
      //     // eslint-disable-next-line no-new
      //     new ExifImage({ image: fileContent }, (error, data) => {
      //       if (error) {
      //         reject(error)
      //       } else {
      //         resolve(data)
      //       }
      //     })
      //   })
      //   orientation = exifData.image.Orientation || 1
      // } catch (error) {
      //   console.log('Error reading EXIF metadata:', error)
      // }
      // Resize the image to the specified dimensions without rotation
      // const resizedImage = await sharp(fileContent)
      //   .jpeg({ quality: 30 }).resize(500)
      //   .toBuffer()

      const resizedImage = await sharp(`./extracted_folder/${extractedFile}`)
        .jpeg({ quality: 50 })
        .rotate()
        .resize(500)
        .toFile(`./extracted_folder/${renamePath[0]}2.jpg`);
      // Rotate the image back to the default orientation based on the EXIF metadata
      // const compressedFile = await sharp(resizedImage)
      //   .rotate(orientation === 6 ? 90 : orientation === 3 ? 180 : orientation === 8 ? 270 : 0)
      //   .toBuffer()
      console.log(resizedImage, "resizedImage");
      const compressedFile = await sharp(
        `./extracted_folder/${renamePath[0]}2.jpg`
      ).toBuffer();
      console.log(compressedFile, "compressedFile");

      const s3 = new aws.S3();
      const params = {
        Bucket: "sync-react-images",
        Key: `path/to/upload/${extractedFile}`,
        Body: compressedFile,
      };

      try {
        await s3.upload(params).promise();

        // const cafe = await syncCafeRegistration.findOne({ poi_id: folderName[0] })
        // if (cafe) {
        //   const checkImage = cafe.images.some(e => e === uploadResult.Location)
        //   if (!checkImage) {
        //     cafe.images.push(uploadResult.Location)
        //     await cafe.save()
        //   }
        // }
      } catch (error) {
        console.error("Error occurred while uploading file:", error);
      }
    }
  }

  // Clean up the extracted files
  fs.rmdirSync(extractionPath, { recursive: true });

  res.status(200).json({
    success: true,
    message: "ZIP file extracted and uploaded successfully",
  });
});
