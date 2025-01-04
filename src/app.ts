import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRouter from './routes/user.routes';
import { Express } from 'express';
import moduleRouter from './routes/module.routes';
import userProfileRouter from './routes/profile.routes';
import paymentRouter from './routes/payment.routes';

const app: Express = express();

app.use(cors({
    origin: '*', 
    credentials: true,
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.get("/api/hello", (req:Request, res:Response) => {
    res.json("Welcome to the API");
});
app.use("/api/v1/users", userRouter);
app.use("/api/v1/modules", moduleRouter);
app.use("/api/v1/profiles", userProfileRouter);
app.use("/api/v1", paymentRouter);

export default app;
