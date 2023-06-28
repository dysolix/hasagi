import fs from "fs";
import prompt from "prompt";

const packageObj = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const distPackageObj = JSON.parse(fs.readFileSync("./dist/package.json", "utf8"));

const currentVersion = packageObj.version;

prompt.start();

let { version } = await prompt.get(
    {
        name: 'version',
        validator: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/,
        allowEmpty: true,
        default: packageObj.version,
    }
);

if (version !== currentVersion) {
    packageObj.version = version;
    distPackageObj.version = version;

    let { changes } = await prompt.get(
        {
            name: 'changes',
            allowEmpty: false,
            type: "string"
        }
    );

    const changelog = fs.readFileSync("./NPMREADME.md", "utf8");
    fs.writeFileSync("./NPMREADME.md", changelog.concat("\n", `(${version}) ${changes}`));
    fs.copyFileSync("./NPMREADME.md", "./dist/NPMREADME.md")

    fs.copyFileSync("./LICENSE", "./dist/LICENSE");

    fs.writeFileSync("./package.json", JSON.stringify(packageObj, null, 2));
    fs.writeFileSync("./dist/package.json", JSON.stringify(distPackageObj, null, 2));
}