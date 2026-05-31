/*
  Warnings:

  - You are about to drop the column `subgrupo` on the `cursos_agenda` table. All the data in the column will be lost.
  - You are about to drop the column `subgrupo` on the `cursos_guardados` table. All the data in the column will be lost.
  - You are about to drop the `horarios_curso` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "horarios_curso" DROP CONSTRAINT "horarios_curso_cursoId_fkey";

-- AlterTable
ALTER TABLE "cursos_agenda" DROP COLUMN "subgrupo";

-- AlterTable
ALTER TABLE "cursos_guardados" DROP COLUMN "subgrupo";

-- DropTable
DROP TABLE "horarios_curso";
