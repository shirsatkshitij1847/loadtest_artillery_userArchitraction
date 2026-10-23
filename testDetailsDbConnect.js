// import mongoose from "mongoose";

// const MONGO_URI =
//   "mongodb://admin:password123@localhost:27017/artilleryLoadTest?authSource=admin";

// await mongoose.connect(MONGO_URI);

// console.log("MongoDB connected");

// const TestExecutionSchema = new mongoose.Schema(
//   {
//     status: {
//       type: String,
//       default: "CREATED",
//     },
//     config: {
//       solo: Boolean,
//       runfargate: String,
//       output: String,
//       workerpod: Number,
//       scenarioName: String,
//       region: String,
//       cpu: String,
//       memory: String,
//       tag: String,
//       key: String,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const TestExecution =
//   mongoose.models.TestExecution ||
//   mongoose.model("TestExecution", TestExecutionSchema);

// export async function createTestExecution(options) {
//   const execution = await TestExecution.create({
//     status: "CREATED",
//     config: {
//       solo: options.solo,
//       runfargate: options.runfargate,
//       output: options.output,
//       workerpod: Number(options.workerpod || 0),
//       scenarioName: options.scenarioName,
//       region: options.region,
//       cpu: options.cpu,
//       memory: options.memory,
//       tag: options.tag,
//       key: options.key,
//     },
//   });

//   return {
//     testExecutionId: execution._id.toString(),
//     execution,
//   };
// }