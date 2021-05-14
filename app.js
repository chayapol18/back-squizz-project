require("dotenv").config();
const cors = require("cors");
const express = require("express");
const app = express();
const errorMiddleware = require("./middlewares/error");
const CollectionRoute = require("./routes/CollectionRoute");
const CreatorRoute = require("./routes/CreatorRoute");
const QuestionRoute = require("./routes/QuestionRoute");
const QuizRoute = require("./routes/QuizRoute");
const UserRoute = require("./routes/UserRoute");
const UserHistory = require("./routes/UserHistoryRoute");
const PointRecord = require("./routes/PointRecordRoute");

const { sequelize } = require('./models')

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/collection", CollectionRoute);
app.use("/creator", CreatorRoute);
app.use("/question", QuestionRoute);
app.use("/quiz", QuizRoute);
app.use("/user", UserRoute);
app.use("/userhistory", UserHistory);
app.use("/pointrecord", PointRecord);

app.use((req, res, next) => {
  res.status(404).json({ message: "path not found on this server" });
});

app.use(errorMiddleware);

sequelize.sync({ force: true}).then(() => console.log('DB sync'))

const port = process.env.PORT;
app.listen(port, () => console.log(`server is running on port ${port}`));
