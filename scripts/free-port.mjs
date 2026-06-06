// Libera un puerto matando el proceso que lo tenga en LISTENING (Windows).
// Uso: node scripts/free-port.mjs 3000
import { execSync } from "node:child_process";

const port = process.argv[2] ?? "3000";

try {
  const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    const m = line.match(/:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
    if (m && m[1] === port) pids.add(m[2]);
  }
  if (pids.size === 0) {
    console.log(`Puerto ${port} libre.`);
  } else {
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Liberado puerto ${port} (maté PID ${pid}).`);
      } catch {
        console.log(`No pude matar PID ${pid} (¿ya murió?).`);
      }
    }
  }
} catch {
  console.log(`free-port: nada que liberar en ${port}.`);
}
