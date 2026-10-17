import esbuild from "esbuild";
try {
  await esbuild.build({
    entryPoints: ["src/main.js"], bundle: true, format: "iife", target: "es2020",
    write: false, logLevel: "silent", sourcemap: false,
  });
  console.log("CHECK OK");
} catch (e) {
  console.error((e.errors || []).map(x => `${x.location?.file}:${x.location?.line} ${x.text}`).join("\n") || e.message);
  process.exit(1);
}
