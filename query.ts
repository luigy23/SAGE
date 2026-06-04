import { PrismaClient } from './src/generated/prisma/client/index.js';
const prisma = new PrismaClient();
async function main() {
  const docentes = await prisma.docente.findMany({
    select: {
      nombre: true,
      rol: true,
      tipoCargo: true,
      cargoAmbitoValor: true,
      modalidad: true,
      cargoAdministrativo: true,
      estadoCuenta: true
    }
  });
  console.log(docentes);
}
main().catch(console.error).finally(() => prisma.$disconnect());
