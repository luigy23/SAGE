-- CreateEnum
CREATE TYPE "AmbitoCargo" AS ENUM ('FACULTAD', 'PROGRAMA', 'SEDE', 'DEPARTAMENTO', 'DEPENDENCIA');

-- AlterTable
ALTER TABLE "docentes" ADD COLUMN     "cargoAmbitoTipo" "AmbitoCargo",
ADD COLUMN     "cargoAmbitoValor" TEXT;
