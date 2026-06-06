const entry = process.argv[2] ?? "apps/server/src/index.ts";
console.log(`Use your package manager to run TSX for ${entry}, for example: pnpm --filter @surviv/server dev`);
