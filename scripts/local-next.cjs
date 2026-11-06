const {spawn}=require("node:child_process");
const child=spawn(process.execPath,[require.resolve("next/dist/bin/next"),process.argv[2]||"dev","-H","0.0.0.0","-p",process.env.PORT||"6103"],{stdio:"inherit"});
child.on("exit",code=>process.exit(code??1));
