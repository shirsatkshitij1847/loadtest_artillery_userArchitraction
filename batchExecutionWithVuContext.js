import { bundleProject } from "./bundler.js";
import fs from "fs/promises";
import dotenv from "dotenv";
dotenv.config();
import { uploadZip } from "./uploadZipBuildToS3.js";
import { zipFolder } from "./createZipBundle.js";
import { runFargate } from "./runFargate.js";
import { uploadMetadata } from "./metadataUploader.js";
// ----------------------------
// Read Artillery Config
// ----------------------------
const artilleryModule = await import("./artillery.js");
const { config } = artilleryModule;
const duration = config.phases.duration || 0;

const projectZipFolderName = process.env.LOADTEST_PROJECT_ZIP;

// ----------------------------
// Read Users & Create Runtime Users
// ----------------------------

// const userCredencialPath = config.payload?.path || "./user.json";

const rawUsers = (await import("./user.json", { with: { type: "json" } })).default;

// Runtime users used for batching
const users = rawUsers.map((user) => {
	const runtimeUser = {};

	// Copy every field listed in artillery.js
	config.payload.field.forEach((field) => {
		runtimeUser[field] = user[field];
	});

	runtimeUser.vuId = `vu${crypto.randomUUID().slice(0, 8)}`;
	runtimeUser.state = "AVAILABLE";

	return runtimeUser;
});


function createBatch(batchSize) {
	const availableUsers = users.filter((user) => user.state === "AVAILABLE");

	// Not enough users for a complete batch
	if (availableUsers.length < batchSize) {
		return [];
	}

	const selectedUsers = [];

	while (selectedUsers.length < batchSize) {
		const randomIndex = Math.floor(Math.random() * availableUsers.length);

		const selectedUser = availableUsers[randomIndex];

		selectedUser.state = "IN_USE";

		selectedUsers.push(selectedUser);

		availableUsers.splice(randomIndex, 1);
	}

	return selectedUsers;
}
// ----------------------------
// Release Users
// ----------------------------
function releaseUser(batch) {
	batch.forEach((user) => {
		user.state = "AVAILABLE";
	});
}


//------ Batch Execution for 4 worker ------------------
//Note : one case also should be managed that if scenario not found in artillery file first show error

export async function runBatch({ workers, batchSize, durationMinutes, executionId }) {
	// ONE execution ID for the entire runBatch execution
	// const executionId = `testExecution-${Date.now()}`;

	console.log(`Execution ID: ${executionId}`);

	const endTime = Date.now() + durationMinutes * 60 * 1000;

	let round = 0;

	while (Date.now() < endTime) {
		round++;

		console.log(`\n========== ROUND ${round} ==========`);
		console.log(`Execution ID: ${executionId}`);

		const tasks = [];

		// -----------------------------------------
		// Create EXACT number of worker batches
		// -----------------------------------------

		for (let i = 0; i < workers; i++) {
			const batch = createBatch(batchSize);

			if (batch.length !== batchSize) {
				tasks.forEach((task) => {
					releaseUser(task.batch);
				});

				throw new Error(
					`Not enough users: ${workers} workers x batch size ${batchSize} requires ` +
						`${workers * batchSize} users, but user.json has ${users.length}.`,
				);
			}

			tasks.push({
				batch,
				// Same execution ID for every worker
				executionId,
			});
		}

		console.log(`Starting ${tasks.length} Fargate tasks`);

		// -----------------------------------------
		// Start all Fargate tasks
		// -----------------------------------------

		const promises = tasks.map((task) => {
			return runFargate(task.batch, task.executionId);
		});

		// -----------------------------------------
		// WAIT UNTIL ALL FARGATE TASKS FINISH
		// -----------------------------------------

		const results = await Promise.allSettled(promises);

		// -----------------------------------------
		// Release users
		// -----------------------------------------

		tasks.forEach((task) => {
			releaseUser(task.batch);
		});

		// -----------------------------------------
		// Check if any Fargate failed
		// -----------------------------------------

		const failed = results.some((result) => result.status === "rejected");

		if (failed) {
			console.error(`Round ${round} failed`);

			throw new Error(`Fargate round ${round} failed`);
		}

		console.log(`Round ${round} completed`);
	}

	console.log("\n========== EXECUTION COMPLETED ==========");
	console.log(`Execution ID: ${executionId}`);

	return { executionId };
}

