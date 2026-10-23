import fs from "fs";
import path from "path";
import JSZip from "jszip";

async function addFolderToZip(zip, folderPath, zipFolder = "") {
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const zipPath = path.join(zipFolder, file);

    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      await addFolderToZip(zip, fullPath, zipPath);
    } else {
      zip.file(zipPath, fs.readFileSync(fullPath));
    }
  }
}

export async function zipFolder(folderPath, zipName) {
  const zip = new JSZip();

  await addFolderToZip(zip, folderPath);

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  fs.writeFileSync(zipName, buffer);

  console.log(`${zipName} created successfully`);
}


