const express = require("express");
const { addClub, getClubs, getClubById, updateClub, deleteClub } = require("../controllers/clubController");
const { protect, admin, managerOrAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, admin, addClub);
router.get("/", protect, managerOrAdmin, getClubs);
// // Delete a club
// router.delete("/:id", protect, admin, deleteClub);
router.route("/:id").get(protect, managerOrAdmin, getClubById).put(protect, admin, updateClub).delete(protect, admin, deleteClub);

module.exports = router;