export async function main(options) {
	// =====================================================
	// Execution information
	// Generate ID BEFORE anything can fail
	// =====================================================

	const testExecutionId = `testExecution-${Date.now()}`;

	const startTime = Date.now();

	// =====================================================
	// Variables kept outside try
	// So failed metadata can use whatever information
	// was successfully collected before the failure
	// =====================================================

	let filePath = options?.runfargate || null;

	let scenarioName = null;
	let flowFunction = null;

	let duration = null;
	let workers = null;
	let batchSize = null;

	let stage = "INITIALIZATION";

	try {
		// =====================================================
		// 1. Validate CLI file
		// =====================================================

		stage = "VALIDATING_ARTILLERY_FILE";

		if (!filePath) {
			throw new Error("Please provide Artillery file using --runfargate <file>");
		}

		if (!filePath.startsWith("./")) {
			filePath = "./" + filePath;
		}

		console.log(`Artillery file: ${filePath}`);

		// =====================================================
		// 2. Check file exists
		// =====================================================

		stage = "CHECKING_ARTILLERY_FILE";

		try {
			await fs.access(filePath);
		} catch (error) {
			throw new Error(`Artillery file does not exist: ${filePath}`);
		}

		console.log(`Artillery file found: ${filePath}`);

		// =====================================================
		// 3. Import Artillery file
		// =====================================================

		stage = "IMPORTING_ARTILLERY_FILE";

		const artilleryModule = await import(filePath);

		const { config, scenarios } = artilleryModule;

		// =====================================================
		// 4. Validate config
		// =====================================================

		stage = "VALIDATING_ARTILLERY_CONFIG";

		if (!config) {
			throw new Error(`Artillery config not found in ${filePath}`);
		}

		// =====================================================
		// 5. Validate phases
		// =====================================================

		stage = "VALIDATING_PHASES";

		if (!config.phases) {
			throw new Error(`phases configuration not found in ${filePath}`);
		}

		// =====================================================
		// 6. Read duration
		// Duration comes from Artillery
		// =====================================================

		duration = Number(config.phases.duration || 0);

		// =====================================================
		// 7. Read workers
		// Workers come ONLY from CLI
		// --workerpod <count>
		// =====================================================

		workers = Number(options?.workerpod || 0);

		// =====================================================
		// 8. Read batch size
		// Batch size comes from Artillery rampUp
		// =====================================================

		batchSize = Number(config.phases.rampUp || 1);

		// =====================================================
		// 9. Validate duration
		// =====================================================

		stage = "VALIDATING_DURATION";

		if (!Number.isFinite(duration) || duration <= 0) {
			throw new Error(`Invalid duration in ${filePath}. ` + `config.phases.duration must be greater than 0.`);
		}

		// =====================================================
		// 10. Validate workers
		// =====================================================

		stage = "VALIDATING_WORKERS";

		if (!Number.isInteger(workers) || workers <= 0) {
			throw new Error("--workerpod must be provided and must be a positive integer.");
		}

		// =====================================================
		// 11. Validate batch size
		// =====================================================

		stage = "VALIDATING_BATCH_SIZE";

		if (!Number.isInteger(batchSize) || batchSize <= 0) {
			throw new Error(`Invalid rampUp in ${filePath}. ` + `config.phases.rampUp must be greater than 0.`);
		}

		stage = "VALIDATING_USER_POOL";

		if (workers * batchSize > users.length) {
			throw new Error(
				`Not enough users: --workerpod ${workers} x rampUp ${batchSize} requires ` +
					`${workers * batchSize} users, but ${config.payload?.path ?? "user.json"} has ${users.length}. ` +
					`Reduce --workerpod to ${Math.floor(users.length / batchSize)} or add more users.`,
			);
		}

		// =====================================================
		// 12. Validate scenarios
		// =====================================================

		stage = "VALIDATING_SCENARIO";

		if (!scenarios) {
			throw new Error(`No scenarios found in ${filePath}`);
		}

		// =====================================================
		// 13. Read scenario information
		// =====================================================

		scenarioName = scenarios.name;

		flowFunction = scenarios.flowFunction;

		if (!scenarioName) {
			throw new Error(`Scenario name not found in ${filePath}`);
		}

		if (!flowFunction) {
			throw new Error(`flowFunction not found for scenario "${scenarioName}"`);
		}

		// =====================================================
		// 14. Print configuration
		// =====================================================

		console.log("\n==========================================");

		console.log("LOAD TEST CONFIGURATION");

		console.log("==========================================");

		console.log(`Execution ID : ${testExecutionId}`);

		console.log(`File         : ${filePath}`);

		console.log(`Scenario     : ${scenarioName}`);

		console.log(`Flow         : ${flowFunction}`);

		console.log(`Duration     : ${duration} seconds`);

		console.log(`Workers      : ${workers}`);

		console.log(`Batch Size   : ${batchSize}`);

		console.log(`Region       : ${options?.region || "not specified"}`);

		console.log(`CPU          : ${options?.cpu || "not specified"}`);

		console.log(`Memory       : ${options?.memory || "not specified"}`);

		console.log(`Tag          : ${options?.tag || "not specified"}`);

		console.log("==========================================\n");

		// =====================================================
		// 15. Bundle project
		// =====================================================

		stage = "BUNDLING_PROJECT";

		console.log("Creating project bundle...");

		await bundleProject(config.processor, config.media, filePath);

		console.log("Bundle created successfully.");

		// =====================================================
		// 16. Create ZIP
		// =====================================================

		stage = "CREATING_PROJECT_ZIP";

		console.log("Creating project ZIP...");

		await zipFolder("bundle", projectZipFolderName);

		console.log(`ZIP created: ${projectZipFolderName}`);

		// =====================================================
		// 17. Upload ZIP
		// =====================================================

		stage = "UPLOADING_PROJECT_ZIP";

		console.log("Uploading project ZIP...");

		await uploadZip(projectZipFolderName);

		console.log("Project ZIP uploaded successfully.");

		// =====================================================
		// CREATE INITIAL TEST METADATA
		// Artifact is successfully uploaded to S3
		// Fargate has NOT started yet
		// =====================================================

		const initialMetadata = {
			testExecutionId,

			command: "runfargate",

			file: filePath,

			region: options?.region || null,

			worker: workers,

			cpu: options?.cpu || null,

			memory: options?.memory || null,

			user: options?.tag || null,

			startTime,

			endTime: null,

			scenarioName,

			flowFunction,

			duration,

			batchSize,

			service: "Fargate-ECS",

			status: "READY",

			stage: "ARTIFACT_UPLOADED",

			error: null,
		};

		console.log("\nInitial Test Metadata:");

		console.log(JSON.stringify(initialMetadata, null, 2));

		await uploadMetadata({
            
			bucket: process.env.METADATA_BUCKET,

			testExecutionId,

			metadata: initialMetadata,
		});

		console.log("Initial test metadata uploaded successfully.");

		// =====================================================
		// 18. Start Fargate execution
		// =====================================================

		stage = "STARTING_FARGATE";

		console.log("\n==========================================");

		console.log("STARTING FARGATE EXECUTION");

		console.log("==========================================\n");

		// =====================================================
		// 19. Run batches
		// =====================================================

		stage = "RUNNING_FARGATE";

		const result = await runBatch({
			workers,

			batchSize,

			// runBatch expects minutes
			durationMinutes: duration / 60,

			executionId: testExecutionId,
		});

		// =====================================================
		// 20. Execution completed
		// =====================================================

		stage = "CREATING_SUCCESS_METADATA";

		const endTime = Date.now();

		console.log("\n==========================================");

		console.log("FARGATE EXECUTION COMPLETED");

		console.log("==========================================");

		// =====================================================
		// 21. Create FINAL metadata
		// =====================================================

		const metadata = {
			testExecutionId,

			region: options?.region || null,

			worker: workers,

			cpu: options?.cpu || null,

			memory: options?.memory || null,

			user: options?.tag || null,

			startTime,

			endTime,

			file: filePath,

			scenarioName,

			flowFunction,

			duration,

			batchSize,

			service: "Fargate-ECS",

			status: "COMPLETED",
		};

		console.log("\nFinal Metadata:");

		console.log(JSON.stringify(metadata, null, 2));

		// =====================================================
		// 22. Upload SUCCESS metadata
		// =====================================================

		stage = "UPLOADING_SUCCESS_METADATA";

		await uploadMetadata({
			bucket: process.env.METADATA_BUCKET,

			testExecutionId,

			metadata,
		});

		console.log("\nMetadata uploaded successfully.");

		// =====================================================
		// 23. Return
		// =====================================================

		return {
			testExecutionId,

			metadata,

			result,
		};
	} catch (err) {
		// =====================================================
		// FAILED EXECUTION
		// =====================================================

		const endTime = Date.now();

		console.error("\n==========================================");

		console.error("TEST EXECUTION FAILED");

		console.error("==========================================");

		console.error(`Execution ID : ${testExecutionId}`);

		console.error(`Failed Stage : ${stage}`);

		console.error(`Error        : ${err.message}`);

		// =====================================================
		// Create FAILED metadata
		// =====================================================

		const failedMetadata = {
			testExecutionId,

			region: options?.region || null,

			worker: workers,

			cpu: options?.cpu || null,

			memory: options?.memory || null,

			user: options?.tag || null,

			startTime,

			endTime,

			file: filePath,

			scenarioName,

			flowFunction,

			duration,

			batchSize,

			service: "Fargate-ECS",

			status: "FAILED",

			stage,

			error: err.message,
		};

		console.log("\nFailed Metadata:");

		console.log(JSON.stringify(failedMetadata, null, 2));

		// =====================================================
		// Upload FAILED metadata
		// =====================================================

		try {
			await uploadMetadata({
				bucket: process.env.METADATA_BUCKET,

				testExecutionId,

				metadata: failedMetadata,
			});

			console.log("Failed execution metadata uploaded.");
		} catch (metadataError) {
			console.error("Could not upload failed metadata:", metadataError.message);
		}

		// =====================================================
		// Re-throw original error
		// Commander will receive failure
		// =====================================================

		throw err;
	}
}
