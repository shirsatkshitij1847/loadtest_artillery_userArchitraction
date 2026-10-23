import * as esbuild from "esbuild";
import {
    readFile,
    mkdir,
    access,
    copyFile
} from "node:fs/promises";
import path from 'path'
import fs from 'fs/promises'



// async function copyMediaFiles(imagesArray) {
//     const bundleDir = './bundle';

//     await fs.mkdir(bundleDir, { recursive: true });

//     for (const item of imagesArray) {
//         const filePath = Object.values(item)[0]; // get "./LayoutImage.png"

//         if (!filePath) continue;

//         const fileName = path.basename(filePath);
//         const destination = path.join(bundleDir, fileName);

//         await fs.copyFile(filePath, destination);

//         console.log(`Copied ${filePath} -> ${destination}`);
//     }

//     console.log('Images copied successfully');
// }

async function copyMediaFiles(imagesArray) {

    const bundleDir = './bundle';

    await fs.mkdir(bundleDir, { recursive: true });

    for (const item of imagesArray) {

        const filePath = Object.values(item)[0];

        if (!filePath) continue;

        // Keep folder structure relative to project root
        const relativePath = path.relative('.', filePath);

        const destination = path.join(bundleDir, relativePath);

        // Create folders if they don't exist
        await fs.mkdir(path.dirname(destination), { recursive: true });

        // Copy file
        await fs.copyFile(filePath, destination);

        console.log(`Copied ${filePath} -> ${destination}`);
    }

    console.log('Images copied successfully');
}

async function copyLoadTestPrerequisite(loadTestPath) {

    const bundleDir = './bundle';

    await fs.mkdir(bundleDir, { recursive: true });

    // Check load test file exists
    await fs.access(loadTestPath);

    // Copy load test file
    const fileName = path.basename(loadTestPath);
    const loadTestDestination = path.join(bundleDir, fileName);

    await fs.copyFile(loadTestPath, loadTestDestination);
    console.log(`Copied ${loadTestPath} -> ${loadTestDestination}`);

    // Copy package files
    const packageFiles = [
        'package.json',
        'package-lock.json'
    ];

    for (const file of packageFiles) {
        await fs.access(file);

        const destination = path.join(bundleDir, file);
        await fs.copyFile(file, destination);

        console.log(`Copied ${file} -> ${destination}`);
    }

    console.log('Bundle preparation completed');

}

export async function bundleProject(filepath, media = [], loadTestPath) {

    const pkg = JSON.parse(await readFile("./package.json", "utf8"));

    console.log("file name is  " + filepath);
    const processorFileName = path.basename(filepath);
    console.log(processorFileName);

    await esbuild.build({
        entryPoints: [filepath],
        bundle: true,
        platform: "node",
        format: pkg.type === "module" ? "esm" : "cjs",
        outfile: `bundle/${processorFileName}`,

        external: [
            "@playwright/*",
            "playwright*",
            "playwright-core*",
            "chromium-bidi*",
        ],

        loader: {
            ".js": "js",
            ".jsx": "jsx",
            ".ts": "ts",
            ".tsx": "tsx",
            ".json": "json",

            // Text files
            ".txt": "text",
            ".md": "text",

            // Images/assets
            ".png": "file",
            ".jpg": "file",
            ".jpeg": "file",
            ".svg": "file",
            ".webp": "file",

            // Fonts
            ".woff": "file",
            ".woff2": "file",
            ".ttf": "file",
            ".otf": "file",
            // Small assets embedded directly
            ".ico": "dataurl",
            // Styles
            ".css": "css",
            ".module.css": "local-css",
        },

        assetNames: "assets/[name]-[hash]",
    });

    //not used but if needed can add that package.json and package-lock.json file in it using this function
    async function copyPackageFiles() {

    await fs.mkdir("./bundle", { recursive: true });

    await fs.copyFile(
        "./package.json",
        "./bundle/package.json"
    );

    await fs.copyFile(
        "./package-lock.json",
        "./bundle/package-lock.json"
    );

    console.log("package.json copied");
    console.log("package-lock.json copied");
}

    // Copy external media files
    await copyLoadTestPrerequisite(loadTestPath);

    // console.log(media);

    await copyPackageFiles();

    await copyMediaFiles(media)

    console.log("Bundle preparation completed");

}

// await bundleProject('./ShpFLoorFunction/shopfloorTranaction2.js')

// await copyLoadTestPrerequisite('./artillery.js')