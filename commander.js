import { Command } from "commander";
import { main } from "./batchExecutionWithVuContext.js";

const program = new Command();

program
	.name("loadtest")
	.description("Fargate load test runner")
	.version("1.0.0")

	// -------------------------------------------------
	// Test file
	// -------------------------------------------------
	.option("--runfargate <file>", "Run load test using the specified Artillery file")

	// -------------------------------------------------
	// Execution mode
	// -------------------------------------------------
	.option("--solo", "Run this test locally")

	// -------------------------------------------------
	// Fargate configuration
	// -------------------------------------------------
	.option("--workerpod <count>", "Number of Fargate worker pods")

	.option("--region <region>", "AWS region where Fargate tasks will run")

	.option("--cpu <cpu>", "CPU configuration for Fargate")

	.option("--memory <memory>", "Memory configuration for Fargate")

	// -------------------------------------------------
	// Test metadata
	// -------------------------------------------------
	.option("--tag <tag>", "Tag for the test")

	.option("--key <key>", "Key used to validate the Artillery web portal")

	.option("--output <file>", "Output result file")

	.option("--key <file>", "Key used to validate the Artillery web portal");

// =====================================================
// PARSE COMMAND
// =====================================================

program.parse(process.argv);

// =====================================================
// GET OPTIONS
// =====================================================

const options = program.opts();

// =====================================================
// RUN FARGATE
// =====================================================

if (options.runfargate) {
	// -----------------------------------------------
	// workerpod is mandatory
	// -----------------------------------------------

	if (!options.workerpod) {
		console.error("\nError: --workerpod is required when using --runfargate.\n");

		console.error("Example:");

		console.error("node commander.js --runfargate loginPerformance.js --workerpod 4\n");

		process.exit(1);
	}

	// -----------------------------------------------
	// Validate workerpod
	// -----------------------------------------------

	const workerpod = Number(options.workerpod);

	if (!Number.isInteger(workerpod) || workerpod <= 0) {
		console.error("\nError: --workerpod must be a positive integer.\n");

		process.exit(1);
	}
	

	// -----------------------------------------------
	// Store validated value
	// -----------------------------------------------

	options.workerpod = workerpod;

	console.log("\n==========================================");

	console.log("FARGATE LOAD TEST");

	console.log("==========================================");

	console.log(`Test file : ${options.runfargate}`);

	console.log(`Workers   : ${options.workerpod}`);

	console.log(`Region    : ${options.region || "not specified"}`);

	console.log(`CPU       : ${options.cpu || "not specified"}`);

	console.log(`Memory    : ${options.memory || "not specified"}`);

	console.log(`Tag       : ${options.tag || "not specified"}`);

	console.log("==========================================\n");

	try {
		// -------------------------------------------
		// main() will:
		//
		// 1. Check Artillery file
		// 2. Read config
		// 3. Read scenario
		// 4. Read duration
		// 5. Read rampUp
		// 6. Create execution ID
		// 7. Create bundle
		// 8. Create ZIP
		// 9. Upload ZIP
		// 10. Start Fargate workers
		// 11. Upload metadata
		// -------------------------------------------

		const result = await main(options);

		console.log("\n==========================================");

		console.log("LOAD TEST FINISHED SUCCESSFULLY");

		console.log("==========================================");

		console.log(`Execution ID: ${result.testExecutionId}`);

		console.log("==========================================\n");
	} catch (error) {
		console.error("\n==========================================");

		console.error("LOAD TEST FAILED");

		console.error("==========================================");

		console.error(error.message);

		console.error("==========================================\n");

		process.exitCode = 1;
	}
}

// =====================================================
// SOLO
// =====================================================
else if (options.solo) {
	console.log("\nExecuting single local test...");

	// Put your local execution logic here.
}

// =====================================================
// NO COMMAND
// =====================================================
else {
	console.error("\nNo test execution option provided.\n");

	console.log("Use:");

	console.log("  --runfargate <file>");

	console.log("or");

	console.log("  --solo");

	console.log("\nExample:");

	console.log(
		'  node commander.js --runfargate loginPerformance.js --workerpod 4 --region eu-east-1 --cpu "2 vCPU" --memory "4 GB" --tag "tag:kshitij.shirsat"\n',
	);

	process.exitCode = 1;
}
