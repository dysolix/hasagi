import fs from "fs";

const packageFile = JSON.parse(fs.readFileSync("./package.json", { encoding: "utf8" }));

delete packageFile.devDependencies;
delete packageFile.scripts;
delete packageFile.private;

fs.writeFileSync("./dist/package.json", JSON.stringify(packageFile, null, 2))
fs.copyFileSync("./package-lock.json", "./dist/package-lock.json");
fs.copyFileSync("./src/types.d.ts", "./dist/types.d.ts")