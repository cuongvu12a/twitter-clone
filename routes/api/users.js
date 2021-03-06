const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../../schemas/UserSchema");
const Notification = require("../../schemas/notificationSchema");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/", async (req, res, next) => {
  let searchObj = {};
  if (req.query.search !== undefined) {
    searchObj = {
      $or: [
        { firstName: { $regex: req.query.search, $options: "i" } },
        { lastName: { $regex: req.query.search, $options: "i" } },
        { username: { $regex: req.query.search, $options: "i" } },
      ],
    };
  }
  const results = await User.find(searchObj);
  res.status(200).send(results);
});
router.put("/:userId/follow", async (req, res, next) => {
  const userId = req.params.userId;
  const user = await User.findById(userId);
  if (user === null) return res.sendStatus(404);
  const isFollowing =
    user.followers && user.followers.includes(req.session.user._id);
  const option = isFollowing ? "$pull" : "$addToSet";
  req.session.user = await User.findByIdAndUpdate(
    req.session.user._id,
    {
      [option]: {
        following: userId,
      },
    },
    { new: true }
  ).catch((err) => {
    console.log(err);
    res.sendStatus(400);
  });
  await User.findByIdAndUpdate(userId, {
    [option]: {
      followers: req.session.user._id,
    },
  }).catch((err) => {
    console.log(err);
    res.sendStatus(400);
  });

  if (!isFollowing) {
    await Notification.insertNotification(
      userId,
      req.session.user._id,
      "follow",
      req.session.user._id
    );
  }

  res.status(200).send(req.session.user);
});
router.get("/:userId/following", async (req, res, next) => {
  const results = await User.findById(req.params.userId).populate("following");
  if (!results) return res.sendStatus(400);
  res.status(200).send(results);
});
router.get("/:userId/followers", async (req, res, next) => {
  const results = await User.findById(req.params.userId).populate("followers");
  if (!results) return res.sendStatus(400);
  res.status(200).send(results);
});
router.post(
  "/profilePicture",
  upload.single("croppedImage"),
  async (req, res, next) => {
    if (!req.file) {
      return res.sendStatus(400);
    }
    const filePath = `/uploads/images/${req.file.filename}.png`;
    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, `../../${filePath}`);
    fs.rename(tempPath, targetPath, async (error) => {
      if (error !== null) {
        return res.sendStatus(400);
      }
      req.session.user = await User.findByIdAndUpdate(
        req.session.user._id,
        { profilePic: filePath },
        { new: true }
      );
      res.sendStatus(200);
    });
  }
);
router.post(
  "/coverPhoto",
  upload.single("croppedImage"),
  async (req, res, next) => {
    if (!req.file) {
      return res.sendStatus(400);
    }
    const filePath = `/uploads/images/${req.file.filename}.png`;
    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, `../../${filePath}`);
    fs.rename(tempPath, targetPath, async (error) => {
      if (error !== null) {
        return res.sendStatus(400);
      }
      req.session.user = await User.findByIdAndUpdate(
        req.session.user._id,
        { coverPhoto: filePath },
        { new: true }
      );
      res.sendStatus(200);
    });
  }
);

module.exports = router;
